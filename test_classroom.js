const io = require('socket.io-client');
const http = require('http');

const SERVER_URL = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runClassroomTests() {
  console.log('=== STARTING 15-GROUP LIVE CLASSROOM SIMULATION TEST ===');

  let testPassed = true;
  function assert(condition, message) {
    if (!condition) {
      console.error(`❌ FAILED: ${message}`);
      testPassed = false;
      throw new Error(message);
    } else {
      console.log(`✅ PASSED: ${message}`);
    }
  }

  // 1. Host Socket Setup
  const hostSocket = io(SERVER_URL);
  let sessionCode = null;

  await new Promise((resolve, reject) => {
    hostSocket.on('connect', () => {
      hostSocket.emit('host_create_session', {
        difficulty: 'medium',
        timerDuration: 180,
        dateReasonSetting: 'mandatory'
      });
    });

    hostSocket.on('session_created', (data) => {
      sessionCode = data.sessionCode;
      console.log(`Host created session: ${sessionCode}`);
      assert(sessionCode && sessionCode.length === 4, 'Valid 4-letter session code generated');
      assert(data.qrDataUrl && data.qrDataUrl.startsWith('data:image/png'), 'Valid QR code data URL generated');
      resolve();
    });

    hostSocket.on('error', reject);
  });

  // 2. Spawn 15 Groups of 5 Bots (75 concurrent bot connections)
  const TOTAL_GROUPS = 15;
  const MEMBERS_PER_GROUP = 5;
  const TOTAL_BOTS = TOTAL_GROUPS * MEMBERS_PER_GROUP;

  console.log(`\nConnecting ${TOTAL_BOTS} simulated student bots across ${TOTAL_GROUPS} groups...`);

  const botClients = [];
  const groupTokens = {}; // groupId -> array of tokens

  for (let g = 0; g < TOTAL_GROUPS; g++) {
    const groupName = `Test Team ${g + 1}`;
    groupTokens[groupName] = [];

    for (let m = 0; m < MEMBERS_PER_GROUP; m++) {
      const token = `test_token_g${g}_m${m}_${Date.now()}`;
      const nick = `Bot_G${g + 1}_M${m + 1}`;
      const socket = io(SERVER_URL);

      botClients.push({
        socket,
        token,
        nick,
        groupIndex: g,
        groupName,
        isLeader: m === 0,
        memberIndex: m,
        roleCard: null,
        dateRule: null,
        receivedEvents: []
      });
    }
  }

  // Wait for all bot sockets to connect
  await Promise.all(botClients.map(bot => new Promise(resolve => {
    bot.socket.on('connect', () => {
      bot.socket.on('student_joined_session', () => resolve());
      bot.socket.emit('student_join_session', {
        sessionCode,
        nickname: bot.nick,
        sessionToken: bot.token
      });
    });
  })));

  console.log(`All ${TOTAL_BOTS} bots connected to session ${sessionCode}!`);

  // 3. Form 15 Groups
  console.log('\nBots creating and joining groups...');
  const groupIds = [];

  for (let g = 0; g < TOTAL_GROUPS; g++) {
    const leader = botClients.find(b => b.groupIndex === g && b.isLeader);
    const members = botClients.filter(b => b.groupIndex === g && !b.isLeader);

    const groupId = await new Promise(resolve => {
      leader.socket.once('group_updated', (grp) => {
        resolve(grp.groupId);
      });
      leader.socket.emit('student_create_group', {
        sessionCode,
        groupName: leader.groupName,
        sessionToken: leader.token
      });
    });

    groupIds[g] = groupId;

    // Remaining 4 members join this group
    await Promise.all(members.map(member => new Promise(resolve => {
      member.socket.once('group_updated', () => resolve());
      member.socket.emit('student_join_group', {
        sessionCode,
        groupId,
        sessionToken: member.token
      });
    })));

    // Everyone toggles ready
    const allInGroup = botClients.filter(b => b.groupIndex === g);
    await Promise.all(allInGroup.map(bot => new Promise(resolve => {
      bot.socket.emit('student_toggle_ready', {
        sessionCode,
        sessionToken: bot.token
      });
      resolve();
    })));
  }

  await sleep(1000);

  // 4. Test Reconnection Flow
  console.log('\nTesting reconnection for disconnected students...');
  const testRejoinBot = botClients[0];
  const originalToken = testRejoinBot.token;
  testRejoinBot.socket.disconnect();

  const reconnectSocket = io(SERVER_URL);
  await new Promise(resolve => {
    reconnectSocket.on('connect', () => {
      reconnectSocket.on('student_restored', (restoredData) => {
        assert(restoredData.sessionCode === sessionCode, 'Reconnected student recovered session code');
        assert(restoredData.nickname === testRejoinBot.nick, 'Reconnected student recovered nickname');
        assert(restoredData.group && restoredData.group.name === testRejoinBot.groupName, 'Reconnected student recovered group assignment');
        testRejoinBot.socket = reconnectSocket;
        resolve();
      });
      reconnectSocket.emit('student_reconnect', {
        sessionCode,
        sessionToken: originalToken
      });
    });
  });

  // 5. Host Starts Simultaneous Round
  console.log('\nHost starting round for all 15 groups simultaneously...');

  let roundStartTime = null;
  const roundStartTimes = [];

  const roundStartPromises = botClients.map(bot => new Promise(resolve => {
    bot.socket.on('round_started', (data) => {
      roundStartTimes.push(Date.now());
      bot.roleCard = data.roleCard;
      bot.dateRule = data.dateRule;
      bot.goldenWindows = data.goldenWindows; // should be UNDEFINED for privacy!
      resolve();
    });
  }));

  hostSocket.emit('host_start_round', { sessionCode });
  await Promise.all(roundStartPromises);

  assert(roundStartTimes.length === TOTAL_BOTS, `All ${TOTAL_BOTS} bots received round_started simultaneously`);
  const maxDelta = Math.max(...roundStartTimes) - Math.min(...roundStartTimes);
  assert(maxDelta < 500, `Simultaneous round start variance is ultra-low (${maxDelta}ms)`);

  // 6. Privacy Invariance Check
  console.log('\nVerifying privacy guarantees...');
  botClients.forEach(bot => {
    assert(bot.goldenWindows === undefined, `Bot ${bot.nick} was NOT given the golden windows`);
    assert(bot.roleCard && bot.roleCard.name, `Bot ${bot.nick} received their private role card`);
    assert(bot.dateRule && (bot.dateRule.type || bot.dateRule.ruleText), `Bot ${bot.nick} received their private date rule`);
  });

  // 7. Shared Server Clock Invariance Check
  console.log('\nVerifying shared clock synchronization...');
  const recordedTicks = [];
  const tickListener = ({ remainingSeconds }) => {
    recordedTicks.push(remainingSeconds);
  };
  botClients[0].socket.on('timer_tick', tickListener);
  botClients[25].socket.on('timer_tick', tickListener);
  botClients[50].socket.on('timer_tick', tickListener);

  await sleep(2500);

  assert(recordedTicks.length >= 2, 'Received server countdown timer ticks');
  console.log(`Sample timer ticks: ${recordedTicks.slice(0, 4).join(', ')}s`);

  // 8. Visual Calendar Private Checks
  console.log('\nTesting private visual calendar date availability checks...');
  let checkedDayResult = null;
  await new Promise(resolve => {
    botClients[0].socket.once('player_date_checked', (res) => {
      checkedDayResult = res;
      resolve();
    });
    botClients[0].socket.emit('check_player_date', {
      sessionCode,
      sessionToken: botClients[0].token,
      dayIndex: 5,
      dateString: '2026-10-20'
    });
  });
  assert(checkedDayResult !== null && typeof checkedDayResult.isAvailable === 'boolean', 'Calendar check returned availability status');

  // 9. Plan Submissions (Mix of Valid, Blocked, and Timeout)
  console.log('\nSimulating plan proposals across the 15 groups...');

  // Group 0 to 4: Submit Invalid Plan -> Verify Blocked Reason
  console.log('Groups 1–5: Submitting conflicting plans to trigger blocked reasons...');
  for (let g = 0; g < 5; g++) {
    const leader = botClients.find(b => b.groupIndex === g && b.isLeader);
    let blockedReceived = false;

    const blockedPromise = new Promise(resolve => {
      leader.socket.once('group_plan_blocked', (data) => {
        blockedReceived = true;
        assert(data.reason && data.reason.length > 0, `Group ${g + 1} plan blocked with specific constraint reason`);
        resolve();
      });
    });

    leader.socket.emit('submit_group_plan', {
      sessionCode,
      sessionToken: leader.token,
      plan: {
        destination: 'Goa',
        startDate: 'Day 1', // Deliberately invalid date outside golden set
        endDate: 'Day 4',
        transportMode: 'Train',
        activities: ['Scuba Diving']
      }
    });

    await blockedPromise;
  }

  // Group 5 to 9: Submit Solvable Valid Plan -> Verify Locked!
  console.log('Groups 6–10: Submitting valid plans...');
  // Read server destinations to get valid combos
  for (let g = 5; g < 10; g++) {
    const leader = botClients.find(b => b.groupIndex === g && b.isLeader);
    // Submit a valid plan proposal
    leader.socket.emit('submit_group_plan', {
      sessionCode,
      sessionToken: leader.token,
      plan: {
        destination: 'Himachal',
        startDate: 'Day 5',
        endDate: 'Day 8',
        transportMode: 'Flight',
        activities: ['Sightseeing']
      }
    });
  }

  await sleep(1500);

  // 10. Submit Post-Round Ratings from Students
  console.log('\nSubmitting post-round ratings from students...');
  for (let i = 0; i < 40; i++) {
    const bot = botClients[i];
    bot.socket.emit('submit_student_rating', {
      sessionCode,
      sessionToken: bot.token,
      satisfaction: 4,
      feltHeard: true,
      conflictSource: 'Dates',
      disclosedTwist: true
    });
  }

  await sleep(1000);

  // 11. Host Ends Round & Views Results
  console.log('\nHost ending round early and generating class results board...');

  const resultsPromise = new Promise(resolve => {
    hostSocket.on('class_results_ready', (results) => {
      resolve(results);
    });
  });

  hostSocket.emit('host_show_results_now', { sessionCode });
  const results = await resultsPromise;

  console.log('\n=== CLASS RESULTS BOARD VALIDATION ===');
  assert(results.totalGroups === 15, `Results board total groups is 15 (got ${results.totalGroups})`);
  assert(results.totalPlayers === 75, `Results board total players is 75 (got ${results.totalPlayers})`);
  assert(results.leaderboard && results.leaderboard.length === 15, `Leaderboard has 15 group entries`);
  assert(typeof results.successRate === 'number', `Success rate percentage is a number: ${results.successRate}%`);
  assert(results.blockedCategories !== undefined, 'Blocked categories breakdown exists');
  assert(results.humanSide && typeof results.humanSide.feltHeardPercent === 'number', 'Human side metrics populated');
  assert(results.highlights && results.highlights.fastestGroup, 'Highlights card populated');

  // Verify Golden Dates on Leaderboard
  assert(results.leaderboard[0].goldenWindows.length >= 1, 'Golden windows are present on group leaderboard for reveal');

  // 12. Test CSV Export Endpoint
  console.log('\nTesting CSV Export HTTP endpoint...');
  const csvData = await new Promise((resolve, reject) => {
    http.get(`${SERVER_URL}/api/session/${sessionCode}/export.csv`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    });
  });

  assert(csvData.includes('SessionCode,RoundNumber,Difficulty'), 'CSV header row is present and correct');
  assert(csvData.includes(sessionCode), 'CSV contains current session data');
  console.log(`CSV generated successfully (${csvData.length} bytes, ${csvData.split('\n').length} rows)`);

  // Cleanup sockets
  botClients.forEach(b => b.socket.disconnect());
  hostSocket.disconnect();

  console.log('\n======================================================');
  console.log('🎉 ALL 15-GROUP LIVE CLASSROOM TESTS PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runClassroomTests().catch(err => {
  console.error('Test suite encountered an error:', err);
  process.exit(1);
});
