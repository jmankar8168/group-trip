# "Plan a Trip in 2 Minutes" — Production Deployment & Live Session Guide

This document covers the architectural audit, step-by-step cloud deployment instructions, cross-device mobile optimizations, live facilitation cheat sheet, and offline emergency fallback.

---

## 1. Architectural Audit

### Previous State vs. Production State

| Component | Previous Localhost Implementation | Production Deployment Implementation |
| :--- | :--- | :--- |
| **Frontend Framework** | Vanilla HTML5, CSS3 with tokens, ES6 modules | Vanilla HTML5 / CSS3 / ES6 (No build step needed) + PWA Manifest, Service Worker (`sw.js`), Apple Mobile Web App tags |
| **Backend & Real-Time** | Node.js Express + Socket.IO WebSockets | Node.js Express + Socket.IO with sticky sessions, reverse proxy support (`app.set('trust proxy', 1)`), and `/health` probe |
| **State Storage** | In-memory Javascript objects + ephemeral JSON files | Persistent disk-backed **SQLite database** (`data/trip_game.db` or via `DB_PATH`). Live sessions, students, cards, twists, and logs survive restarts and redeploys |
| **URLs & Ports** | Hardcoded `localhost:3000` in QR codes and links | Dynamic origin detection (`window.location.origin`), environment variables `PORT`, `ALLOWED_ORIGINS`, `SERVER_URL` |
| **QR Code Format** | Relative URL (`/play.html?code=TRIP`) | Absolute URL embedding the server's public domain (`https://<domain>/play.html?code=TRIP`) so phone cameras directly open the page |
| **Security & Limits** | Unprotected endpoints, unlimited API calls | Rate limiting (`express-rate-limit`), origin restrictions, admin passcode in `.env`, strict client sanitization |
| **Mobile UX** | Basic layout, phones could sleep during round | Screen Wake Lock API (`navigator.wakeLock`), min 44px touch targets, safe area padding, offline/reconnecting banner |

---

## 2. Cloud Hosting Analysis & Recommendation

### Recommended Host: **Render.com** (or **Railway.app**)

#### Why Render?
- **Native WebSocket support**: Render supports persistent long-lived WebSockets and Socket.IO without complex routing or premature socket drops.
- **Unified Deployment**: Both static frontend files and Socket.IO server are served together from one Express application on one port, eliminating cross-origin (CORS) complications.
- **Automatic SSL (HTTPS & WSS)**: Render issues automatic TLS certificates on `*.onrender.com` or custom domains. Secure contexts (`https://` and `wss://`) are **mandatory** on iOS Safari and Android Chrome for:
  - Screen Wake Lock API (`navigator.wakeLock`)
  - Web Vibration API & Clipboard APIs
  - Progressive Web App (PWA) Service Worker registration
- **1-Click Blueprint (`render.yaml`)**: Built-in infrastructure-as-code for zero-friction setup.

#### Free-Tier Caveats & Keep-Alive Plan:
- **Free Tier Inactivity Sleep**: Render free web services spin down after **15 minutes of inactivity**. Waking up takes **~50 seconds** (cold start).
- **Presentation Rule**: Pinging the server 5 minutes before your presentation or live classroom session warms up the container so players experience immediate 0ms joins.
- **Automated Keep-Alive**: Use a free cron ping tool (e.g. UptimeRobot, Cron-Job.org, or GitHub Actions) pinging `https://<your-app>.onrender.com/health` every 10 minutes.

---

## 3. Step-by-Step Deploy Instructions

### Option A: 1-Click Deploy to Render

1. Push your code to a GitHub or GitLab repository:
   ```bash
   git init
   git add .
   git commit -m "feat: production cloud deployment ready"
   git remote add origin https://github.com/<your-username>/group-trip-game.git
   git push -u origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Blueprint**.
3. Select your repository. Render will automatically detect `render.yaml`.
4. Render will provision the web service, create the environment variables, and provide your public URL:
   - **Public Player URL**: `https://<your-service-name>.onrender.com/play.html`
   - **Host Projector URL**: `https://<your-service-name>.onrender.com/host.html`
   - **Health Probe**: `https://<your-service-name>.onrender.com/health`

