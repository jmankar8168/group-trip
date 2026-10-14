require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');

const {
  initDB,
  saveSessionToDB,
  loadSessionsFromDB,
  saveLogToDB,
  getAllLogsFromDB,
  getContent
} = require('./lib/db.js');

const {
  CALENDAR_DAYS,
  ALL_WINDOWS,
  dealGoldenDates,
  doesPlayerAcceptWindow,
  findWindow,
  computeTripBudget,
  validatePlan,
  solveFullValidPlans,
  dealSolvableRound,
  scheduleRoundTwists,
  checkPlayerDateAvailability
} = require('./lib/solver.js');

const app = express();
// Enable reverse proxy trust (critical for Render, Railway, Fly.io, Heroku)
app.set('trust proxy', 1);

const server = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS !== '*'
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : '*';

const io = new Server(server, {
  cors: { origin: allowedOrigins }
});

const PORT = process.env.PORT || 3000;

// Rate limiting on API to protect against abuse
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

// Middleware
app.use(express.json());
app.use('/api/', apiLimiter);
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint for uptime monitors, Render/Railway wakeups, and keep-alive pings
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    activeSessions: classSessions.size,
    memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
  });
});

app.get('/styleguide', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'styleguide.html'));
});

// File paths for persistence fallback
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const CARDS_FILE = path.join(DATA_DIR, 'cards.json');
const TWISTS_FILE = path.join(DATA_DIR, 'twists.json');
const DEBRIEF_FILE = path.join(DATA_DIR, 'debrief.json');
const LOGS_FILE = path.join(DATA_DIR, 'game_logs.json');
const DESTINATIONS_FILE = path.join(DATA_DIR, 'destinations.json');
const ACTIVITIES_FILE = path.join(DATA_DIR, 'activities.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function readJSON(file, fallback = []) {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
      return fallback;
    }
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return fallback;
  }
}

function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
}

// REST Endpoints
app.get('/api/cards', (req, res) => res.json(readJSON(CARDS_FILE)));
app.get('/api/destinations', (req, res) => res.json(readJSON(DESTINATIONS_FILE)));
app.get('/api/activities', (req, res) => res.json(readJSON(ACTIVITIES_FILE)));
app.get('/api/twists', (req, res) => res.json(readJSON(TWISTS_FILE)));
app.get('/api/calendar', (req, res) => {
  res.json({ days: CALENDAR_DAYS, totalWindows: ALL_WINDOWS.length });
});

// Auto-generated fun group names
const FUN_GROUP_NAMES = [
  'Team Maggi', 'Team Chai', 'Team Samosa', 'Team Biryani',
  'Team Dosa', 'Team Vada Pav', 'Team Momos', 'Team Filter Coffee',
  'Team Lassi', 'Team Pav Bhaji', 'Team Pani Puri', 'Team Jalebi',
  'Team Rajma Chawal', 'Team Gulab Jamun', 'Team Kulfi', 'Team Idli',
  'Team Poha', 'Team Butter Chicken', 'Team Paratha', 'Team Rasgulla'
];

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// In-Memory Class Sessions Store
const classSessions = new Map();

// Helper to get sanitized session state for host
function getHostSessionState(session) {
  const groupsList = [];
  for (const group of session.groups.values()) {
    const members = [];
    for (const st of group.members.values()) {
      members.push({
        token: st.token,
        nickname: st.nickname,
        isReady: st.isReady,
        isBot: st.isBot
      });
    }
    groupsList.push({
      groupId: group.groupId,
      name: group.name,
      memberCount: members.length,
      members,
      isReady: members.length >= 4 && members.every(m => m.isReady),
      isExcluded: group.isExcluded,
      status: group.status,
      outcome: group.outcome,
      lockedTime: group.lockedTime,
      blockedAttemptsCount: group.blockedAttemptsCount
    });
  }

  const activeGroups = groupsList.filter(g => !g.isExcluded);
  const totalPlayers = activeGroups.reduce((acc, g) => acc + g.memberCount, 0);
  const readyGroups = activeGroups.filter(g => g.isReady).length;
  const submittedGroups = activeGroups.filter(g => g.status === 'locked').length;

  return {
    sessionCode: session.sessionCode,
    phase: session.phase,
    roundNumber: session.roundNumber,
    difficulty: session.difficulty,
    timerDuration: session.timerDuration,
    dateReasonSetting: session.dateReasonSetting,
    timer: session.timer,
    isPaused: session.isPaused,
    twistsTriggered: Array.from(session.twistsTriggered || []),
    totalGroups: activeGroups.length,
    totalPlayers,
    readyGroups,
    submittedGroups,
    groups: groupsList
  };
}

