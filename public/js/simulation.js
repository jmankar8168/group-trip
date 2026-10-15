/**
 * Experience Simulation Engine · "The Trip That Never Happened"
 * Self-contained, deterministic interactive mock game with 5 fictional friends across 7 stages.
 */

const SIMULATION_PLAYERS = [
  {
    id: "aarav",
    name: "Aarav",
    role: "Budget Optimizer",
    trait: "Pragmatic & cost-conscious",
    privateBudget: 6000,
    avatarSvg: `
      <svg viewBox="0 0 160 160" width="100%" height="100%">
        <circle cx="80" cy="80" r="70" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
        <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="var(--o)"/>
        <ellipse cx="80" cy="74" rx="27" ry="29" fill="var(--sun)"/>
        <rect x="58" y="66" width="18" height="14" rx="3" fill="#ffffff" stroke="var(--ink)" stroke-width="2"/>
        <rect x="84" y="66" width="18" height="14" rx="3" fill="#ffffff" stroke="var(--ink)" stroke-width="2"/>
        <line x1="76" y1="73" x2="84" y2="73" stroke="var(--ink)" stroke-width="2"/>
        <circle cx="67" cy="73" r="2.5" fill="var(--ink)"/>
        <circle cx="93" cy="73" r="2.5" fill="var(--ink)"/>
        <path d="M73 88 Q80 93 87 88" stroke="var(--ink)" stroke-width="2" fill="none"/>
      </svg>
    `,
    color: "var(--o)",
    defaultQuote: "“I'm in, as long as we keep it reasonable and don't burn money on tourist traps.”"
  },
  {
    id: "maya",
    name: "Maya",
    role: "Comfort & Aesthetics",
    trait: "Values clean spaces & AC",
    privateBudget: 12000,
    avatarSvg: `
      <svg viewBox="0 0 160 160" width="100%" height="100%">
        <circle cx="80" cy="80" r="70" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
        <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="var(--m)"/>
        <ellipse cx="80" cy="74" rx="27" ry="29" fill="var(--sun)"/>
        <path d="M52 56 C52 38 66 32 80 32 C94 32 108 38 108 56 Z" fill="var(--ink)"/>
        <path d="M57 66 C57 66 67 64 75 67 C77 75 72 81 65 81 C58 81 55 75 57 66 Z" fill="var(--ink)"/>
        <path d="M85 67 C93 64 103 66 103 66 C105 75 102 81 95 81 C88 81 83 75 85 67 Z" fill="var(--ink)"/>
        <line x1="75" y1="69" x2="85" y2="69" stroke="var(--ink)" stroke-width="2"/>
        <path d="M72 89 Q80 95 88 89" stroke="var(--ink)" stroke-width="2" fill="none"/>
      </svg>
    `,
    color: "var(--m)",
    defaultQuote: "“If we're taking leave from work, I really don't want a dingy 8-bed dorm.”"
  },
  {
    id: "riya",
    name: "Riya",
    role: "Private Saver",
    trait: "Anxious about hidden expenses",
    privateBudget: 7000,
    avatarSvg: `
      <svg viewBox="0 0 160 160" width="100%" height="100%">
        <circle cx="80" cy="80" r="70" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
        <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="var(--c)"/>
        <ellipse cx="80" cy="74" rx="27" ry="29" fill="var(--sun)"/>
        <ellipse cx="80" cy="46" rx="22" ry="16" fill="var(--ink)"/>
        <circle cx="68" cy="74" r="3" fill="var(--ink)"/>
        <circle cx="92" cy="74" r="3" fill="var(--ink)"/>
        <path d="M74 88 Q80 91 86 88" stroke="var(--ink)" stroke-width="2" fill="none"/>
      </svg>
    `,
    color: "var(--c)",
    defaultQuote: "“Let's see what everyone's thinking before finalizing anything costly.”"
  },
  {
    id: "kabir",
    name: "Kabir",
    role: "Experience Chaser",
    trait: "Prioritises treks & activities",
    privateBudget: 9000,
    avatarSvg: `
      <svg viewBox="0 0 160 160" width="100%" height="100%">
        <circle cx="80" cy="80" r="70" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
        <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="var(--g)"/>
        <ellipse cx="80" cy="74" rx="28" ry="29" fill="var(--sun)"/>
        <circle cx="66" cy="73" r="3.5" fill="var(--ink)"/>
        <circle cx="94" cy="73" r="3.5" fill="var(--ink)"/>
        <path d="M70 87 Q80 97 90 87" stroke="var(--ink)" stroke-width="2.5" fill="none"/>
      </svg>
    `,
    color: "var(--g)",
    defaultQuote: "“Sleep is for when we're back home. Let's do the sunset trek and cliff jumping!”"
  },
  {
    id: "ananya",
    name: "Ananya",
    role: "Group Mediator",
    trait: "Finds creative middle grounds",
    privateBudget: 8500,
    avatarSvg: `
      <svg viewBox="0 0 160 160" width="100%" height="100%">
        <circle cx="80" cy="80" r="70" fill="var(--paper)" stroke="var(--ink)" stroke-width="3"/>
        <path d="M42 145 C42 118 60 110 80 110 C100 110 118 118 118 145 Z" fill="var(--blue)"/>
        <ellipse cx="80" cy="74" rx="27" ry="29" fill="var(--sun)"/>
        <path d="M52 64 C52 40 64 32 80 32 C96 32 108 40 108 64 Z" fill="var(--ink)"/>
        <circle cx="68" cy="74" r="3" fill="var(--ink)"/>
        <circle cx="92" cy="74" r="3" fill="var(--ink)"/>
        <path d="M73 88 Q80 93 87 88" stroke="var(--ink)" stroke-width="2" fill="none"/>
      </svg>
    `,
    color: "var(--blue)",
    defaultQuote: "“We can have an amazing trip without leaving anyone stressed or behind.”"
  }
];

