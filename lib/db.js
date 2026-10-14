const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'trip_game.db');
const db = new sqlite3.Database(DB_PATH);

// Helper for promise-based queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize tables
async function initDB() {
  await run(`
    CREATE TABLE IF NOT EXISTS game_logs (
      id TEXT PRIMARY KEY,
      session_code TEXT,
      round_number INTEGER,
      timestamp TEXT,
      difficulty TEXT,
      timer_duration INTEGER,
      total_groups INTEGER,
      total_players INTEGER,
      locked_count INTEGER,
      success_rate INTEGER,
      results_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS active_sessions (
      session_code TEXT PRIMARY KEY,
      phase TEXT,
      round_number INTEGER,
      difficulty TEXT,
      timer_duration INTEGER,
      date_reason_setting TEXT,
      timer INTEGER,
      is_paused INTEGER,
      start_time INTEGER,
      teacher_notes TEXT,
      session_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS students (
      token TEXT PRIMARY KEY,
      session_code TEXT,
      group_id TEXT,
      nickname TEXT,
      is_ready INTEGER,
      is_bot INTEGER,
      student_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS content_items (
      type TEXT,
      id TEXT,
      data_json TEXT,
      PRIMARY KEY (type, id)
    )
  `);

  // Seed default game content from JSON files if not present in DB
  await seedContentIfEmpty('cards', path.join(DATA_DIR, 'cards.json'));
  await seedContentIfEmpty('twists', path.join(DATA_DIR, 'twists.json'));
  await seedContentIfEmpty('destinations', path.join(DATA_DIR, 'destinations.json'));
  await seedContentIfEmpty('activities', path.join(DATA_DIR, 'activities.json'));
}