// Helper to compute Class Results Board data
function computeClassResults(session) {
  const activeGroups = Array.from(session.groups.values()).filter(g => !g.isExcluded);
  const totalGroups = activeGroups.length;
  const allStudents = Array.from(session.students.values()).filter(s => {
    const group = session.groups.get(s.groupId);
    return group && !group.isExcluded;
  });
  const totalPlayers = allStudents.length;

  const lockedGroups = activeGroups.filter(g => g.status === 'locked');
  const lockedCount = lockedGroups.length;
  const successRate = totalGroups > 0 ? Math.round((lockedCount / totalGroups) * 100) : 0;

  // Group Leaderboard
  const leaderboard = activeGroups.map(g => {
    let verdict = 'The process failed';
    let avgSat = 0;
    if (g.ratings && g.ratings.length > 0) {
      avgSat = Math.round((g.ratings.reduce((acc, r) => acc + (r.satisfaction || 0), 0) / g.ratings.length) * 10) / 10;
    }
    if (g.status === 'locked') {
      verdict = (avgSat >= 4.0 || g.ratings.length === 0) ? "Everyone's happy" : "Compromise nobody wanted";
    }

    return {
      groupId: g.groupId,
      name: g.name,
      outcome: g.status === 'locked' ? 'Trip locked' : (g.status === 'cancelled' ? 'Trip cancelled' : 'Blocked at the end'),
      timeTaken: g.lockedTime ? `${Math.floor(g.lockedTime / 60)}:${(g.lockedTime % 60).toString().padStart(2, '0')}` : 'Timeout',
      timeTakenSeconds: g.lockedTime || session.timerDuration,
      blockedAttempts: g.blockedAttemptsCount,
      avgSatisfaction: avgSat || (g.status === 'locked' ? 4.2 : 2.1),
      verdict,
      goldenWindows: g.goldenWindows || [],
      submittedPlan: g.submittedPlan
    };
  });

  // Sort by outcome (locked first) then timeTakenSeconds
  leaderboard.sort((a, b) => {
    if (a.outcome === 'Trip locked' && b.outcome !== 'Trip locked') return -1;
    if (a.outcome !== 'Trip locked' && b.outcome === 'Trip locked') return 1;
    return a.timeTakenSeconds - b.timeTakenSeconds;
  });

  // Category breakdown of blocked plans across all groups
  const categoryCounts = {
    'Dates': 0,
    'Budget': 0,
    'Transport': 0,
    'Activity': 0,
    'Health/Comfort': 0
  };

  const allPettyExcuses = [];
  activeGroups.forEach(g => {
    (g.blockedCategories || []).forEach(cat => {
      if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
      else if (cat.toLowerCase().includes('date')) categoryCounts['Dates']++;
      else if (cat.toLowerCase().includes('budget')) categoryCounts['Budget']++;
      else if (cat.toLowerCase().includes('transport')) categoryCounts['Transport']++;
      else if (cat.toLowerCase().includes('activity') || cat.toLowerCase().includes('vibe')) categoryCounts['Activity']++;
      else categoryCounts['Health/Comfort']++;
    });
    if (g.pettyExcusesBlocked) {
      allPettyExcuses.push(...g.pettyExcusesBlocked);
    }
  });

  let topPettyExcuse = "Refuses to wake up before 11am on vacation";
  if (allPettyExcuses.length > 0) {
    const counts = {};
    allPettyExcuses.forEach(e => counts[e] = (counts[e] || 0) + 1);
    topPettyExcuse = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  // The Human Side
  const ratedStudents = allStudents.filter(s => s.rating);
  const totalRated = ratedStudents.length;
  const feltHeardCount = ratedStudents.filter(s => s.rating.feltHeard === true || s.rating.feltHeard === 'yes').length;
  const feltHeardPercent = totalRated > 0 ? Math.round((feltHeardCount / totalRated) * 100) : 64;

  const roleSatMap = {};
  ratedStudents.forEach(s => {
    const roleName = s.roleCard?.name || 'Traveler';
    if (!roleSatMap[roleName]) roleSatMap[roleName] = { total: 0, count: 0 };
    roleSatMap[roleName].total += (s.rating.satisfaction || 3);
    roleSatMap[roleName].count++;
  });
  const roleSatisfaction = Object.keys(roleSatMap).map(role => ({
    role,
    avg: Math.round((roleSatMap[role].total / roleSatMap[role].count) * 10) / 10
  }));

  const twistStudents = ratedStudents.filter(s => s.assignedTwist);
  const sharedTwistCount = twistStudents.filter(s => s.rating.disclosedTwist === true || s.rating.disclosedTwist === 'yes').length;
  const twistSharedPercent = twistStudents.length > 0 ? Math.round((sharedTwistCount / twistStudents.length) * 100) : 78;

  const totalDateChecks = allStudents.reduce((acc, s) => acc + (s.checkedDates?.length || s.dateChecksCount || 0), 0);
  const avgDateChecks = totalPlayers > 0 ? Math.round((totalDateChecks / totalPlayers) * 10) / 10 : 3.8;

  let fastestGroup = leaderboard.find(g => g.outcome === 'Trip locked') || leaderboard[0] || { name: 'None', timeTaken: '--' };
  let mostBlockedGroup = [...leaderboard].sort((a, b) => b.blockedAttempts - a.blockedAttempts)[0] || { name: 'None', blockedAttempts: 0 };
  let closestGivingUp = [...leaderboard].filter(g => g.outcome === 'Trip locked').sort((a, b) => b.timeTakenSeconds - a.timeTakenSeconds)[0] || { name: 'None', timeTaken: '--' };

  return {
    totalGroups,
    totalPlayers,
    lockedCount,
    successRate,
    leaderboard,
    blockedCategories: categoryCounts,
    topPettyExcuse,
    humanSide: {
      feltHeardPercent,
      roleSatisfaction,
      twistSharedPercent,
      avgDateChecks
    },
    highlights: {
      fastestGroup: { name: fastestGroup.name, time: fastestGroup.timeTaken },
      mostBlockedGroup: { name: mostBlockedGroup.name, count: mostBlockedGroup.blockedAttempts },
      closestGivingUp: { name: closestGivingUp.name, time: closestGivingUp.timeTaken }
    },
    teacherNotes: session.teacherNotes || ''
  };
}

// Generate QR Data URL for a join code with absolute URL
async function getQRDataUrl(code, origin = '') {
  try {
    const base = origin || process.env.BASE_URL || '';
    const fullUrl = base ? `${base}/play.html?code=${encodeURIComponent(code)}` : `/play.html?code=${encodeURIComponent(code)}`;
    return await QRCode.toDataURL(fullUrl, { margin: 1, width: 240 });
  } catch (err) {
    return null;
  }
}

// REST Endpoints
app.get('/api/session/:sessionCode/qr', async (req, res) => {
  const code = (req.params.sessionCode || '').toUpperCase();
  const origin = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const dataUrl = await getQRDataUrl(code, origin);
  res.json({ dataUrl, joinUrl: `${origin}/play.html?code=${code}` });
});

app.get('/api/session/:sessionCode/export.csv', (req, res) => {
  const code = (req.params.sessionCode || '').toUpperCase();
  const session = classSessions.get(code);
  if (!session) return res.status(404).send('Session not found');

  const rows = [];
  rows.push([
    'SessionCode',
    'RoundNumber',
    'Difficulty',
    'TimerDuration',
    'DateReasonSetting',
    'GroupName',
    'Outcome',
    'TimeTakenSeconds',
    'BlockedAttemptsCount',
    'BlockedCategories',
    'GoldenWindowsCount',
    'GoldenWindowsList',
    'Destination',
    'TransportMode',
    'StartDate',
    'EndDate',
    'ComputedBudget',
    'StudentNickname',
    'StudentRole',
    'StudentSatisfaction',
    'StudentFeltHeard',
    'StudentConflictSource',
    'StudentDisclosedTwist',
    'StudentDateChecksCount'
  ].join(','));

  const activeGroups = Array.from(session.groups.values()).filter(g => !g.isExcluded);

  activeGroups.forEach(g => {
    const goldenStr = (g.goldenWindows || []).map(w => `${w.startDate}->${w.endDate}`).join(';');
    const blockedCats = (g.blockedCategories || []).join(';');
    const baseGroup = [
      `"${session.sessionCode}"`,
      session.roundNumber || 1,
      `"${session.difficulty}"`,
      session.timerDuration,
      `"${session.dateReasonSetting}"`,
      `"${g.name.replace(/"/g, '""')}"`,
      `"${g.status === 'locked' ? 'Trip locked' : (g.status === 'cancelled' ? 'Trip cancelled' : 'Blocked at the end')}"`,
      g.lockedTime || session.timerDuration,
      g.blockedAttemptsCount || 0,
      `"${blockedCats.replace(/"/g, '""')}"`,
      (g.goldenWindows || []).length,
      `"${goldenStr.replace(/"/g, '""')}"`,
      `"${(g.submittedPlan?.destination || '').replace(/"/g, '""')}"`,
      `"${(g.submittedPlan?.transportMode || '').replace(/"/g, '""')}"`,
      `"${(g.submittedPlan?.startDate || '').replace(/"/g, '""')}"`,
      `"${(g.submittedPlan?.endDate || '').replace(/"/g, '""')}"`,
      g.submittedPlan?.computedBudget || 0
    ];

    const members = Array.from(g.members.values());
    if (members.length === 0) {
      rows.push([...baseGroup, '""', '""', 0, '""', '""', '""', 0].join(','));
    } else {
      members.forEach(st => {
        const r = st.rating || {};
        rows.push([
          ...baseGroup,
          `"${(st.nickname || '').replace(/"/g, '""')}"`,
          `"${(st.roleCard?.name || '').replace(/"/g, '""')}"`,
          r.satisfaction || 0,
          `"${(r.conflictSource || '').replace(/"/g, '""')}"`,
          r.feltHeard ? 'Yes' : 'No',
          r.disclosedTwist ? 'Yes' : 'No',
          st.checkedDates?.length || st.dateChecksCount || 0
        ].join(','));
      });
    }
  });

  res.header('Content-Type', 'text/csv');
  res.attachment(`class_session_${code}_round_${session.roundNumber || 1}_${Date.now()}.csv`);
  res.send(rows.join('\n'));
});

// Save session results to game_logs in SQLite and JSON on round completion
async function persistSessionLog(session) {
  try {
    const results = computeClassResults(session);
    const logEntry = {
      sessionCode: session.sessionCode,
      roundNumber: session.roundNumber,
      timestamp: new Date().toISOString(),
      difficulty: session.difficulty,
      timerDuration: session.timerDuration,
      totalGroups: results.totalGroups,
      totalPlayers: results.totalPlayers,
      lockedCount: results.lockedCount,
      successRate: results.successRate,
      leaderboard: results.leaderboard,
      blockedCategories: results.blockedCategories,
      topPettyExcuse: results.topPettyExcuse,
      humanSide: results.humanSide,
      highlights: results.highlights
    };

    // Save to persistent SQLite
    await saveLogToDB(logEntry);

    // Also write JSON fallback
    const logs = readJSON(LOGS_FILE);
    logs.push(logEntry);
    writeJSON(LOGS_FILE, logs);
  } catch (err) {
    console.error('Failed to persist session log:', err);
  }
}

// WebSockets Game Manager for Classroom Session
io.on('connection', (socket) => {

  // ===================== HOST ACTIONS =====================

  // Host creates a session from setup
  socket.on('host_create_session', async ({ difficulty = 'medium', timerDuration = 180, dateReasonSetting = 'mandatory', origin }) => {
    let code = generateSessionCode();
    while (classSessions.has(code)) {
      code = generateSessionCode();
    }

    const baseOrigin = origin || process.env.BASE_URL || '';

    const session = {
      sessionCode: code,
      hostSocketId: socket.id,
      phase: 'lobby', // 'setup', 'lobby', 'round', 'results'
      roundNumber: 1,
      difficulty: difficulty || 'medium',
      timerDuration: parseInt(timerDuration, 10) || 180,
      dateReasonSetting: dateReasonSetting || 'mandatory',
      timer: parseInt(timerDuration, 10) || 180,
      timerInterval: null,
      isPaused: false,
      startTime: null,
      twistsTriggered: new Set(),
      groups: new Map(), // groupId -> Group
      students: new Map(), // token -> Student
      teacherNotes: '',
      responseTimeoutTimer: null,
      origin: baseOrigin
    };

    classSessions.set(code, session);
    socket.join(`session_${code}_host`);

    const qrDataUrl = await getQRDataUrl(code, baseOrigin);
    await saveSessionToDB(session);

    socket.emit('session_created', {
      sessionCode: code,
      qrDataUrl,
      joinUrl: baseOrigin ? `${baseOrigin}/play.html?code=${code}` : `/play.html?code=${code}`,
      state: getHostSessionState(session)
    });
  });

  // Host re-connects or joins as host
  socket.on('host_join_session', async ({ sessionCode, origin }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) {
      return socket.emit('error_message', 'Session not found. Please create a new session.');
    }

    session.hostSocketId = socket.id;
    if (origin && !session.origin) session.origin = origin;
    socket.join(`session_${code}_host`);

    const qrDataUrl = await getQRDataUrl(code, session.origin || origin || '');
    socket.emit('host_joined', {
      sessionCode: code,
      qrDataUrl,
      joinUrl: session.origin ? `${session.origin}/play.html?code=${code}` : `/play.html?code=${code}`,
      state: getHostSessionState(session),
      results: session.phase === 'results' ? computeClassResults(session) : null
    });
  });

  // Host updates settings in lobby
  socket.on('host_update_settings', async ({ sessionCode, difficulty, timerDuration, dateReasonSetting }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'lobby') return;

    if (difficulty) session.difficulty = difficulty;
    if (timerDuration) {
      session.timerDuration = parseInt(timerDuration, 10) || 180;
      session.timer = session.timerDuration;
    }
    if (dateReasonSetting) session.dateReasonSetting = dateReasonSetting;

    await saveSessionToDB(session);
    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
  });

  // Host excludes an unready or empty group
  socket.on('host_exclude_group', async ({ sessionCode, groupId }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'lobby') return;

    const group = session.groups.get(groupId);
    if (group) {
      group.isExcluded = !group.isExcluded;
      await saveSessionToDB(session);
      io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
    }
  });

  // Host adds bots for practice testing mode (inside setup screen)
  socket.on('host_add_bots', async ({ sessionCode, groupCount = 4 }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'lobby') return;

    const botNames = ['Aarav', 'Diya', 'Kabir', 'Rhea', 'Arjun', 'Isha', 'Zoya', 'Aditya', 'Tanvi', 'Dev', 'Mira', 'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Ananya'];

    for (let g = 0; g < groupCount; g++) {
      const gName = FUN_GROUP_NAMES[g % FUN_GROUP_NAMES.length];
      const groupId = `group_bot_${Date.now()}_${g}`;
      const group = {
        groupId,
        name: gName,
        createdTime: Date.now(),
        isExcluded: false,
        members: new Map(),
        status: 'waiting',
        outcome: 'None',
        submittedPlan: null,
        lockedTime: null,
        blockedAttemptsCount: 0,
        blockedCategories: [],
        pettyExcusesBlocked: [],
        goldenWindows: [],
        ratings: []
      };

      const membersCount = 4 + (g % 3); // 4, 5, or 6
      for (let m = 0; m < membersCount; m++) {
        const token = `bot_token_${groupId}_${m}`;
        const nick = `${botNames[(g * 4 + m) % botNames.length]} (Bot)`;
        const student = {
          token,
          socketId: null,
          nickname: nick,
          groupId,
          isReady: true,
          isBot: true,
          roleCard: null,
          dateRule: null,
          personalBudget: null,
          assignedTwist: null,
          checkedDates: [],
          dateChecksCount: Math.floor(Math.random() * 5) + 2,
          rating: null
        };
        session.students.set(token, student);
        group.members.set(token, student);
      }
      group.status = 'ready';
      session.groups.set(groupId, group);
    }

    await saveSessionToDB(session);
    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
  });

  // Host starts the round for all groups simultaneously
  socket.on('host_start_round', async ({ sessionCode }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'lobby') return;

    const activeGroups = Array.from(session.groups.values()).filter(g => !g.isExcluded);
    if (activeGroups.length === 0) {
      return socket.emit('error_message', 'No active groups to start the round.');
    }

    session.phase = 'round';
    session.startTime = Date.now();
    session.timer = session.timerDuration;
    session.isPaused = false;
    session.twistsTriggered.clear();

    const allCards = readJSON(CARDS_FILE);
    const allTwists = readJSON(TWISTS_FILE);
    const destinations = readJSON(DESTINATIONS_FILE);
    const activities = readJSON(ACTIVITIES_FILE);

    let targetGolden = 2;
    if (session.difficulty === 'easy') targetGolden = 4;
    else if (session.difficulty === 'hard') targetGolden = 1;
    else targetGolden = Math.random() > 0.5 ? 2 : 3;

    activeGroups.forEach(group => {
      group.status = 'playing';
      group.submittedPlan = null;
      group.lockedTime = null;
      group.blockedAttemptsCount = 0;
      group.blockedCategories = [];
      group.pettyExcusesBlocked = [];
      group.ratings = [];

      const memberList = Array.from(group.members.values());
      const roundDeal = dealSolvableRound(allCards, memberList.length, targetGolden, session.difficulty, destinations);

      group.goldenWindows = roundDeal.goldenSet;
      group.validPlansCount = roundDeal.totalValidPlans;

      memberList.forEach((st, idx) => {
        st.roleCard = roundDeal.dealtCards[idx];
        st.dateRule = roundDeal.playerRules[idx];
        st.checkedDates = [];
        st.rating = null;

        if (st.socketId) {
          io.to(st.socketId).emit('round_started', {
            groupName: group.name,
            roleCard: st.roleCard,
            dateRule: st.dateRule,
            destinations,
            activities,
            calendarDays: CALENDAR_DAYS,
            duration: session.timerDuration,
            dateReasonSetting: session.dateReasonSetting
          });
        }
      });

      group.twistsDealt = scheduleRoundTwists(group.goldenWindows, memberList, allTwists, destinations);
      group.activeTwists = [];
    });

    await saveSessionToDB(session);

    io.to(`session_${code}_host`).emit('host_round_started', {
      duration: session.timerDuration,
      totalGroups: activeGroups.length,
      submittedGroups: 0
    });

    if (session.timerInterval) clearInterval(session.timerInterval);

    const trigger1 = Math.round(session.timerDuration * 0.75);
    const trigger2 = Math.round(session.timerDuration * 0.50);
    const trigger3 = Math.round(session.timerDuration * 0.25);

    session.timerInterval = setInterval(() => {
      if (session.isPaused) return;

      session.timer--;

      io.to(`session_${code}_host`).emit('timer_tick', { remainingSeconds: session.timer });
      activeGroups.forEach(g => {
        io.to(`session_${code}_group_${g.groupId}`).emit('timer_tick', { remainingSeconds: session.timer });
      });

      if (session.timer === trigger1 && !session.twistsTriggered.has(1)) {
        session.twistsTriggered.add(1);
        fireClassTwist(session, 1);
      }

      if (session.timer === trigger2 && !session.twistsTriggered.has(2)) {
        session.twistsTriggered.add(2);
        fireClassTwist(session, 2);
      }

      if (session.timer === trigger3 && !session.twistsTriggered.has(3)) {
        session.twistsTriggered.add(3);
        fireClassTwist(session, 3);
      }

      if (session.timer <= 0) {
        clearInterval(session.timerInterval);
        endRoundForSession(session);
      }
    }, 1000);
  });

  // Host pauses or resumes round
  socket.on('host_pause_round', ({ sessionCode }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'round') return;

    session.isPaused = !session.isPaused;
    io.to(`session_${code}_host`).emit('round_paused_state', { isPaused: session.isPaused });
    io.to(`session_${code}`).emit('round_paused_state', { isPaused: session.isPaused });
  });

  // Host adds 30 seconds
  socket.on('host_add_time', ({ sessionCode, seconds = 30 }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'round') return;

    session.timer += seconds;
    io.to(`session_${code}_host`).emit('timer_tick', { remainingSeconds: session.timer });
    io.to(`session_${code}`).emit('timer_tick', { remainingSeconds: session.timer });
  });

  // Host ends round early
  socket.on('host_end_round_early', ({ sessionCode }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'round') return;

    if (session.timerInterval) clearInterval(session.timerInterval);
    endRoundForSession(session);
  });

  // Host reveals results right now (skipping remaining 40s collect window)
  socket.on('host_show_results_now', ({ sessionCode }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return;

    if (session.responseTimeoutTimer) clearTimeout(session.responseTimeoutTimer);
    session.phase = 'results';
    const results = computeClassResults(session);
    persistSessionLog(session);
    saveSessionToDB(session);
    io.to(`session_${code}_host`).emit('class_results_ready', results);
  });

  // Host starts a new round with the same groups
  socket.on('host_start_new_round', async ({ sessionCode }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return;

    if (session.timerInterval) clearInterval(session.timerInterval);
    if (session.responseTimeoutTimer) clearTimeout(session.responseTimeoutTimer);

    session.phase = 'lobby';
    session.roundNumber = (session.roundNumber || 1) + 1;
    session.timer = session.timerDuration;
    session.isPaused = false;
    session.twistsTriggered.clear();

    for (const group of session.groups.values()) {
      group.status = 'waiting';
      group.submittedPlan = null;
      group.lockedTime = null;
      group.blockedAttemptsCount = 0;
      group.blockedCategories = [];
      group.pettyExcusesBlocked = [];
      group.goldenWindows = [];
      group.ratings = [];

      for (const st of group.members.values()) {
        st.isReady = st.isBot ? true : false;
        st.roleCard = null;
        st.dateRule = null;
        st.checkedDates = [];
        st.rating = null;
      }
      if (group.members.size >= 4 && Array.from(group.members.values()).every(m => m.isReady)) {
        group.status = 'ready';
      }
    }

    await saveSessionToDB(session);

    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
    for (const st of session.students.values()) {
      if (st.socketId) {
        const group = session.groups.get(st.groupId);
        io.to(st.socketId).emit('round_reset_to_lobby', {
          sessionCode: code,
          roundNumber: session.roundNumber,
          group: group ? {
            groupId: group.groupId,
            name: group.name,
            members: Array.from(group.members.values()).map(m => ({
              nickname: m.nickname,
              isReady: m.isReady
            }))
          } : null
        });
      }
    }
  });

  // Host updates custom teacher debrief notes
  socket.on('host_update_notes', async ({ sessionCode, notes }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return;
    session.teacherNotes = notes;
    await saveSessionToDB(session);
  });


  // ===================== STUDENT ACTIONS =====================

  // Student enters session code & nickname
  socket.on('student_join_session', async ({ sessionCode, nickname, sessionToken }) => {
    if (!sessionCode) return socket.emit('error_message', 'Session code is required.');
    const code = sessionCode.toUpperCase().trim();
    const session = classSessions.get(code);

    if (!session) {
      return socket.emit('error_message', 'Session not found. Please verify the code.');
    }

    const token = sessionToken || `sst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Reconnection check
    if (session.students.has(token)) {
      const existing = session.students.get(token);
      existing.socketId = socket.id;
      if (nickname) existing.nickname = nickname.trim();

      socket.join(`session_${code}`);
      if (existing.groupId) {
        socket.join(`session_${code}_group_${existing.groupId}`);
      }

      await saveSessionToDB(session);
      return restoreStudentState(socket, session, existing);
    }

    // Late joiner check
    if (session.phase === 'round' || session.phase === 'results') {
      return socket.emit('round_in_progress', {
        message: 'A round is currently in progress. Please wait for the next round!'
      });
    }

    const cleanNick = (nickname || 'Student').trim();
    const student = {
      token,
      socketId: socket.id,
      nickname: cleanNick,
      groupId: null,
      isReady: false,
      isBot: false,
      roleCard: null,
      dateRule: null,
      personalBudget: null,
      assignedTwist: null,
      checkedDates: [],
      dateChecksCount: 0,
      rating: null
    };

    session.students.set(token, student);
    socket.join(`session_${code}`);

    const openGroups = Array.from(session.groups.values())
      .filter(g => !g.isExcluded)
      .map(g => ({
        groupId: g.groupId,
        name: g.name,
        memberCount: g.members.size,
        isFull: g.members.size >= 6
      }));

    const suggestedName = FUN_GROUP_NAMES[Math.floor(Math.random() * FUN_GROUP_NAMES.length)];

    await saveSessionToDB(session);

    socket.emit('student_joined_session', {
      sessionCode: code,
      sessionToken: token,
      nickname: cleanNick,
      openGroups,
      suggestedName
    });

    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
  });

  // Reconnect with existing token
  socket.on('student_reconnect', ({ sessionCode, sessionToken }) => {
    if (!sessionCode || !sessionToken) return;
    const code = sessionCode.toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return socket.emit('session_expired');

    const student = session.students.get(sessionToken);
    if (!student) return socket.emit('session_expired');

    student.socketId = socket.id;
    socket.join(`session_${code}`);
    if (student.groupId) {
      socket.join(`session_${code}_group_${student.groupId}`);
    }

    restoreStudentState(socket, session, student);
  });

  // Student creates a new group
  socket.on('student_create_group', async ({ sessionCode, groupName, sessionToken }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return;
    if (session.phase !== 'lobby') {
      return socket.emit('error_message', 'Cannot create group once round has started.');
    }

    const student = session.students.get(sessionToken);
    if (!student) return;

    const gName = (groupName || '').trim() || FUN_GROUP_NAMES[Math.floor(Math.random() * FUN_GROUP_NAMES.length)];
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    if (student.groupId && session.groups.has(student.groupId)) {
      session.groups.get(student.groupId).members.delete(sessionToken);
    }

    const group = {
      groupId,
      name: gName,
      createdTime: Date.now(),
      isExcluded: false,
      members: new Map(),
      status: 'waiting',
      outcome: 'None',
      submittedPlan: null,
      lockedTime: null,
      blockedAttemptsCount: 0,
      blockedCategories: [],
      pettyExcusesBlocked: [],
      goldenWindows: [],
      ratings: []
    };

    student.groupId = groupId;
    student.isReady = false;
    group.members.set(sessionToken, student);
    session.groups.set(groupId, group);

    socket.join(`session_${code}_group_${groupId}`);

    await saveSessionToDB(session);

    broadcastGroupState(session, group);
    broadcastOpenGroups(session);
    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
  });

  // Student joins an existing open group
  socket.on('student_join_group', async ({ sessionCode, groupId, sessionToken }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return;
    if (session.phase !== 'lobby') {
      return socket.emit('error_message', 'Cannot join group once round has started.');
    }

    const student = session.students.get(sessionToken);
    const group = session.groups.get(groupId);
    if (!student || !group) return;

    if (group.members.size >= 6) {
      return socket.emit('error_message', 'This group is already full (max 6 members)!');
    }

    if (student.groupId && session.groups.has(student.groupId)) {
      const oldGroup = session.groups.get(student.groupId);
      oldGroup.members.delete(sessionToken);
      socket.leave(`session_${code}_group_${student.groupId}`);
      broadcastGroupState(session, oldGroup);
    }

    student.groupId = groupId;
    student.isReady = false;
    group.members.set(sessionToken, student);

    socket.join(`session_${code}_group_${groupId}`);

    await saveSessionToDB(session);

    broadcastGroupState(session, group);
    broadcastOpenGroups(session);
    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
  });

  // Student leaves their current group
  socket.on('student_leave_group', async ({ sessionCode, sessionToken }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'lobby') return;

    const student = session.students.get(sessionToken);
    if (!student || !student.groupId) return;

    const group = session.groups.get(student.groupId);
    if (group) {
      group.members.delete(sessionToken);
      socket.leave(`session_${code}_group_${student.groupId}`);
      broadcastGroupState(session, group);
    }

    student.groupId = null;
    student.isReady = false;

    await saveSessionToDB(session);

    broadcastOpenGroups(session);
    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));

    const openGroups = Array.from(session.groups.values())
      .filter(g => !g.isExcluded)
      .map(g => ({
        groupId: g.groupId,
        name: g.name,
        memberCount: g.members.size,
        isFull: g.members.size >= 6
      }));

    socket.emit('student_left_group', { openGroups });
  });

  // Student toggles their ready status
  socket.on('student_toggle_ready', async ({ sessionCode, sessionToken }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'lobby') return;

    const student = session.students.get(sessionToken);
    if (!student || !student.groupId) return;

    const group = session.groups.get(student.groupId);
    if (!group) return;

    student.isReady = !student.isReady;

    const members = Array.from(group.members.values());
    if (members.length >= 4 && members.every(m => m.isReady)) {
      group.status = 'ready';
    } else {
      group.status = 'waiting';
    }

    await saveSessionToDB(session);

    broadcastGroupState(session, group);
    io.to(`session_${code}_host`).emit('host_state_updated', getHostSessionState(session));
  });

  // Private Calendar Date Check for a player
  socket.on('check_player_date', ({ sessionCode, sessionToken, dayIndex, dateString }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'round') return;

    const student = session.students.get(sessionToken);
    if (!student || !student.dateRule) return;

    const group = session.groups.get(student.groupId);
    const activeTwists = group ? group.activeTwists : [];

    const playerObj = {
      role: student.roleCard,
      dateRule: student.dateRule,
      socketId: student.socketId || student.token
    };

    const dayNum = (dayIndex !== undefined && dayIndex !== null) ? (dayIndex + 1) : 1;
    const result = checkPlayerDateAvailability(dayNum, playerObj, activeTwists, session.dateReasonSetting);

    if (!student.checkedDates) student.checkedDates = [];
    if (!student.checkedDates.includes(dayIndex)) {
      student.checkedDates.push(dayIndex);
    }
    student.dateChecksCount = student.checkedDates.length;

    const reasonText = (result.reasons && result.reasons[0]) ? (result.reasons[0].line || result.reasons[0].shortLine) : '';

    // Emit strictly to requesting player ONLY!
    socket.emit('player_date_checked', {
      dayIndex,
      dateString,
      isAvailable: result.works,
      reason: session.dateReasonSetting === 'hidden' ? '' : reasonText,
      checkedDates: student.checkedDates
    });
  });

  // Submit Group Plan for validation
  socket.on('submit_group_plan', async ({ sessionCode, sessionToken, plan }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session || session.phase !== 'round') return;

    const student = session.students.get(sessionToken);
    if (!student || !student.groupId) return;

    const group = session.groups.get(student.groupId);
    if (!group || group.status === 'locked') return;

    const destinations = readJSON(DESTINATIONS_FILE);
    const memberList = Array.from(group.members.values()).map(st => ({
      socketId: st.socketId || st.token,
      nickname: st.nickname,
      role: st.roleCard,
      dateRule: st.dateRule
    }));

    // Machine validator
    const validation = validatePlan(
      plan,
      memberList,
      group.activeTwists || [],
      destinations
    );

    if (!validation.valid) {
      group.blockedAttemptsCount++;
      const firstViolation = (validation.violations && validation.violations[0]) ? validation.violations[0] : { category: 'Dates', message: 'Plan conflicts with a teammate\'s constraints.' };
      const cat = firstViolation.category || 'General';
      group.blockedCategories.push(cat);
      group.pettyExcusesBlocked.push(firstViolation.message);

      await saveSessionToDB(session);

      io.to(`session_${code}_group_${group.groupId}`).emit('group_plan_blocked', {
        proposerNick: student.nickname,
        blockedByNickname: 'A teammate',
        reason: firstViolation.message,
        reasonCategory: cat,
        pettyExcuse: firstViolation.message,
        blockedAttemptsCount: group.blockedAttemptsCount
      });
      return;
    }

    // Plan is VALID! Lock the group!
    group.status = 'locked';
    group.outcome = 'Trip locked';
    group.submittedPlan = {
      ...plan,
      computedBudget: validation.computedBudget
    };
    group.lockedTime = session.timerDuration - session.timer;

    await saveSessionToDB(session);

    io.to(`session_${code}_group_${group.groupId}`).emit('group_plan_locked', {
      proposerNick: student.nickname,
      submittedPlan: group.submittedPlan,
      lockedTime: group.lockedTime
    });

    const activeGroups = Array.from(session.groups.values()).filter(g => !g.isExcluded);
    const submittedCount = activeGroups.filter(g => g.status === 'locked').length;
    io.to(`session_${code}_host`).emit('host_plan_progress', {
      submittedGroups: submittedCount,
      totalGroups: activeGroups.length
    });
  });

  // Student submits post-round survey
  socket.on('submit_student_rating', async ({ sessionCode, sessionToken, satisfaction, feltHeard, conflictSource, disclosedTwist }) => {
    const code = (sessionCode || '').toUpperCase().trim();
    const session = classSessions.get(code);
    if (!session) return;

    const student = session.students.get(sessionToken);
    if (!student) return;

    student.rating = {
      satisfaction: parseInt(satisfaction, 10) || 4,
      feltHeard: feltHeard === true || feltHeard === 'yes',
      conflictSource: conflictSource || 'Dates',
      disclosedTwist: disclosedTwist === true || disclosedTwist === 'yes'
    };

    const group = session.groups.get(student.groupId);
    if (group) {
      if (!group.ratings) group.ratings = [];
      group.ratings.push(student.rating);
    }

    await saveSessionToDB(session);

    socket.emit('rating_submitted_ack');

    const allStudents = Array.from(session.students.values()).filter(s => {
      const g = session.groups.get(s.groupId);
      return g && !g.isExcluded;
    });
    const ratedCount = allStudents.filter(s => s.rating !== null).length;

    io.to(`session_${code}_host`).emit('responses_collected_update', {
      collected: ratedCount,
      total: allStudents.length
    });

    if (session.phase === 'results') {
      const liveResults = computeClassResults(session);
      io.to(`session_${code}_host`).emit('class_results_update', liveResults);
    }
  });

  socket.on('disconnect', () => {
    // Session state preserved in SQLite & tokens
  });
});

// Helper: Fire class twist at milestone
function fireClassTwist(session, twistIndex) {
  const code = session.sessionCode;
  const activeGroups = Array.from(session.groups.values()).filter(g => !g.isExcluded);

  activeGroups.forEach(group => {
    const twist = group.twistsDealt ? group.twistsDealt[twistIndex - 1] : null;
    if (twist) {
      group.activeTwists.push(twist);

      if (twist.targetPlayerSocketId) {
        const targetStudent = Array.from(group.members.values()).find(s => s.socketId === twist.targetPlayerSocketId || s.token === twist.targetPlayerSocketId);
        if (targetStudent) targetStudent.assignedTwist = twist;
      }

      io.to(`session_${code}_group_${group.groupId}`).emit('twist_fired', {
        twistIndex,
        twist
      });
    }
  });

  io.to(`session_${code}_host`).emit('twist_milestone_fired', {
    twistIndex
  });
}

// Helper: End round for session
function endRoundForSession(session) {
  const code = session.sessionCode;
  session.phase = 'collecting_responses';

  const activeGroups = Array.from(session.groups.values()).filter(g => !g.isExcluded);
  activeGroups.forEach(g => {
    if (g.status === 'playing') {
      g.status = 'timeout';
      g.outcome = g.blockedAttemptsCount > 0 ? 'Blocked at the end' : 'Trip cancelled';
    }
  });

  io.to(`session_${code}`).emit('round_ended_times_up');

  const allStudents = Array.from(session.students.values()).filter(s => {
    const g = session.groups.get(s.groupId);
    return g && !g.isExcluded;
  });
  const ratedCount = allStudents.filter(s => s.rating !== null).length;

  io.to(`session_${code}_host`).emit('round_ended_collecting', {
    collected: ratedCount,
    total: allStudents.length,
    timeoutSeconds: 40
  });

  saveSessionToDB(session);

  session.responseTimeoutTimer = setTimeout(async () => {
    session.phase = 'results';
    const results = computeClassResults(session);
    await persistSessionLog(session);
    await saveSessionToDB(session);
    io.to(`session_${code}_host`).emit('class_results_ready', results);
  }, 40000);
}

// Helper: Restore student state on reconnect
function restoreStudentState(socket, session, student) {
  const group = session.groups.get(student.groupId);

  const groupInfo = group ? {
    groupId: group.groupId,
    name: group.name,
    memberCount: group.members.size,
    isReady: student.isReady,
    status: group.status,
    members: Array.from(group.members.values()).map(m => ({
      nickname: m.nickname,
      isReady: m.isReady
    }))
  } : null;

  socket.emit('student_restored', {
    sessionCode: session.sessionCode,
    sessionToken: student.token,
    nickname: student.nickname,
    phase: session.phase,
    roundNumber: session.roundNumber,
    group: groupInfo,
    roleCard: student.roleCard,
    dateRule: student.dateRule,
    checkedDates: student.checkedDates || [],
    duration: session.timerDuration,
    timer: session.timer,
    dateReasonSetting: session.dateReasonSetting,
    activeTwists: group ? group.activeTwists : [],
    hasRated: student.rating !== null,
    submittedPlan: group ? group.submittedPlan : null
  });
}

// Helper: Broadcast group state
function broadcastGroupState(session, group) {
  const members = Array.from(group.members.values()).map(m => ({
    nickname: m.nickname,
    isReady: m.isReady
  }));

  const isReady = members.length >= 4 && members.every(m => m.isReady);

  io.to(`session_${session.sessionCode}_group_${group.groupId}`).emit('group_updated', {
    groupId: group.groupId,
    name: group.name,
    memberCount: members.length,
    members,
    isReady
  });
}

// Helper: Broadcast open groups to students looking for a group
function broadcastOpenGroups(session) {
  const openGroups = Array.from(session.groups.values())
    .filter(g => !g.isExcluded)
    .map(g => ({
      groupId: g.groupId,
      name: g.name,
      memberCount: g.members.size,
      isFull: g.members.size >= 6
    }));

  io.to(`session_${session.sessionCode}`).emit('open_groups_updated', { openGroups });
}

// Clean up abandoned sessions periodically (every 1 hour)
setInterval(() => {
  const ttlMs = (parseInt(process.env.SESSION_TTL_HOURS, 10) || 6) * 60 * 60 * 1000;
  const now = Date.now();
  for (const [code, session] of classSessions.entries()) {
    if (session.startTime && (now - session.startTime > ttlMs) && session.phase === 'results') {
      console.log(`Cleaning up old session ${code}`);
      classSessions.delete(code);
    }
  }
}, 3600000);

// Initialize SQLite database and restore active sessions on server boot
(async () => {
  try {
    await initDB();
    const restored = await loadSessionsFromDB();
    for (const [code, s] of restored.entries()) {
      classSessions.set(code, s);
    }
    console.log(`Persistent SQLite initialized. Restored ${classSessions.size} active sessions.`);
  } catch (err) {
    console.error('Failed to initialize database on startup:', err);
  }

  server.listen(PORT, () => {
    console.log(`Plan a Trip in 2 Minutes server running on http://localhost:${PORT}`);
  });
})();
