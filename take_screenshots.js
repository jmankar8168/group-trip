const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const msedgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const browserPath = fs.existsSync(chromePath) ? chromePath : msedgePath;

const outDir = path.resolve(__dirname, 'screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const tasks = [
  // Full Styleguide
  {
    name: '01_styleguide_host_1920x1080.png',
    url: 'http://localhost:3000/styleguide',
    width: 1920,
    height: 1080
  },
  {
    name: '02_styleguide_phone_360x800.png',
    url: 'http://localhost:3000/styleguide',
    width: 360,
    height: 800
  },

  // Reference 1: Calendar Component
  {
    name: '03_ref1_calendar_phone_360x800.png',
    url: 'http://localhost:3000/styleguide?view=calendar',
    width: 360,
    height: 800
  },

  // Reference 2: Role Card Component
  {
    name: '04_ref2_role_card_phone_360x800.png',
    url: 'http://localhost:3000/styleguide?view=card',
    width: 360,
    height: 800
  },

  // Reference 3: Card Deck & Rotary Dial
  {
    name: '05_ref3_deck_and_knob_phone_360x800.png',
    url: 'http://localhost:3000/styleguide?view=deck',
    width: 360,
    height: 800
  },

  // Reference 4: Lobby Stack, Starburst Twist & Timer
  {
    name: '06_ref4_lobby_twist_phone_360x800.png',
    url: 'http://localhost:3000/styleguide?view=lobby',
    width: 360,
    height: 800
  },

  // Host Screen 1920x1080
  {
    name: '07_host_screen_lobby_1920x1080.png',
    url: 'http://localhost:3000/host.html',
    width: 1920,
    height: 1080
  },

  // Player Screen 360x800
  {
    name: '08_player_join_screen_phone_360x800.png',
    url: 'http://localhost:3000/play.html',
    width: 360,
    height: 800
  },

  // Research Admin Dashboard 1920x1080
  {
    name: '09_admin_research_dashboard_1920x1080.png',
    url: 'http://localhost:3000/admin.html',
    width: 1920,
    height: 1080
  }
];

console.log('Capturing all deliverable screenshots with:', browserPath);

tasks.forEach((t, i) => {
  const outFile = path.resolve(outDir, t.name);
  const args = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    `--window-size=${t.width},${t.height}`,
    `--screenshot=${outFile}`,
    t.url
  ];

  try {
    execFileSync(browserPath, args, { stdio: 'inherit', timeout: 30000 });
    const size = fs.existsSync(outFile) ? fs.statSync(outFile).size : 0;
    console.log(`[${i + 1}/${tasks.length}] Captured ${t.name} (${size} bytes)`);
  } catch (err) {
    console.error(`Error capturing ${t.name}:`, err.message);
  }
});

console.log('Screenshots capture complete in:', outDir);