### Option B: Deploy with Docker (Railway / Fly.io / VPS)

Using the included multi-stage `Dockerfile`:

```bash
# Build container image
docker build -t group-trip-game .

# Run with persistent volume for SQLite
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e ADMIN_PASSCODE="your-secure-passcode" \
  --name trip-game \
  group-trip-game
```

---

## 4. Environment Variables Reference

See `.env.example`:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP/WebSocket listening port assigned by cloud host |
| `NODE_ENV` | `production` | Enables production optimizations and security headers |
| `SERVER_URL` | *(empty)* | Optional explicit public origin (e.g. `https://trip.yourdomain.com`) |
| `ALLOWED_ORIGINS`| `*` | Comma-separated list of allowed origins, or `*` |
| `ADMIN_PASSCODE` | `admin123` | Passcode required to export raw research logs or trigger admin resets |
| `DB_PATH` | `data/trip_game.db`| Filepath on persistent disk for SQLite database |
| `RATE_LIMIT_MAX` | `120` | Max API requests per IP per minute |

---

## 5. One-Page Facilitator Guide: Running a Live Session

### 5 Minutes Before Presentation
1. Open `https://<your-app>.onrender.com/health` on your phone or laptop.
2. Confirm the JSON returns `{"status":"ok"}`. (If the service was sleeping, this initial request wakes it up).

### Presenting on the Projector
1. Connect your laptop to the projector and navigate to:
   `https://<your-app>.onrender.com/host.html`
2. Select:
   - **Difficulty**: Medium (recommended for groups of 4–6)
   - **Timer**: 3 Minutes (180s)
   - **Reason Setting**: Mandatory (forces discovery through conversation)
3. Click **"Open Class Lobby"**:
   - The projector will display a giant 4-letter session code (e.g. `TRIP`) and a clean high-resolution QR code.
   - The direct URL `https://<your-domain>/play.html` is shown for manual entry.

### Student Join Phase (1–2 Minutes)
1. Instruct students: *"Point your phone camera at the screen to join and form your team of 4–6 players at your table."*
2. As students join and tap **"Ready"**, their groups turn green on the projector.
3. Once all table groups are marked **Ready**, tap **"Start Round →"**.

### During Deliberation
- Hover near the bottom of the host projector screen to access the floating **Host Controls Tray**:
  - `⏸️ Pause`: Pauses the timer across all player phones if you need to announce instructions.
  - `⏱️ +30s`: Adds extra time to all devices simultaneously.
  - `⏹️ End Round`: Ends deliberation immediately when all groups have finished.

### Debrief Slideshow & Data Export
1. At time's up, the host screen automatically cycles through the **Class Debrief Board**:
   - **Slide 1**: Class Success Rate & Total Participants
   - **Slide 2**: Team Leaderboard (click any group row to reveal their hidden golden date windows!)
   - **Slide 3**: The Top Culprits (bar charts of most frequent dealbreaker constraints)
   - **Slide 4**: The Human Side (satisfaction vs. failure correlation, feeling heard metrics)
   - **Slide 5**: Key Design Insights (actionable takeaways on why group planning fails)
2. Click **"📥 Export CSV"** from the tray to download the complete research dataset.

---

## 6. "Demo Day" Offline Fallback (Zero Wi-Fi Required)

If venue Wi-Fi fails or cellular signal inside the room is blocked:

1. **Local Host Mode**:
   - Run `node server.js` locally on your laptop.
   - Connect your laptop to your phone's personal Wi-Fi hotspot or local network.
   - The host screen QR code will automatically detect your local IP (e.g. `http://192.168.1.50:3000/play.html?code=TRIP`).
2. **Instant Practice Bots Simulation**:
   - On the setup screen of `host.html`, click the subtle link:
     *"Need a quick test? Start instant practice round with 4 automated bot groups"*
   - The host will instantly populate 4 realistic student teams with simulated votes, blocked plans, and survey ratings, allowing you to demonstrate the full debrief experience seamlessly without any attendees needing an internet connection.