const SIMULATION_STAGES = [
  // -------------------------------------------------------------
  // STAGE 1: THE IDEA
  // -------------------------------------------------------------
  {
    index: 1,
    title: "Stage 1 — The Idea",
    kicker: "01 · Spontaneous Excitement",
    headline: "“Guys, let's plan a trip this month!!”",
    description: "The group decides to plan a long-weekend getaway. Initial excitement peaks, suggested destinations fly in, and early expectations start clashing.",
    playerStates: {
      aarav: { status: "Cautious: Checking train fare", thought: "Need to make sure this doesn't exceed ₹6,000." },
      maya: { status: "Enthusiastic: Wants beach villa", thought: "I want scenic cafes and good AC. No cramped hostels." },
      riya: { status: "Quietly observing chat", thought: "Hope they don't pick expensive flights. My stipend is tight." },
      kabir: { status: "Hyped: Sending reels", thought: "Gokarna or Rishikesh! Need cliff diving and bonfires." },
      ananya: { status: "Organizing: Setting up poll", thought: "Let's gather ideas before everyone goes in different directions." }
    },
    render(container, state) {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.5rem; align-items: start;">
          <!-- Simulated WhatsApp Group Chat -->
          <div>
            <div class="kicker" style="color: var(--o); margin-bottom: 0.5rem;">Group Chat &bull; 5 Members Online</div>
            <div class="sim-chat-box">
              <div class="sim-chat-bubble system">✦ Kabir created group "GOKARNA OR BUST 🏖️" ✦</div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--g);">Kabir</div>
                Guys! Dussehra weekend is coming up. We haven't travelled together since college. Pack your bags! 🔥
              </div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--m);">Maya</div>
                Omg YES!! I need a beach break so badly. Can we book something with an infinity pool overlooking the sea? 😍
              </div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--o);">Aarav</div>
                Infinity pool = ₹10k a night lol. Let's be practical. What's the total estimate?
              </div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--c);">Riya</div>
                Yes... let's see options first. Where are we thinking?
              </div>
              <div class="sim-chat-bubble outgoing">
                <div class="sim-sender-tag" style="color: var(--sun);">Ananya</div>
                How about Gokarna? Stunning quiet beaches, cliff treks, and way more affordable than South Goa!
              </div>
            </div>
          </div>

          <!-- Destination Options Poll Card -->
          <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.5rem;">
            <div class="kicker" style="color: var(--m); margin-bottom: 0.4rem;">Initial Destination Poll</div>
            <h3 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 1rem;">Where Should We Head?</h3>
            
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              <div style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 16px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                  <span>🏖️ Gokarna (Coastal & Treks)</span>
                  <span style="color: var(--g); font-family: var(--font-serif); font-size: 1.2rem;">4 Votes</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--mute);">Ananya, Kabir, Aarav, Riya &bull; Balanced cost & experience</div>
              </div>

              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 16px; padding: 0.85rem 1rem; opacity: 0.75;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                  <span>🍹 South Goa (Resorts & Nightlife)</span>
                  <span style="font-family: var(--font-serif); font-size: 1.2rem;">1 Vote</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--mute);">Maya &bull; Flight costs high over festive weekend</div>
              </div>

              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 16px; padding: 0.85rem 1rem; opacity: 0.65;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px;">
                  <span>⛰️ Rishikesh (River Rafting)</span>
                  <span style="font-family: var(--font-serif); font-size: 1.2rem;">0 Votes</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--mute);">Too long travel time for 4 days</div>
              </div>
            </div>

            <div style="margin-top: 1.25rem; padding: 0.75rem; background: var(--sun); border-radius: 12px; border: 1px solid var(--ink); font-size: 0.82rem; font-weight: 700; color: var(--ink);">
              💡 <strong>Group Insight:</strong> Gokarna emerges as the consensus destination, but expectations on stay comfort and budget are already diverging.
            </div>
          </div>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // STAGE 2: FINDING A DATE
  // -------------------------------------------------------------
  {
    index: 2,
    title: "Stage 2 — Finding a Date",
    kicker: "02 · Calendar Conflict",
    headline: "“When is everyone actually free?”",
    description: "Each friend checks their private commitments. Out of four weekends in October, only one 4-day window works for all five members.",
    playerStates: {
      aarav: { status: "Blocked W1: Exam prep", thought: "Oct 2–5 is out. Oct 23–26 works perfectly." },
      maya: { status: "Blocked W3: Project deadline", thought: "Cannot take leave on Oct 16. Oct 23 Dussehra holiday is ideal." },
      riya: { status: "Blocked W2: Family wedding", thought: "Oct 9–12 is sister's engagement. Oct 23 is free!" },
      kabir: { status: "Free all weekends", thought: "I can make any weekend work. Let's just lock it." },
      ananya: { status: "Found consensus window", thought: "Oct 23–26 is Dussehra + weekend + 1 leave = 4 full days!" }
    },
    render(container, state) {
      container.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
            <div>
              <div class="kicker" style="color: var(--o); margin-bottom: 0.35rem;">Calendar Synchronization</div>
              <h3 style="font-family: var(--font-serif); font-size: 1.6rem; margin: 0;">October Weekend Windows (4 Days Each)</h3>
            </div>
            <span class="sim-badge-demo">100% Shared Availability Found</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
            <!-- Window 1 -->
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem; opacity: 0.65;">
              <div class="kicker" style="color: var(--mute);">Window 01</div>
              <div style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.5rem;">Oct 2 – 5</div>
              <div style="font-size: 0.8rem; color: var(--o); font-weight: 700;">✕ 1 Conflict</div>
              <div style="font-size: 0.78rem; color: var(--mute); margin-top: 4px;">Aarav: Certification exam prep</div>
            </div>

            <!-- Window 2 -->
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem; opacity: 0.65;">
              <div class="kicker" style="color: var(--mute);">Window 02</div>
              <div style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.5rem;">Oct 9 – 12</div>
              <div style="font-size: 0.8rem; color: var(--o); font-weight: 700;">✕ 1 Conflict</div>
              <div style="font-size: 0.78rem; color: var(--mute); margin-top: 4px;">Riya: Family wedding engagement</div>
            </div>

            <!-- Window 3 -->
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem; opacity: 0.65;">
              <div class="kicker" style="color: var(--mute);">Window 03</div>
              <div style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.5rem;">Oct 16 – 19</div>
              <div style="font-size: 0.8rem; color: var(--o); font-weight: 700;">✕ 1 Conflict</div>
              <div style="font-size: 0.78rem; color: var(--mute); margin-top: 4px;">Maya: Client quarterly launch</div>
            </div>

            <!-- Window 4 (Golden Consensus) -->
            <div style="background: var(--sun); border: 2px solid var(--ink); border-radius: 20px; padding: 1.25rem; box-shadow: 4px 4px 0px var(--ink);">
              <div class="kicker" style="color: var(--ink);">✦ Golden Window 04</div>
              <div style="font-family: var(--font-serif); font-size: 1.35rem; font-weight: 700; margin-bottom: 0.5rem;">Oct 23 – 26</div>
              <div style="font-size: 0.85rem; color: var(--g); font-weight: 800;">✓ 5 of 5 Available!</div>
              <div style="font-size: 0.78rem; color: var(--ink); margin-top: 4px;">Dussehra public holiday + 1 leave</div>
            </div>
          </div>

          <!-- Chat snippet on date agreement -->
          <div class="sim-chat-box" style="max-height: 140px;">
            <div class="sim-chat-bubble incoming">
              <div class="sim-sender-tag" style="color: var(--blue);">Ananya</div>
              Look at the calendar: Oct 23 to 26 has ZERO clashes! We get Friday to Monday. Should I lock dates?
            </div>
            <div class="sim-chat-bubble incoming">
              <div class="sim-sender-tag" style="color: var(--o);">Aarav</div>
              Yes! Oct 23 works for me. Now let's talk budget before anyone book flights.
            </div>
          </div>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // STAGE 3: THE BUDGET PROBLEM
  // -------------------------------------------------------------
  {
    index: 3,
    title: "Stage 3 — The Budget Problem",
    kicker: "03 · Asymmetric Information",
    headline: "“What's everyone's budget?” (Nobody says their real number)",
    description: "Each player sets their comfortable spending ceiling privately. In the group chat, an expensive proposal lands and tensions brew silently.",
    playerStates: {
      aarav: { status: "Private Limit: ₹6,000", thought: "₹11.5k is insane for 4 days. Absolutely not doing that." },
      maya: { status: "Private Limit: ₹12,000", thought: "₹11.5k feels totally fine for a scenic resort with private pool." },
      riya: { status: "Private Limit: ₹7,000 (Secret)", thought: "₹11,500?! I can't afford that... but I don't want to sound broke." },
      kabir: { status: "Private Limit: ₹9,000", thought: "Why spend ₹11.5k on a room? Put that into scuba and boat charters!" },
      ananya: { status: "Private Limit: ₹8,500", thought: "Aarav is pushing back and Riya went silent. We need a rethink." }
    },
    render(container, state) {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.5rem; align-items: start;">
          <div>
            <div class="kicker" style="color: var(--o); margin-bottom: 0.5rem;">Group Chat &bull; Proposed Plan Shock</div>
            <div class="sim-chat-box">
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--m);">Maya</div>
                Guys check this out!! 🏖️ Cliffside Luxury Villa in Gokarna. Private beach access, infinity pool, breakfast buffet included. Total package comes to ₹11,500 per person with flights!
              </div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--o);">Aarav</div>
                ₹11,500?! For a college reunion in Gokarna? That's double what I budgeted. Let's look at homestays or trains.
              </div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--c);">Riya</div>
                ...yeah, maybe something a little simpler? 😅
              </div>
              <div class="sim-chat-bubble incoming">
                <div class="sim-sender-tag" style="color: var(--g);">Kabir</div>
                Agree with Aarav on hotel cost. I'd rather spend money on scooter rentals and boat rides to Half Moon beach.
              </div>
              <div class="sim-chat-bubble system">⚠️ Proposed package (₹11,500) exceeds 3 members' comfortable spending limit</div>
            </div>
          </div>

          <!-- Private vs Public Budget Breakdown -->
          <div>
            <div class="kicker" style="color: var(--m); margin-bottom: 0.4rem;">Behind the Scenes &bull; True Limits</div>
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                <span style="font-weight: 700; font-size: 0.9rem;">Private Spending Ceilings:</span>
                <span class="sim-private-pill">🤫 Stored Privately</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.85rem;">
                <div style="background: #ffffff; padding: 0.6rem 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>Aarav:</strong> Strict Budget</span>
                  <span style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--o);">₹6,000 max</span>
                </div>
                <div style="background: #ffffff; padding: 0.6rem 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>Maya:</strong> Comfort Priority</span>
                  <span style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--m);">₹12,000 max</span>
                </div>
                <div style="background: var(--sun); padding: 0.6rem 0.85rem; border-radius: 12px; border: 1.5px solid var(--ink); display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>Riya:</strong> <em>Kept Secret From Chat</em></span>
                  <span style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--ink); font-weight: 700;">₹7,000 max</span>
                </div>
                <div style="background: #ffffff; padding: 0.6rem 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>Kabir:</strong> Activity Spender</span>
                  <span style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--g);">₹9,000 max</span>
                </div>
                <div style="background: #ffffff; padding: 0.6rem 0.85rem; border-radius: 12px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>Ananya:</strong> Mediator Target</span>
                  <span style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--blue);">₹8,500 max</span>
                </div>
              </div>

              <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--mute); line-height: 1.45;">
                🔒 <strong>Privacy Rule:</strong> Riya never had to announce her bank limit. The group only learned that ₹11,500 caused friction, opening the door for constructive compromise.
              </div>
            </div>
          </div>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // STAGE 4: VOTING ON OPTIONS
  // -------------------------------------------------------------
  {
    index: 4,
    title: "Stage 4 — Voting on Options",
    kicker: "04 · Preference Trade-offs",
    headline: "“Let's break down stay, travel, and activities.”",
    description: "Instead of an all-or-nothing package, the group votes on individual components to see where money can be saved without sacrificing fun.",
    playerStates: {
      aarav: { status: "Voted: Train + Homestay", thought: "Overnight train saves hotel night and flight fare." },
      maya: { status: "Voted: Heritage Homestay + AC", thought: "If we can't do the luxury villa, Portuguese homestay with AC is super cute!" },
      riya: { status: "Voted: Homestay + Beach Trek", thought: "Homestay is ₹2,400 for all 3 nights — that's totally doable for me!" },
      kabir: { status: "Voted: Scooters + Cliff Trek", thought: "Renting scooters is way cooler than booking private AC cabs." },
      ananya: { status: "Synthesizing votes", thought: "We have clear majority winners on train and heritage stay!" }
    },
    render(container, state) {
      container.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
            <div>
              <div class="kicker" style="color: var(--o); margin-bottom: 0.35rem;">Democratic Consensus</div>
              <h3 style="font-family: var(--font-serif); font-size: 1.6rem; margin: 0;">Component Voting Breakdown</h3>
            </div>
            <span class="sim-badge-demo">3 Categories Decided</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem;">
            <!-- Category 1: Stay -->
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem;">
              <div class="kicker" style="color: var(--m);">Category 01 &bull; Stay</div>
              <h4 style="font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: 0.75rem;">Accommodation</h4>

              <div style="background: var(--sun); border: 1.5px solid var(--ink); border-radius: 14px; padding: 0.75rem; margin-bottom: 0.6rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem;">
                  <span>🌿 Heritage Homestay (AC)</span>
                  <span style="color: var(--ink);">4 Votes</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--ink); margin-top: 2px;">₹2,400 / person (3 nights) &bull; Maya, Aarav, Riya, Ananya</div>
              </div>

              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 0.75rem; opacity: 0.6;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span>Cliffside Luxury Villa</span>
                  <span>1 Vote (Maya)</span>
                </div>
                <div style="font-size: 0.72rem; color: var(--mute);">₹6,000 / person</div>
              </div>
            </div>

            <!-- Category 2: Transport -->
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem;">
              <div class="kicker" style="color: var(--o);">Category 02 &bull; Transit</div>
              <h4 style="font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: 0.75rem;">Travel Mode</h4>

              <div style="background: var(--sun); border: 1.5px solid var(--ink); border-radius: 14px; padding: 0.75rem; margin-bottom: 0.6rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem;">
                  <span>🚂 Overnight Express Train</span>
                  <span style="color: var(--ink);">5 Votes</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--ink); margin-top: 2px;">₹1,200 / person return &bull; 100% Unanimous!</div>
              </div>

              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 0.75rem; opacity: 0.6;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span>Flights to Goa + Cab</span>
                  <span>0 Votes</span>
                </div>
                <div style="font-size: 0.72rem; color: var(--mute);">₹5,000 / person (Rejected as overpriced)</div>
              </div>
            </div>

            <!-- Category 3: Activities -->
            <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.25rem;">
              <div class="kicker" style="color: var(--g);">Category 03 &bull; Experiences</div>
              <h4 style="font-family: var(--font-serif); font-size: 1.3rem; margin-bottom: 0.75rem;">Activities</h4>

              <div style="background: var(--sun); border: 1.5px solid var(--ink); border-radius: 14px; padding: 0.75rem; margin-bottom: 0.6rem;">
                <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.88rem;">
                  <span>🛵 Scooters + Beach Trek</span>
                  <span style="color: var(--ink);">5 Votes</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--ink); margin-top: 2px;">₹1,100 / person &bull; Kabir leads 5-beach trek</div>
              </div>

              <div style="background: #ffffff; border: 1px solid var(--border-color); border-radius: 14px; padding: 0.75rem; opacity: 0.6;">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span>Yacht Cruise</span>
                  <span>0 Votes</span>
                </div>
                <div style="font-size: 0.72rem; color: var(--mute);">₹3,000 / person</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // STAGE 5: THE COMPROMISE
  // -------------------------------------------------------------
  {
    index: 5,
    title: "Stage 5 — The Compromise",
    kicker: "05 · Reaching Alignment",
    headline: "“₹6,700 total per person. Does this work for everyone?”",
    description: "Ananya synthesizes the winning votes into a single concrete proposal. Maya gets aesthetic charm and AC; Aarav and Riya stay safely within budget.",
    playerStates: {
      aarav: { status: "Agreed: ₹6,700 total", thought: "₹700 over my initial ₹6k hope, but includes AC and all activities. Sold." },
      maya: { status: "Agreed: Loved homestay pictures", thought: "The Portuguese villa with private garden is actually more aesthetic than a sterile hotel!" },
      riya: { status: "Relieved: Under ₹7,000 limit!", thought: "My secret limit was ₹7k and this is ₹6.7k! I can do this without any financial stress." },
      kabir: { status: "Hyped: Trek locked", thought: "Scooter beach hop on Om beach is going to be unforgettable." },
      ananya: { status: "Consensus reached!", thought: "All 5 gave green thumbs-up! Not a single person had to drop out." }
    },
    render(container, state) {
      container.innerHTML = `
        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.5rem; align-items: start;">
          <!-- Proposal Card in Forest Green -->
          <div style="background: var(--g); color: #ffffff; border-radius: var(--r-card, 28px); border: 2px solid var(--ink); padding: 2rem; box-shadow: 6px 6px 0px var(--ink);">
            <div class="kicker" style="color: var(--sun); opacity: 1; margin-bottom: 0.5rem;">✦ The Negotiated Plan</div>
            <h3 style="font-family: var(--font-serif); font-size: clamp(28px, 3.5vw, 38px); margin: 0 0 0.5rem 0; color: #ffffff;">
              Gokarna Heritage Getaway
            </h3>
            <div style="font-family: var(--font-serif); font-size: 3rem; color: var(--sun); line-height: 1; margin: 0.75rem 0 1.25rem 0;">
              ₹6,700 <span style="font-size: 1.1rem; font-family: var(--font-sans); color: #ffffff; opacity: 0.85;">/ person all-inclusive</span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.9rem; border-top: 1px solid rgba(255,255,255,0.25); padding-top: 1rem;">
              <div style="display: flex; justify-content: space-between;">
                <span>Stay (Portuguese Homestay, AC, 3 nights):</span>
                <strong>₹2,400</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Transit (Express 3-Tier AC Sleeper Return):</span>
                <strong>₹1,200</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Local Transit (Rented Scooters + Fuel):</span>
                <strong>₹600</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Experiences (Guided 5-Beach Trek & Ferry):</span>
                <strong>₹500</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Food & Beach Cafe Pool (₹500/day):</span>
                <strong>₹2,000</strong>
              </div>
            </div>
          </div>

          <!-- Player Verdict Chips -->
          <div>
            <div class="kicker" style="color: var(--m); margin-bottom: 0.5rem;">Player Consensus Responses</div>
            <div style="display: flex; flex-direction: column; gap: 0.65rem;">
              <div style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 16px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: var(--ink);">Aarav (Budget Optimizer)</strong>
                  <span style="color: var(--g); font-weight: 800;">✓ Accepted</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--mute);">“₹6,700 is totally reasonable for AC travel and stay. I'm 100% in.”</div>
              </div>

              <div style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 16px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: var(--ink);">Maya (Comfort Seeker)</strong>
                  <span style="color: var(--g); font-weight: 800;">✓ Accepted</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--mute);">“The garden veranda and heritage tiles are gorgeous. So happy we didn't do dorms!”</div>
              </div>

              <div style="background: var(--sun); border: 1.5px solid var(--ink); border-radius: 16px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: var(--ink);">Riya (Private Saver)</strong>
                  <span style="color: var(--g); font-weight: 800;">✓ Accepted (Relieved)</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--ink); font-weight: 600;">“Came in right under my internal ceiling. Can't wait for the beach walk!”</div>
              </div>

              <div style="background: #ffffff; border: 1.5px solid var(--border-color); border-radius: 16px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                  <strong style="color: var(--ink);">Kabir & Ananya</strong>
                  <span style="color: var(--g); font-weight: 800;">✓ Accepted</span>
                </div>
                <div style="font-size: 0.82rem; color: var(--mute);">“Everything booked and locked. Nobody felt forced or left out.”</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // STAGE 6: PLANNING THE ITINERARY
  // -------------------------------------------------------------
  {
    index: 6,
    title: "Stage 6 — Planning the Itinerary",
    kicker: "06 · Shared Schedule",
    headline: "“4 Days in Gokarna: From Sunrise Trek to Beach Bonfire.”",
    description: "The group maps their four days into an actionable schedule balancing Maya's chill time with Kabir's adventure cravings.",
    playerStates: {
      aarav: { status: "Reviewed train & tickets", thought: "Train PNR confirmed. Total stay advance paid without surprise fees." },
      maya: { status: "Booked Kudle sunset cafe", thought: "Day 1 cafe dinner and Day 3 beach sunset look dreamy." },
      riya: { status: "Looking forward to Day 2 trek", thought: "Free coastal trek means zero surprise extra costs!" },
      kabir: { status: "Route planned for scooters", thought: "Mirjan Fort + Yana Rocks ride on Day 3 is going to be legendary." },
      ananya: { status: "Shared packing checklist", thought: "Group momentum is at 100%. Everything is smooth." }
    },
    render(container, state) {
      container.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1rem;">
            <div>
              <div class="kicker" style="color: var(--o); margin-bottom: 0.35rem;">Itinerary Blueprint</div>
              <h3 style="font-family: var(--font-serif); font-size: 1.6rem; margin: 0;">4-Day Shared Schedule (Oct 23 – 26)</h3>
            </div>
            <span class="sim-badge-demo">Balanced Pacing</span>
          </div>

          <div class="sim-itinerary-grid">
            <!-- Day 1 -->
            <div class="sim-itinerary-card">
              <span class="sim-itinerary-day-badge">Day 1 &bull; Friday</span>
              <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0;">Arrival & Coastal Sunset</h4>
              <p style="font-size: 0.82rem; color: var(--mute); line-height: 1.45; margin: 0;">
                Morning arrival via Konkan train. Check-in at Heritage Homestay. Afternoon chill at Kudle Beach, fresh coconut water, and dinner at sunset cafe.
              </p>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--ink); margin-top: auto;">☕ Maya's favorite pick</div>
            </div>

            <!-- Day 2 -->
            <div class="sim-itinerary-card">
              <span class="sim-itinerary-day-badge">Day 2 &bull; Saturday</span>
              <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0;">Five Beach Cliff Trek</h4>
              <p style="font-size: 0.82rem; color: var(--mute); line-height: 1.45; margin: 0;">
                Early trek from Belekan to Paradise, Half Moon & Om Beach. Rocky cliff views, ocean swimming, local fish thali lunch, and evening bonfire at stay.
              </p>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--ink); margin-top: auto;">🥾 Kabir's adventure lead</div>
            </div>

            <!-- Day 3 -->
            <div class="sim-itinerary-card">
              <span class="sim-itinerary-day-badge">Day 3 &bull; Sunday</span>
              <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0;">Scooter Ride & Fort</h4>
              <p style="font-size: 0.82rem; color: var(--mute); line-height: 1.45; margin: 0;">
                Pick up vintage scooters. Scenic 22km coastal road trip to 16th-century Mirjan Fort. Afternoon swim at Nirvana Beach. Seafood feast dinner.
              </p>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--ink); margin-top: auto;">🛵 Shared transport win</div>
            </div>

            <!-- Day 4 -->
            <div class="sim-itinerary-card">
              <span class="sim-itinerary-day-badge">Day 4 &bull; Monday</span>
              <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin: 0;">Temple Town & Return</h4>
              <p style="font-size: 0.82rem; color: var(--mute); line-height: 1.45; margin: 0;">
                Morning stroll through ancient temple lanes, filter coffee, masala dosa breakfast, souvenir spice shopping, and 3:30 PM scenic return train.
              </p>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--ink); margin-top: auto;">🚆 Smooth departure home</div>
            </div>
          </div>
        </div>
      `;
    }
  },

  // -------------------------------------------------------------
  // STAGE 7: THE FINAL RESULT
  // -------------------------------------------------------------
  {
    index: 7,
    title: "Stage 7 — The Final Result",
    kicker: "07 · Consensus Synthesis",
    headline: "“Trip Successfully Planned: The 5-Way Win.”",
    description: "Every player's private spending limit was respected, everyone's top constraint was solved, and the group trip actually left the group chat.",
    playerStates: {
      aarav: { status: "100% Satisfied: Under ₹7k", thought: "Kept under budget, didn't overpay for flights. 5/5 stars." },
      maya: { status: "100% Satisfied: Aesthetic AC stay", thought: "The Portuguese villa was so charming. Clean private baths!" },
      riya: { status: "100% Satisfied: Zero financial stress", thought: "I didn't have to feel awkward once. Best weekend ever." },
      kabir: { status: "100% Satisfied: Epic coastal trek", thought: "Five beach trek was insane. Would do it again tomorrow." },
      ananya: { status: "100% Satisfied: Group united", thought: "Nobody dropped out. That's the real victory." }
    },
    render(container, state) {
      container.innerHTML = `
        <div>
          <!-- Big Result Hero Card -->
          <div style="background: var(--lavender); border: 2px solid var(--ink); border-radius: var(--r-card, 28px); padding: 2rem; box-shadow: 6px 6px 0px var(--blue); margin-bottom: 1.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem;">
              <div>
                <span class="kicker" style="color: var(--ink); opacity: 0.85;">✦ Final Trip Verdict</span>
                <h3 style="font-family: var(--font-serif); font-size: clamp(32px, 4.5vw, 48px); margin: 0.25rem 0 0.5rem 0; color: var(--ink);">
                  Gokarna Coastal Escape &bull; Oct 23–26
                </h3>
                <p style="color: var(--ink); opacity: 0.85; font-size: 1rem; margin: 0; max-width: 600px;">
                  4 Days &bull; 5 Friends &bull; All private constraints honored &bull; 100% Consensus Outcome
                </p>
              </div>

              <div style="text-align: right; background: #ffffff; border: 2px solid var(--ink); border-radius: 20px; padding: 1rem 1.5rem; box-shadow: 4px 4px 0px var(--ink);">
                <div class="kicker" style="margin-bottom: 2px;">Final Cost / Person</div>
                <div style="font-family: var(--font-serif); font-size: 2.8rem; line-height: 1; color: var(--g);">₹6,700</div>
                <div style="font-size: 0.78rem; font-weight: 700; color: var(--mute);">Total: ₹33,500</div>
              </div>
            </div>
          </div>

          <!-- 5 Player Satisfaction Grid -->
          <div class="kicker" style="color: var(--o); margin-bottom: 0.5rem;">Player Satisfaction & Constraint Audit</div>
          <div class="sim-sat-grid">
            <div class="sim-sat-card">
              <strong>Aarav</strong>
              <div class="sim-sat-score">4.9 ★</div>
              <div style="font-size: 0.75rem; color: var(--g); font-weight: 800; margin-bottom: 0.35rem;">✓ Budget Honored</div>
              <div style="font-size: 0.78rem; color: var(--mute); font-style: italic;">“Kept under ₹7k with zero surprise taxes.”</div>
            </div>

            <div class="sim-sat-card">
              <strong>Maya</strong>
              <div class="sim-sat-score">4.8 ★</div>
              <div style="font-size: 0.75rem; color: var(--g); font-weight: 800; margin-bottom: 0.35rem;">✓ Comfort Met</div>
              <div style="font-size: 0.78rem; color: var(--mute); font-style: italic;">“Heritage homestay was so cozy and clean.”</div>
            </div>

            <div class="sim-sat-card" style="border: 2px solid var(--ink); background: var(--sun);">
              <strong>Riya</strong>
              <div class="sim-sat-score" style="color: var(--ink);">5.0 ★</div>
              <div style="font-size: 0.75rem; color: var(--ink); font-weight: 800; margin-bottom: 0.35rem;">✓ Secret Limit Kept</div>
              <div style="font-size: 0.78rem; color: var(--ink); font-style: italic;">“Never felt embarrassed. Total budget win!”</div>
            </div>

            <div class="sim-sat-card">
              <strong>Kabir</strong>
              <div class="sim-sat-score">5.0 ★</div>
              <div style="font-size: 0.75rem; color: var(--g); font-weight: 800; margin-bottom: 0.35rem;">✓ Adventure Met</div>
              <div style="font-size: 0.78rem; color: var(--mute); font-style: italic;">“Trek and scooter ride were top tier.”</div>
            </div>

            <div class="sim-sat-card">
              <strong>Ananya</strong>
              <div class="sim-sat-score">5.0 ★</div>
              <div style="font-size: 0.75rem; color: var(--g); font-weight: 800; margin-bottom: 0.35rem;">✓ Mediator Win</div>
              <div style="font-size: 0.78rem; color: var(--mute); font-style: italic;">“All 5 friends travelled together without drama.”</div>
            </div>
          </div>

          <!-- Pedagogical Takeaway Box -->
          <div style="background: var(--paper); border: 1.5px solid var(--border-color); border-radius: 20px; padding: 1.5rem; margin-top: 1.5rem;">
            <h4 style="font-family: var(--font-serif); font-size: 1.4rem; margin-bottom: 0.5rem;">
              Why Did This Group Trip Succeed Where 70.5% Fail?
            </h4>
            <p style="font-size: 0.95rem; color: var(--mute); line-height: 1.55; margin-bottom: 1.25rem;">
              Most group trips fail because members stay silent when budgets or dates pinch them, leading to delayed replies and eventual dropouts. By decoupling personal comfort ceilings from group negotiation, the group discovered the ₹6,700 sweet spot where everyone felt heard and respected.
            </p>

            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
              <button id="sim-replay-btn" class="btn btn-primary" style="padding: 0.85rem 1.75rem; border-radius: 99px;">
                🔄 Replay Simulation
              </button>
              <a href="/" class="btn btn-secondary" style="padding: 0.85rem 1.75rem; border-radius: 99px;">
                ← Back to Homepage
              </a>
            </div>
          </div>
        </div>
      `;

      document.getElementById('sim-replay-btn')?.addEventListener('click', () => {
        window.simulationController.setStage(1);
      });
    }
  }
];