async function seedContentIfEmpty(type, filePath) {
  try {
    const existing = await all('SELECT id FROM content_items WHERE type = ?', [type]);
    if (existing.length === 0 && fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const items = JSON.parse(raw || '[]');
      for (const item of items) {
        const id = item.id || `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
        await run('INSERT OR REPLACE INTO content_items (type, id, data_json) VALUES (?, ?, ?)', [
          type,
          id,
          JSON.stringify(item)
        ]);
      }
    }
  } catch (err) {
    console.error(`Error seeding ${type} into SQLite:`, err);
  }
}

// Database helper functions
async function getContent(type) {
  const rows = await all('SELECT data_json FROM content_items WHERE type = ?', [type]);
  return rows.map(r => JSON.parse(r.data_json));
}

async function saveSessionToDB(session) {
  try {
    const sessionObj = {
      sessionCode: session.sessionCode,
      phase: session.phase,
      roundNumber: session.roundNumber,
      difficulty: session.difficulty,
      timerDuration: session.timerDuration,
      dateReasonSetting: session.dateReasonSetting,
      timer: session.timer,
      isPaused: session.isPaused ? 1 : 0,
      startTime: session.startTime,
      twistsTriggered: Array.from(session.twistsTriggered || []),
      groups: Array.from(session.groups.entries()).map(([gId, g]) => ({
        groupId: g.groupId,
        name: g.name,
        createdTime: g.createdTime,
        isExcluded: g.isExcluded,
        status: g.status,
        outcome: g.outcome,
        submittedPlan: g.submittedPlan,
        lockedTime: g.lockedTime,
        blockedAttemptsCount: g.blockedAttemptsCount,
        blockedCategories: g.blockedCategories,
        pettyExcusesBlocked: g.pettyExcusesBlocked,
        goldenWindows: g.goldenWindows,
        validPlansCount: g.validPlansCount,
        twistsDealt: g.twistsDealt,
        activeTwists: g.activeTwists,
        ratings: g.ratings,
        memberTokens: Array.from(g.members.keys())
      })),
      teacherNotes: session.teacherNotes || ''
    };

    await run(`
      INSERT OR REPLACE INTO active_sessions
      (session_code, phase, round_number, difficulty, timer_duration, date_reason_setting, timer, is_paused, start_time, teacher_notes, session_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      session.sessionCode,
      session.phase,
      session.roundNumber,
      session.difficulty,
      session.timerDuration,
      session.dateReasonSetting,
      session.timer,
      session.isPaused ? 1 : 0,
      session.startTime,
      session.teacherNotes || '',
      JSON.stringify(sessionObj)
    ]);

    // Save all students
    for (const [token, st] of session.students.entries()) {
      await run(`
        INSERT OR REPLACE INTO students
        (token, session_code, group_id, nickname, is_ready, is_bot, student_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        token,
        session.sessionCode,
        st.groupId,
        st.nickname,
        st.isReady ? 1 : 0,
        st.isBot ? 1 : 0,
        JSON.stringify({
          token: st.token,
          nickname: st.nickname,
          groupId: st.groupId,
          isReady: st.isReady,
          isBot: st.isBot,
          roleCard: st.roleCard,
          dateRule: st.dateRule,
          personalBudget: st.personalBudget,
          assignedTwist: st.assignedTwist,
          checkedDates: st.checkedDates,
          dateChecksCount: st.dateChecksCount,
          rating: st.rating
        })
      ]);
    }
  } catch (err) {
    console.error('Failed to save session to SQLite:', err);
  }
}

async function loadSessionsFromDB() {
  const sessions = new Map();
  try {
    const rows = await all('SELECT * FROM active_sessions');
    for (const row of rows) {
      const data = JSON.parse(row.session_json);
      const studentRows = await all('SELECT * FROM students WHERE session_code = ?', [row.session_code]);

      const session = {
        sessionCode: data.sessionCode,
        hostSocketId: null,
        phase: data.phase,
        roundNumber: data.roundNumber || 1,
        difficulty: data.difficulty || 'medium',
        timerDuration: data.timerDuration || 180,
        dateReasonSetting: data.dateReasonSetting || 'mandatory',
        timer: data.timer || 180,
        timerInterval: null,
        isPaused: data.isPaused === 1,
        startTime: data.startTime,
        twistsTriggered: new Set(data.twistsTriggered || []),
        groups: new Map(),
        students: new Map(),
        teacherNotes: data.teacherNotes || '',
        responseTimeoutTimer: null
      };

      // Rehydrate students
      for (const sRow of studentRows) {
        const sData = JSON.parse(sRow.student_json);
        session.students.set(sData.token, {
          ...sData,
          socketId: null
        });
      }

      // Rehydrate groups
      for (const g of data.groups || []) {
        const group = {
          ...g,
          members: new Map()
        };
        for (const token of (g.memberTokens || [])) {
          if (session.students.has(token)) {
            group.members.set(token, session.students.get(token));
          }
        }
        session.groups.set(g.groupId, group);
      }

      sessions.set(session.sessionCode, session);
    }
  } catch (err) {
    console.error('Error loading sessions from SQLite:', err);
  }
  return sessions;
}

async function saveLogToDB(logEntry) {
  try {
    const id = logEntry.id || `LOG-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    await run(`
      INSERT INTO game_logs
      (id, session_code, round_number, timestamp, difficulty, timer_duration, total_groups, total_players, locked_count, success_rate, results_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      logEntry.sessionCode,
      logEntry.roundNumber || 1,
      logEntry.timestamp || new Date().toISOString(),
      logEntry.difficulty,
      logEntry.timerDuration,
      logEntry.totalGroups,
      logEntry.totalPlayers,
      logEntry.lockedCount,
      logEntry.successRate,
      JSON.stringify(logEntry)
    ]);
  } catch (err) {
    console.error('Error saving game log to SQLite:', err);
  }
}

async function getAllLogsFromDB() {
  try {
    const rows = await all('SELECT * FROM game_logs ORDER BY created_at DESC');
    return rows.map(r => JSON.parse(r.results_json));
  } catch (err) {
    console.error('Error getting logs from SQLite:', err);
    return [];
  }
}

module.exports = {
  db,
  initDB,
  getContent,
  saveSessionToDB,
  loadSessionsFromDB,
  saveLogToDB,
  getAllLogsFromDB,
  run,
  get,
  all
};
