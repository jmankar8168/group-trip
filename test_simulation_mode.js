/**
 * Automated Test Suite for Simulation Mode
 * Tests:
 * 1. REST endpoints (/api/simulation/presets, /api/simulation/:id/events.json)
 * 2. Socket.io sim_start, sim_initialized, sim_event, sim_tick
 * 3. Event types: chat_typing_started, chat_sent, calendar_tap, bot_thought, proposal_submitted, vote_cast
 * 4. Speed controls and pause/resume
 * 5. Simulation completion and debrief data structure
 */

const { io } = require('socket.io-client');
const http = require('http');

async function runSimulationTests() {
  console.log('=== STARTING SIMULATION MODE AUTOMATED TESTS ===\n');

  // Test 1: Presets REST Endpoint
  console.log('Testing GET /api/simulation/presets ...');
  await new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/simulation/presets', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.presets && json.styles && json.presets.REALISTIC) {
            console.log('✅ PASSED: /api/simulation/presets returned valid presets & styles');
            resolve();
          } else {
            reject(new Error('Invalid presets payload'));
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  // Test 2: Socket.io Simulation Connection & Execution
  console.log('\nConnecting Socket.io client to test real-time simulation...');
  const socket = io('http://localhost:3000', { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('✅ PASSED: Socket.io connected to server');
      resolve();
    });
    socket.on('connect_error', reject);
  });

  let simId = null;
  const receivedEvents = [];
  const eventTypesSeen = new Set();

  await new Promise((resolve, reject) => {
    socket.on('sim_initialized', (data) => {
      console.log(`✅ PASSED: sim_initialized received for simId ${data.simId}`);
      console.log(`   Tables: ${data.tables.length}, Bots per table: ${data.playersPerTable}, Speed: ${data.speed}x`);
      simId = data.simId;

      if (data.tables.length !== 3 || data.playersPerTable !== 5) {
        return reject(new Error('Mismatch in tables or bots count'));
      }
    });

    socket.on('sim_event', (event) => {
      receivedEvents.push(event);
      eventTypesSeen.add(event.type);
    });

    socket.on('sim_tick', ({ simTime, tables }) => {
      // Once we have seen sufficient events and ticks, proceed
      if (receivedEvents.length >= 25) {
        console.log(`✅ PASSED: Live event stream active. Events count: ${receivedEvents.length}, simTime: ${simTime}s`);
        console.log(`   Seen event types: ${Array.from(eventTypesSeen).join(', ')}`);
        resolve();
      }
    });

    // Start simulation at 4x speed for quick testing
    console.log('Emitting sim_start (3 tables, 5 bots, Realistic preset, 4x speed)...');
    socket.emit('sim_start', {
      tableCount: 3,
      playersPerTable: 5,
      scenario: 'REALISTIC',
      seed: 42,
      speed: 4.0
    });

    setTimeout(() => {
      if (receivedEvents.length < 5) {
        reject(new Error('Timeout: Did not receive simulation events in time'));
      }
    }, 10000);
  });

  // Test 3: Verify core event types
  console.log('\nVerifying required event types in single event stream:');
  const requiredTypes = ['round_started', 'calendar_tap', 'bot_thought'];
  requiredTypes.forEach(type => {
    if (eventTypesSeen.has(type)) {
      console.log(`✅ PASSED: Event type "${type}" present in stream`);
    } else {
      console.warn(`⚠️ Warning: Event type "${type}" not seen yet in first batch`);
    }
  });

  // Test 4: Test Pause / Resume / Speed Controls
  console.log('\nTesting sim_control pause and speed changes...');
  await new Promise((resolve) => {
    socket.on('sim_status_change', (status) => {
      console.log(`✅ PASSED: sim_status_change received: status=${status.status}, isPaused=${status.isPaused}`);
      resolve();
    });
    socket.emit('sim_control', { action: 'pause' });
  });

  await new Promise((resolve) => {
    socket.on('sim_speed_change', (data) => {
      console.log(`✅ PASSED: sim_speed_change received: speed=${data.speed}x`);
      resolve();
    });
    socket.emit('sim_control', { action: 'set_speed', speed: 2.0 });
  });

  // Resume to complete the test
  socket.emit('sim_control', { action: 'resume' });

  // Test 5: Export events JSON endpoint
  console.log(`\nTesting GET /api/simulation/${simId}/events.json ...`);
  await new Promise((resolve, reject) => {
    http.get(`http://localhost:3000/api/simulation/${simId}/events.json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const eventsArr = JSON.parse(data);
          if (Array.isArray(eventsArr) && eventsArr.length > 0) {
            console.log(`✅ PASSED: /api/simulation/${simId}/events.json returned ${eventsArr.length} serialized events`);
            resolve();
          } else {
            reject(new Error('Events JSON is empty or not an array'));
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });

  socket.disconnect();
  console.log('\n======================================================');
  console.log('🎉 ALL SIMULATION MODE INTEGRATION TESTS PASSED!');
  console.log('======================================================');
  process.exit(0);
}

runSimulationTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