class SimulationController {
  constructor() {
    this.currentStageIndex = 1;
    this.isPlaying = false;
    this.playbackSpeed = 1; // 1 = 4.5s per step, 2 = 2.25s per step
    this.timer = null;
    this.selectedPlayerId = null; // null = all players
  }

  init() {
    this.renderTimeline();
    this.renderPlayerDock();
    this.renderStage();
    this.attachControls();
  }

  renderTimeline() {
    const timelineEl = document.getElementById('sim-timeline-track');
    if (!timelineEl) return;

    timelineEl.innerHTML = SIMULATION_STAGES.map(s => {
      let stateClass = "";
      if (s.index === this.currentStageIndex) stateClass = "active";
      else if (s.index < this.currentStageIndex) stateClass = "completed";

      return `
        <div class="sim-stage-step ${stateClass}" data-stage="${s.index}">
          <span class="sim-stage-num">${s.index < this.currentStageIndex ? '✓' : s.index}</span>
          <span>${s.title.split('—')[1]?.trim() || s.title}</span>
        </div>
      `;
    }).join('');

    timelineEl.querySelectorAll('.sim-stage-step').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const stage = parseInt(btn.getAttribute('data-stage'), 10);
        this.pause();
        this.setStage(stage);
      });
    });
  }

  renderPlayerDock() {
    const dockEl = document.getElementById('sim-players-dock');
    if (!dockEl) return;

    const currentStage = SIMULATION_STAGES[this.currentStageIndex - 1];

    dockEl.innerHTML = SIMULATION_PLAYERS.map(p => {
      const isFeatured = this.selectedPlayerId === p.id;
      const isDimmed = this.selectedPlayerId && this.selectedPlayerId !== p.id;
      const pState = currentStage.playerStates[p.id] || { status: "Active", thought: "" };

      return `
        <div class="sim-player-card ${isFeatured ? 'featured' : ''} ${isDimmed ? 'dimmed' : ''}" data-player-id="${p.id}">
          <div class="sim-player-avatar">
            ${p.avatarSvg}
          </div>
          <div class="sim-player-name">${p.name}</div>
          <div class="sim-player-role-tag">${p.role}</div>
          <div class="sim-status-pill" title="${pState.status}">
            ${pState.status}
          </div>
          ${p.id === 'riya' && this.currentStageIndex >= 3 ? `
            <span class="sim-private-pill" title="Private ceiling ₹7k never leaked to group chat">🤫 Limit Private</span>
          ` : ''}
        </div>
      `;
    }).join('');

    dockEl.querySelectorAll('.sim-player-card').forEach(card => {
      card.addEventListener('click', () => {
        const pId = card.getAttribute('data-player-id');
        this.setPlayerFilter(this.selectedPlayerId === pId ? null : pId);
      });
    });
  }

  renderStage() {
    const canvasEl = document.getElementById('sim-stage-content');
    if (!canvasEl) return;

    const stage = SIMULATION_STAGES[this.currentStageIndex - 1];
    if (!stage) return;

    // Header kicker & titles
    document.getElementById('sim-stage-kicker').innerHTML = stage.kicker;
    document.getElementById('sim-stage-title').textContent = stage.title;
    document.getElementById('sim-stage-subtext').textContent = stage.description;

    // Render Stage Body
    stage.render(canvasEl, this);

    // Update Player Filter highlights if any
    this.updatePlayerFocus();
  }

  setPlayerFilter(pId) {
    this.selectedPlayerId = pId;
    this.renderPlayerDock();
    this.updatePlayerFocus();

    // Update filter chip UI
    document.querySelectorAll('.sim-filter-chip').forEach(chip => {
      const target = chip.getAttribute('data-filter');
      chip.classList.toggle('active', (target === 'all' && !pId) || target === pId);
    });
  }

  updatePlayerFocus() {
    if (!this.selectedPlayerId) return;
    const player = SIMULATION_PLAYERS.find(p => p.id === this.selectedPlayerId);
    if (!player) return;

    // If a player is selected, highlight their presence in the stage
    const currentStage = SIMULATION_STAGES[this.currentStageIndex - 1];
    const pState = currentStage.playerStates[player.id];

    let focusBanner = document.getElementById('sim-player-focus-banner');
    if (!focusBanner) {
      focusBanner = document.createElement('div');
      focusBanner.id = 'sim-player-focus-banner';
      focusBanner.style.cssText = 'background: var(--sun); border: 1.5px solid var(--ink); border-radius: 16px; padding: 0.85rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;';
      const canvasEl = document.getElementById('sim-stage-content');
      canvasEl.insertBefore(focusBanner, canvasEl.firstChild);
    }

    focusBanner.innerHTML = `
      <div>
        <div style="font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink);">
          🔍 Focus Mode &bull; ${player.name} (${player.role})
        </div>
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--ink); margin-top: 2px;">
          ${pState?.thought ? `Private Thought: “${pState.thought}”` : player.defaultQuote}
        </div>
      </div>
      <button id="sim-clear-focus-btn" style="background: none; border: 1.5px solid var(--ink); border-radius: 99px; padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 700; cursor: pointer;">
        Clear Filter ✕
      </button>
    `;

    document.getElementById('sim-clear-focus-btn')?.addEventListener('click', () => {
      this.setPlayerFilter(null);
    });
  }

  setStage(stageNum) {
    this.currentStageIndex = Math.max(1, Math.min(SIMULATION_STAGES.length, stageNum));
    this.renderTimeline();
    this.renderPlayerDock();
    this.renderStage();

    // Update prev/next button disabled states
    const prevBtn = document.getElementById('sim-prev-btn');
    const nextBtn = document.getElementById('sim-next-btn');
    if (prevBtn) prevBtn.disabled = this.currentStageIndex === 1;
    if (nextBtn) nextBtn.disabled = this.currentStageIndex === SIMULATION_STAGES.length;
  }

  next() {
    if (this.currentStageIndex < SIMULATION_STAGES.length) {
      this.setStage(this.currentStageIndex + 1);
    } else {
      this.pause();
    }
  }

  prev() {
    if (this.currentStageIndex > 1) {
      this.setStage(this.currentStageIndex - 1);
    }
  }

  play() {
    this.isPlaying = true;
    const playBtn = document.getElementById('sim-play-btn');
    if (playBtn) {
      playBtn.innerHTML = `<span>⏸</span> Pause`;
      playBtn.classList.add('active');
    }

    if (this.timer) clearInterval(this.timer);
    const intervalMs = this.playbackSpeed === 2 ? 2200 : 4400;

    this.timer = setInterval(() => {
      if (this.currentStageIndex >= SIMULATION_STAGES.length) {
        this.pause();
      } else {
        this.next();
      }
    }, intervalMs);
  }

  pause() {
    this.isPlaying = false;
    const playBtn = document.getElementById('sim-play-btn');
    if (playBtn) {
      playBtn.innerHTML = `<span>▶</span> Play`;
      playBtn.classList.remove('active');
    }
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  togglePlay() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  setSpeed(speed) {
    this.playbackSpeed = speed;
    document.querySelectorAll('.sim-speed-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.getAttribute('data-speed'), 10) === speed);
    });
    if (this.isPlaying) {
      this.play(); // restart timer with new interval
    }
  }

  restart() {
    this.pause();
    this.setPlayerFilter(null);
    this.setStage(1);
  }

  attachControls() {
    document.getElementById('sim-play-btn')?.addEventListener('click', () => this.togglePlay());
    document.getElementById('sim-next-btn')?.addEventListener('click', () => {
      this.pause();
      this.next();
    });
    document.getElementById('sim-prev-btn')?.addEventListener('click', () => {
      this.pause();
      this.prev();
    });
    document.getElementById('sim-restart-btn')?.addEventListener('click', () => this.restart());

    document.querySelectorAll('.sim-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseInt(btn.getAttribute('data-speed'), 10);
        this.setSpeed(speed);
      });
    });

    document.querySelectorAll('.sim-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.getAttribute('data-filter');
        this.setPlayerFilter(filter === 'all' ? null : filter);
      });
    });
  }
}

// Global hook
window.initSimulation = function() {
  window.simulationController = new SimulationController();
  window.simulationController.init();
};
