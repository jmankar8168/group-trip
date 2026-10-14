# ✈️ Plan a Trip in 2 Minutes

> **A real-time multiplayer design-research web game** illustrating why planning a group trip with friends is so hard. 4–6 players attempt to agree on a group getaway within 120 seconds while secretly holding conflicting role cards.

Built for design-thinking presentations, workshops, and research data collection (tracking failure rates, satisfaction degradation, asymmetric constraints, and primary sources of friction).

---

## 🌟 Key Features

1. **Big-Screen Projector View (`/host.html`)**:
   - Giant 120s countdown timer with pulse animations.
   - 4-letter room code with dynamic QR code for instant phone scanning.
   - Live connected player avatars and bot integration for solo testing.
   - Disruptive **Plot Twists** popping up at `1:30` and `0:45` remaining with Web Audio sound & haptic cues.
   - Reveal Screen displaying side-by-side unmasked roles, agreed plan (or "Trip Cancelled"), satisfaction ratings, and automated verdict.
   - Debrief presentation slide deck with customizable survey stats.

2. **Mobile-First Player View (`/play.html`)**:
   - Secret role cards with interactive **"Tap to Reveal / Tap to Hide"** privacy veil.
   - Synced mini timer with urgency color-shifts.
   - "Submit Our Group Plan" sheet (Destination, Dates, Budget per person, Main Activity).
   - Post-game private survey: 1–5 satisfaction slider, biggest source of conflict picker, and "felt heard" self-report.

3. **Round 2 (Structured Process Mode)**:
   - Replay with the same room using structured step-by-step voting (Budget $\to$ Dates $\to$ Destination $\to$ Activity) to directly contrast unstructured chaos vs structured consensus.

4. **Solo Practice Mode**:
   - 1-click sandbox with 4 simulated bots so facilitators can test the whole experience alone.

5. **Research & Admin Dashboard (`/admin.html`)**:
   - Passcode protected (`tripadmin`).
   - Live metrics: Total rounds, Completion vs Cancellation %, Average satisfaction overall and grouped by role (highlighting who hurts most, e.g. The Organizer), Conflict source distribution bar chart, % of players who felt heard by role.
   - Comparison chart between Round 1 (Open chaos) vs Round 2 (Structured voting).
   - 1-Click **"Seed 8 Sample Rounds"** (clearly marked `SAMPLE`) and **"Clear Sample Data"**.
   - 1-Click **"Download CSV"** formatted for spreadsheets and statistical analysis.
   - Built-in CRUD editors for Role Cards, Plot Twists, and Debrief presentation stats.

---

## 🎨 Design System & Visual Architecture

Restyled using the 4 reference visual directions (Reference 1: Calendar sheet popup; Reference 2: Character card; Reference 3: Fanned cards deck; Reference 4: Rotary dial & curved swirl countdown).

### 1. Design Tokens
- **Palette**:
  - Primary Indigo: `#4f46e5` / `#6366f1` (Brand & action buttons)
  - Success Emerald: `#10b981` / `#059669` (Valid dates ✓, within-budget)
  - Alert Coral / Red: `#f43f5e` / `#e11d48` (Invalid dates ✗, blocked limits)
  - Warning Amber: `#f59e0b` / `#d97706` (Twists & status chips)
  - Backgrounds: Soft pastel gradients (`#eef2ff` mint/ice blue, `#fdf2f8` cream/blush, `#f8fafc` light grey)
  - Dark Mode: `#0f172a` slate base with luminous pastel accents (`#818cf8`, `#34d399`, `#fb7185`)
- **Typography**:
  - Headings & Cards: `'Plus Jakarta Sans'`, `'Outfit'`, rounded bold display
  - Body & Numbers: `system-ui, -apple-system, sans-serif`, high legibility monospace for timer
- **Border Radii**:
  - Cards & Sheets: `20px` to `28px` rounded corners
  - Buttons, Pills & Badges: `9999px` full pills
- **Shadows**:
  - Card base: `0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)`
  - Elevated Popups: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`

### 2. Original Persona SVG Illustrations (`public/js/illustrations.js`)
All 10 friend-group personas are original vector SVGs of Indian friend-group travellers:
1. **Aarav (`char-aarav`)**: The Over-Planner — clipboard, specs, neat combed hair, planning posture.
2. **Bhavna (`char-bhavna`)**: The Budget Watcher — calculator/ledger, yellow cardigan, calculative squint.
3. **Chetan (`char-chetan`)**: The Luxury Seeker — silk shirt, aviator sunglasses, espresso cup.
4. **Divya (`char-divya`)**: The Anxious Traveler — warm travel scarf, herbal tea mug, nervous smile.
5. **Kabir (`char-kabir`)**: "I'm Fine With Anything" — comfy hoodie, thumbs-up, relaxed shrug.
6. **Meera (`char-meera`)**: The Influencer — ring light / phone gimbal, trendy jacket, sunglasses headband.
7. **Rohan (`char-rohan`)**: The Foodie — chef apron, spice pouch, tasting spoon, cheerful grin.
8. **Ananya (`char-ananya`)**: The Nature Purist — trekking bandana, backpack strap, reusable thermos.
9. **Vikram (`char-vikram`)**: The Driver / Roadtripper — leather steering gloves, aviator shades, car keychain.
10. **Pooja (`char-pooja`)**: The Night Owl — neon beanie, oversized hoodie, coffee mug, sleepy smile.

---

## 📅 New Features (Visual Calendar, Personal Budget & Petty Constraints)

### 1. Private Visual Calendar Popup (Reference 1 Style)
- **Month-style 4-week grid** (Nov 6 – Dec 3, 2026; 28 days) with weekday headers.
- **Uncolored by default**: Dates look identical until tapped.
- **Range selection**: Tap 1 sets start date, Tap 2 sets end date. Selected window is wrapped in a soft tinted band with solid circular markers.
- **Instant server evaluation**: Evaluates player's private rules only. Turns green (`✓`) or red (`✗`). Never relies on color alone.
- **Persistent dots**: Colored indicator dots persist underneath checked dates so players build their private map. Outdated dates gain a recheck indicator when twists hit.
- **Reason Bottom Sheet**: Red dates trigger a player-voiced reason popup (e.g., *"Mom said I can only travel on weekends"* or *"Client presentation on 17 Nov"*). Facilitators can set reasons to `Full reason` (default), `Category only`, or `No reason`.
- **Suggestion Board**: Green windows display a "Suggest these dates to group" pill.

### 2. Personal Budget Range & Rotary Dial (Reference 4 Style)
- Each player has a private dual-handle range with custom min and max in Rs per person (step Rs 500) and flavor labels (e.g. *"No shared dorms"* to *"Buffer for shopping"*).
- **Rotary Dial "Test an Amount"**: Rotary knob on Rs 0–30,000 scale that dynamically turns green (`✓`) inside their range and red (`✗`) outside on their phone only.
- Guaranteed mutual overlap ($\ge$ Rs 1,000–2,000 on Hard, Rs 2,000–4,000 on Medium).

### 3. Petty-Excuse Constraints & 15 Activities
- 20 seeded petty constraints (seasickness, AC required, no monkeys, new shoes/no mud, max 2 nights, proper vegetarian, no dust, high scenic only, etc.).
- 15 main activities with checkable tags (`beach_day`, `trekking`, `rafting`, `sightseeing`, `heritage_walk`, `wildlife_safari`, `camping`, `cafe_hopping`, `spa_wellness`, `nightlife`, `water_sports`, `road_trip`, `hill_stroll`, `cultural_festival`, `food_trail`).
- Machine validator blocks violations under categories `Dates`, `Budget`, `Transport`, `Environment`, `Health`, `Activity`, never leaking identities.

---

## 🚀 Quick Start (Local Run Instructions)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation & Launch
```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start
```
The server will start on: **`http://localhost:3000`**

### Accessing Views
- **Home Hub / Join**: `http://localhost:3000`
- **Host Projector View**: `http://localhost:3000/host.html`
- **Player Mobile View**: `http://localhost:3000/play.html?room=CODE`
- **Research Admin Dashboard**: `http://localhost:3000/admin.html` (Passcode configured in `.env`)
- **Health Check Probe**: `http://localhost:3000/health`

---

## 🌐 Production Cloud Deployment

The application is completely prepared for internet deployment across desktop projectors and mobile phones:

- **1-Click Render Deploy**: Uses `render.yaml` with persistent disk volume support.
- **Docker Support**: Multi-stage `Dockerfile` ready for Railway, Fly.io, or VPS.
- **Persistent SQLite**: Game results and live sessions stored in `data/trip_game.db` (survives restarts).
- **Mobile-First PWA**: Progressive Web App manifest (`manifest.json`), service worker (`sw.js`), and Screen Wake Lock to prevent phone screen dimming.
- **Absolute QR Codes**: Generates camera-ready QR codes embedding the public domain.

👉 **See [DEPLOYMENT.md](file:///c:/Users/Acer/Documents/group%20trip/DEPLOYMENT.md) for full deployment instructions, environment variables, live session facilitation guide, and free-tier keep-alive tips.**

---

## ✏️ How to Edit Role Cards, Twists & Debrief Stats

### Via the Admin Web Dashboard (`/admin.html`):
1. Navigate to `/admin.html` and enter passcode `tripadmin`.
2. Click the **"🎭 Role Cards Editor"** tab to add, edit, or delete personas.
3. Click the **"⚡ Plot Twists"** tab to configure mid-game disruptions.
4. Click the **"📊 Debrief Presentation Stats"** tab to customize the headline and 3 survey stats shown on the final slide.

### Directly via Data Files:
All game data is persisted in clean, human-readable JSON files inside the `/data` directory:
- [data/cards.json](file:///c:/Users/Acer/Documents/group%20trip/data/cards.json): 8 seed role cards with constraints, behaviors, and quotes.
- [data/twists.json](file:///c:/Users/Acer/Documents/group%20trip/data/twists.json): Seed plot twists with icons and tags.
- [data/debrief.json](file:///c:/Users/Acer/Documents/group%20trip/data/debrief.json): Survey stats and takeaways for the presentation deck.
- [data/game_logs.json](file:///c:/Users/Acer/Documents/group%20trip/data/game_logs.json): Complete log of all played rounds with player satisfaction ratings.

---

## 🧪 Testing the Game Flow

### Option 1: Solo Practice Mode (In Browser)
1. Open `http://localhost:3000`.
2. Click **"🤖 Solo Practice Mode (with Bots)"**.
3. 4 AI bots will instantly connect to the room.
4. Click **"Start 120s Game"**.
5. Observe the timer, twist notifications, submit a plan, and view the automated unmasking on the reveal board!

### Option 2: Automated Multi-Player Simulation Script
Run the automated end-to-end test script simulating 4 distinct socket clients:
```bash
node test_sim.js
```
This runs the full lifecycle (connecting host, joining 4 players, role assignment, plan submission, rating submission, and verdict calculation).

---

## 📊 Sample Research Data
To test the Admin Dashboard with realistic data:
1. Open `http://localhost:3000/admin.html` (Passcode: `tripadmin`).
2. Click **"🌱 Seed 8 Sample Rounds"**.
3. Inspect the completion rates, satisfaction distributions, and conflict bar charts.
4. When ready to clean up for your real presentation, click **"🗑️ Clear Sample Data"** to leave only genuine participant records.
