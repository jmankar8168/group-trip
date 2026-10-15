/**
 * Simulation Mode Engine · "Plan a Trip in 2 Minutes"
 * High-fidelity, deterministic bot simulation engine.
 * Emits append-only timestamped events on a single stream.
 */

const {
  CALENDAR_DAYS,
  ALL_WINDOWS,
  dealSolvableRound,
  checkPlayerDateAvailability,
  validatePlan,
  computeTripBudget,
  scheduleRoundTwists
} = require('./solver.js');

// Seeded PRNG: Mulberry32
function createPRNG(seed) {
  let s = typeof seed === 'number' ? seed : hashString(String(seed || 'trip_sim_seed'));
  return function next() {
    s |= 0;
    s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
}

// Bot Communication Styles
const BOT_COMMUNICATION_STYLES = {
  DOMINANT: {
    key: 'Dominant',
    label: 'Dominant',
    desc: 'Pushes one specific plan, speaks early, defends choice vigorously',
    talkativeness: 0.85,
    disclosureRate: 0.85, // Discloses early
    initialDelayRange: [2, 5],
    proposeTendency: 0.75
  },
  AGREEABLE: {
    key: 'Agreeable',
    label: 'Agreeable',
    desc: 'Goes along with group, hides objections until very late',
    talkativeness: 0.55,
    disclosureRate: 0.20, // Hides dealbreakers!
    initialDelayRange: [4, 9],
    proposeTendency: 0.15
  },
  SILENT: {
    key: 'Silent',
    label: 'Silent',
    desc: 'Reads, rarely speaks, keeps dealbreakers strictly private',
    talkativeness: 0.20,
    disclosureRate: 0.10, // Extreme private keeper
    initialDelayRange: [8, 14],
    proposeTendency: 0.05
  },
  ANALYTICAL: {
    key: 'Analytical',
    label: 'Analytical',
    desc: 'Tests calendar dates & prices first before saying a word',
    talkativeness: 0.65,
    disclosureRate: 0.60,
    initialDelayRange: [3, 7],
    proposeTendency: 0.50
  },
  CHAOTIC: {
    key: 'Chaotic',
    label: 'Chaotic',
    desc: 'Changes mind randomly, sends spontaneous links, unpredictable votes',
    talkativeness: 0.90,
    disclosureRate: 0.50,
    initialDelayRange: [1, 4],
    proposeTendency: 0.60
  },
  PEACEMAKER: {
    key: 'Peacemaker',
    label: 'Peacemaker',
    desc: 'Proposes middle grounds, tries to accommodate everyone',
    talkativeness: 0.75,
    disclosureRate: 0.70,
    initialDelayRange: [4, 8],
    proposeTendency: 0.55
  }
};

// Natural chat message templates by communication style & state
const CHAT_TEMPLATES = {
  IDEA_START: {
    Dominant: [
      "Guys, we're definitely going to {dest}! Flights are cheap right now.",
      "Pack your bags for {dest}. I've already shortlisted our route.",
      "No debates, {dest} is the only right option this month!"
    ],
    Agreeable: [
      "Hey everyone! Honestly {dest} sounds really fun, whatever you guys prefer.",
      "I'm super flexible! Just happy to finally get away from work.",
      "Yes! Count me in for whatever the majority decides."
    ],
    Silent: [
      "Hey... let me check my leaves first.",
      "Checking calendar.",
      "Looking at options now."
    ],
    Analytical: [
      "Let's check the date windows first before locking destinations.",
      "Testing date availability on the calendar. What weekend are we looking at?",
      "Need to calculate the total budget per person before we get excited."
    ],
    Chaotic: [
      "WHATSAPP GROUP IS ALIVE!! What about {dest}?? Or Rishikesh rafting??",
      "Just saw this crazy travel reel for {dest}! Let's book right now!!",
      "Guys what if we take a road trip instead? Or sleeper bus??"
    ],
    Peacemaker: [
      "Let's see what everyone's preferences and budgets are first!",
      "Excited for this! Let's make sure we find dates that work for all 5 of us.",
      "I can help coordinate! Let's vote on top destinations."
    ]
  },
  DATE_OPINION: {
    works: {
      Dominant: ["Weekend {dateStr} works for me. Let's lock this right now.", "{dateStr} is perfect. Anyone who disagrees?"],
      Agreeable: ["Yeah, {dateStr} works for me too!", "{dateStr} looks totally fine."],
      Silent: ["{dateStr} is fine for me."],
      Analytical: ["Checked {dateStr}: all my leave buffers are clear.", "{dateStr} fits the 3-day window."],
      Chaotic: ["{dateStr} sounds fire!! Let's do it!", "I can make {dateStr} work!"],
      Peacemaker: ["Great, {dateStr} seems to suit most of us!", "Looks like {dateStr} has good availability."]
    },
    conflict_revealed: {
      Dominant: ["I CANNOT do {dateStr}. Unmovable client meeting. Shift it.", "{dateStr} is completely out for me. Pick another weekend."],
      Agreeable: ["Um, sorry guys... I might have a small issue on {dateStr} 🙈", "Is there any other weekend besides {dateStr}?"],
      Silent: ["Can't do {dateStr}. Office leave rejected.", "{dateStr} doesn't work."],
      Analytical: ["Calendar check failed for {dateStr}: conflict with leave policy.", "{dateStr} clashes with my hard constraints."],
      Chaotic: ["Wait wait no! Sister's wedding event on {dateStr}! Cannot do!", "Bro {dateStr} is cursed for me, pick another!"],
      Peacemaker: ["Looks like {dateStr} is clashing for some of us. Let's check the next weekend?", "Let's find a date where nobody has to take unpaid leave."]
    },
    conflict_hidden: {
      Agreeable: ["Haha {dateStr} is interesting... maybe we check another one too?", "Let's keep looking at a few more dates just in case!"],
      Silent: ["...", "Let's see.", "Still checking."],
      Chaotic: ["Wait, maybe? Actually not sure yet lol.", "Let me check... wait what about the weekend after?"]
    }
  },
  BUDGET_REACTION: {
    Dominant: ["Let's not be cheap, comfortable AC cabs are non-negotiable.", "If we're going, we do it properly. Budget can stretch."],
    Agreeable: ["Yeah, sounds reasonable... (hope it doesn't cross my limit)", "Whatever budget the group agrees on is okay with me."],
    Silent: ["Keep it under {budgetCap} please.", "Flights might be too costly."],
    Analytical: ["Total estimated per-person cost is crossing ₹{estCost}. We need to trim transport.", "Train saves ₹3,500 per head compared to flights."],
    Chaotic: ["YOLO guys! Money will come back, memories won't!!", "Let's just split everything equally on Splitwise later!"],
    Peacemaker: ["Let's pick a nice homestay so we get comfort without blowing everyone's budget.", "We can take a scenic train and spend more on good food."]
  },
  PROPOSAL_REACTION_BLOCKED: {
    Dominant: ["Who blocked that?! Which constraint broke? Tell us now!", "Arre यार! Who has the issue with this plan?"],
    Agreeable: ["Oh no... was it my dates? Sorry guys! 🙈", "Aww man, so close! Let's adjust."],
    Silent: ["I told you earlier that date doesn't work.", "Budget was too high."],
    Analytical: ["Validator rejected: {dealbreaker}. Let's fix that exact constraint.", "We violated: {dealbreaker}. Changing parameter."],
    Chaotic: ["NOOO! Who is the culprit?! Own up in the chat! 😂", "This is why group trips never happen haha!"],
    Peacemaker: ["Don't worry, we have plenty of time. Let's fix the {category} issue and submit again.", "We just need to tweak one thing and we'll have it."]
  },
  TRIP_LOCKED: {
    Dominant: ["BOOM! TRIP LOCKED! Told you guys we could pull this off!", "Let's goooo! Pack your bags!"],
    Agreeable: ["Yayyy! So excited! Can't wait for this getaway!", "We actually did it! Best group ever!"],
    Silent: ["Glad that worked out.", "See you guys at the station."],
    Analytical: ["100% valid plan confirmed by server. All constraints satisfied.", "Optimal route secured."],
    Chaotic: ["WE BEAT THE 2-MINUTE TIMER!! GOA/GOKARNA HERE WE COME! 🔥🎉", "VADA PAV PARTY ON ARRIVAL!!"],
    Peacemaker: ["Everyone's happy and all budgets respected! Great teamwork everyone!", "So glad we found a plan that works for all of us!"]
  },
  TWIST_REACTION: {
    Dominant: ["WHAT?! Plot twist just dropped on me: {twistText}. We need to pivot NOW.", "Just got an alert: {twistText}! Changing my vote."],
    Agreeable: ["Oh no... guys I just got hit with a twist: {twistText} 😭", "Sorry everyone, my constraints just got changed by the host!"],
    Silent: ["Twist: {twistText}. Dates need to change.", "Can't do this anymore. Twist."],
    Analytical: ["Plot twist event logged: {twistText}. Re-evaluating date suitability.", "Constraint modified. Recomputing valid windows."],
    Chaotic: ["BRO WHAT IS THIS PLOT TWIST?! {twistText}!! The universe is conspiring against us! 😱", "RIP OUR PLAN! New twist alert!"],
    Peacemaker: ["Don't panic! Twist happened ({twistText}), let's quickly adjust our itinerary.", "We can still make this work, let's recalibrate."]
  }
};

// Scenario presets
const SCENARIO_PRESETS = {
  CHAOTIC: {
    key: 'Chaotic',
    name: 'Chaotic (High Friction)',
    description: 'Conflicting dominant and silent bots, low disclosure, frequent misunderstandings. Most tables fail.',
    targetGolden: 1,
    disclosureModifier: 0.35, // Bots hold back secrets
    twistCount: 3,
    difficulty: 'hard'
  },
  REALISTIC: {
    key: 'Realistic',
    name: 'Realistic (Classroom Benchmark)',
    description: 'Balanced mix of styles, natural friction, 10–25% success rate as seen in real classes.',
    targetGolden: 2,
    disclosureModifier: 0.55,
    twistCount: 2,
    difficulty: 'medium'
  },
  SMOOTH: {
    key: 'Smooth',
    name: 'Smooth (High Alignment)',
    description: 'High peacemaker and analytical ratio, rapid disclosure, easy dates. Most tables succeed.',
    targetGolden: 3,
    disclosureModifier: 0.90, // Bots disclose early
    twistCount: 1,
    difficulty: 'easy'
  },
  CUSTOM: {
    key: 'Custom',
    name: 'Custom',
    description: 'User-configured tables, speed, and rules.',
    targetGolden: 2,
    disclosureModifier: 0.60,
    twistCount: 2,
    difficulty: 'medium'
  }
};

class SimulationEngine {
  constructor(options = {}) {
    this.id = options.id || `sim_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.seed = options.seed !== undefined ? options.seed : 42;
    this.rng = createPRNG(this.seed);
    this.scenarioKey = options.scenario || 'REALISTIC';
    this.scenario = SCENARIO_PRESETS[this.scenarioKey] || SCENARIO_PRESETS.REALISTIC;
    this.tableCount = Math.max(1, Math.min(6, options.tableCount || 3));
    this.playersPerTable = Math.max(4, Math.min(6, options.playersPerTable || 5));
    this.speedMultiplier = options.speed || 1.0; // 0.5, 1, 2, 4
    this.durationSeconds = 120; // 120-second official countdown
    this.simTime = this.durationSeconds; // Counts down: 120 -> 0
    this.isPaused = false;
    this.isEnded = false;
    this.status = 'idle'; // 'idle', 'running', 'paused', 'completed'

    // Events stream (Single source of truth)
    this.events = [];
    this.eventIndex = 0;

    // Simulation entities
    this.tables = []; // Array of TableSimulation
    this.allCards = [];
    this.allTwists = [];
    this.destinations = [];
    this.activities = [];

    // Internal loop timer
    this.loopInterval = null;
    this.tickMs = 100; // engine sub-second tick resolution
    this.accumulatedSimSeconds = 0;

    // Listeners for real-time broadcast
    this.onEventCallbacks = [];
    this.onTickCallbacks = [];
    this.onEndCallbacks = [];
  }

  init(cards, twists, destinations, activities) {
    this.allCards = cards || [];
    this.allTwists = twists || [];
    this.destinations = destinations || [];
    this.activities = activities || [];

    const tableNames = [
      'Team Chai ☕', 'Team Maggi 🍜', 'Team Biryani 🍛',
      'Team Samosa 🥟', 'Team Vada Pav 🥪', 'Team Momos 🥟'
    ];

    const botNamePool = [
      'Aarav', 'Maya', 'Riya', 'Kabir', 'Ananya',
      'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Tanvi',
      'Arjun', 'Diya', 'Zoya', 'Aditya', 'Mira',
      'Dev', 'Isha', 'Kunal', 'Tara', 'Samir'
    ];

    const styleKeys = Object.keys(BOT_COMMUNICATION_STYLES);

    // Initialize tables
    for (let t = 0; t < this.tableCount; t++) {
      const tableId = `table_${t + 1}`;
      const tableName = tableNames[t % tableNames.length];
      const botCount = this.playersPerTable;

      // Use solver to deal cards & golden windows
      const roundDeal = dealSolvableRound(
        this.allCards,
        botCount,
        this.scenario.targetGolden,
        this.scenario.difficulty,
        this.destinations
      );

      const tableTwists = scheduleRoundTwists(
        roundDeal.goldenSet,
        roundDeal.dealtCards,
        this.allTwists,
        this.destinations
      );

      // Create Bot instances
      const bots = [];
      for (let b = 0; b < botCount; b++) {
        const botId = `bot_${tableId}_p${b + 1}`;
        const nameIdx = (t * 5 + b) % botNamePool.length;
        const baseName = botNamePool[nameIdx];

        // Assign communication style based on scenario distribution
        let styleKey;
        if (this.scenarioKey === 'CHAOTIC') {
          const chaoticPicks = ['DOMINANT', 'CHAOTIC', 'SILENT', 'DOMINANT'];
          styleKey = chaoticPicks[Math.floor(this.rng() * chaoticPicks.length)];
        } else if (this.scenarioKey === 'SMOOTH') {
          const smoothPicks = ['PEACEMAKER', 'ANALYTICAL', 'AGREEABLE', 'PEACEMAKER'];
          styleKey = smoothPicks[Math.floor(this.rng() * smoothPicks.length)];
        } else {
          // Realistic distribution
          const realisticPicks = ['DOMINANT', 'AGREEABLE', 'SILENT', 'ANALYTICAL', 'PEACEMAKER', 'CHAOTIC'];
          styleKey = realisticPicks[b % realisticPicks.length];
        }

        const commStyle = BOT_COMMUNICATION_STYLES[styleKey] || BOT_COMMUNICATION_STYLES.AGREEABLE;
        const roleCard = roundDeal.dealtCards[b];
        const dateRule = roundDeal.playerRules[b];

        // Seeded disclosure threshold: when simTime reaches this, bot reveals real constraints
        // E.g. Dominant reveals at ~100s remaining; Silent might reveal at ~20s or never (< 0)
        let revealTimeSeconds;
        if (commStyle.key === 'DOMINANT' || commStyle.key === 'ANALYTICAL') {
          revealTimeSeconds = 110 - Math.floor(this.rng() * 20); // 90-110s remaining
        } else if (commStyle.key === 'PEACEMAKER') {
          revealTimeSeconds = 95 - Math.floor(this.rng() * 25); // 70-95s remaining
        } else if (commStyle.key === 'CHAOTIC') {
          revealTimeSeconds = 80 - Math.floor(this.rng() * 35); // 45-80s remaining
        } else if (commStyle.key === 'AGREEABLE') {
          // Hides until under 35 seconds!
          revealTimeSeconds = 35 - Math.floor(this.rng() * 25);
        } else {
          // SILENT: Reveals only in extreme crisis (under 15s) or never (40% never)
          revealTimeSeconds = this.rng() > 0.4 ? (18 - Math.floor(this.rng() * 15)) : -1;
        }

        bots.push({
          id: botId,
          nickname: `${baseName}`,
          tableId,
          roleCard,
          dateRule,
          style: commStyle,
          revealTimeSeconds,
          revealedConstraints: false,
          activeTwist: null,
          checkedDates: [],
          currentSelections: {
            destination: this.destinations[Math.floor(this.rng() * this.destinations.length)]?.name || 'Gokarna',
            transport: 'train',
            activity: 'sightseeing',
            dates: roundDeal.goldenSet[0] || null
          },
          votes: {}, // proposalId -> 'yes' | 'no'
          thoughts: [],
          activityState: 'idle', // 'idle', 'typing', 'voting'
          typingBuffer: '',
          typingTarget: '',
          typingProgress: 0,
          nextActionSimTime: this.durationSeconds - (commStyle.initialDelayRange[0] + this.rng() * (commStyle.initialDelayRange[1] - commStyle.initialDelayRange[0]))
        });
      }

      this.tables.push({
        id: tableId,
        name: tableName,
        bots,
        goldenWindows: roundDeal.goldenSet,
        activeTwists: [],
        scheduledTwists: tableTwists,
        status: 'Planning', // 'Planning', 'Proposal pending', 'Blocked', 'Locked', 'Failed'
        proposals: [],
        currentProposal: null,
        lockedPlan: null,
        lockedTime: null,
        blockedAttemptsCount: 0,
        blockedCategories: [],
        pettyExcusesBlocked: [],
        chatFeed: [],
        activeTypers: new Set()
      });
    }

    return this;
  }

  // Event appending with dispatch to UI listeners
  emitEvent(type, tableId, playerId, data = {}) {
    const table = this.tables.find(t => t.id === tableId);
    const bot = table ? table.bots.find(b => b.id === playerId) : null;

    const event = {
      id: `ev_${++this.eventIndex}`,
      simTime: Math.round(this.simTime),
      realTimestamp: Date.now(),
      tableId,
      tableName: table ? table.name : 'All Tables',
      playerId,
      playerNick: bot ? bot.nickname : undefined,
      type,
      data
    };

    this.events.push(event);

    // Notify listeners
    this.onEventCallbacks.forEach(cb => {
      try { cb(event); } catch (e) { console.error('Error in event callback:', e); }
    });

    return event;
  }

  start() {
    if (this.status === 'running') return;
    this.status = 'running';
    this.isPaused = false;

    this.emitEvent('round_started', null, null, {
      durationSeconds: this.durationSeconds,
      tableCount: this.tables.length,
      speed: this.speedMultiplier,
      seed: this.seed,
      scenario: this.scenario.name
    });

    // Initial greeting / chat burst per table
    this.tables.forEach(table => {
      // First bot speaks
      const starter = table.bots.find(b => b.style.key === 'DOMINANT' || b.style.key === 'CHAOTIC') || table.bots[0];
      const starterDest = starter.currentSelections.destination;
      const starterMsg = this.pickTemplate(CHAT_TEMPLATES.IDEA_START, starter.style.key, { dest: starterDest });

      starter.typingTarget = starterMsg;
      starter.activityState = 'typing';
      starter.typingProgress = 0;

      this.emitEvent('bot_thought', table.id, starter.id, {
        thought: `Excited to kick off planning for ${starterDest}!`
      });
    });

    this.runLoop();
  }

  pause() {
    this.isPaused = true;
    this.status = 'paused';
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.status = 'running';
    this.runLoop();
  }

  setSpeed(newSpeed) {
    this.speedMultiplier = Math.max(0.25, Math.min(8.0, newSpeed));
    if (this.status === 'running' && !this.isPaused) {
      this.pause();
      this.resume();
    }
  }

  runLoop() {
    if (this.loopInterval) clearInterval(this.loopInterval);

    // Loop fires every 100ms real-time
    this.loopInterval = setInterval(() => {
      if (this.isPaused || this.isEnded) return;

      // Delta simulation seconds based on speed
      const deltaSimSeconds = (this.tickMs / 1000) * this.speedMultiplier;
      this.simTime -= deltaSimSeconds;

      if (this.simTime <= 0) {
        this.simTime = 0;
        this.onTick();
        this.finishRound();
        return;
      }

      // Check plot twists at 1:30 (90s) and 0:45 (45s)
      this.checkPlotTwists();

      // Process bot behaviors
      this.processBots(deltaSimSeconds);

      this.onTick();
    }, this.tickMs);
  }

  onTick() {
    this.onTickCallbacks.forEach(cb => {
      try {
        cb({
          simTime: Math.max(0, Math.round(this.simTime)),
          tables: this.tables.map(t => ({
            id: t.id,
            name: t.name,
            status: t.status,
            activeTypers: Array.from(t.activeTypers),
            lastChat: t.chatFeed.slice(-3),
            blockedAttemptsCount: t.blockedAttemptsCount
          }))
        });
      } catch (e) {
        console.error('Error in tick callback:', e);
      }
    });
  }

  checkPlotTwists() {
    const curSeconds = Math.round(this.simTime);
    // Fire Twist 1 at 90s, Twist 2 at 45s
    [
      { triggerSec: 90, twistIndex: 1 },
      { triggerSec: 45, twistIndex: 2 }
    ].forEach(({ triggerSec, twistIndex }) => {
      if (curSeconds === triggerSec) {
        this.tables.forEach(table => {
          if (table.status === 'Locked') return; // already locked
          const twistKey = `twist_${twistIndex}`;
          if (table.activeTwists.some(t => t.twistIndex === twistIndex)) return; // already fired

          const twist = table.scheduledTwists ? table.scheduledTwists[twistIndex - 1] : null;
          if (!twist) return;

          table.activeTwists.push({ ...twist, twistIndex });
          const targetBot = table.bots[twistIndex % table.bots.length];
          targetBot.activeTwist = twist;

          this.emitEvent('plot_twist_fired', table.id, targetBot.id, {
            twistIndex,
            twistText: twist.description || twist.title,
            targetNickname: targetBot.nickname,
            oldConstraint: targetBot.dateRule ? targetBot.dateRule.title : 'Standard leave',
            newConstraint: twist.description || twist.title
          });

          // Bot thinks about twist
          this.emitEvent('bot_thought', table.id, targetBot.id, {
            thought: `Oh no! Twist hit me: "${twist.title}". Need to pivot our dates or transport immediately!`
          });

          // Schedule prompt reaction message
          targetBot.nextActionSimTime = this.simTime - (1.5 + this.rng() * 3.5);
          targetBot.scheduledReactionType = 'TWIST_REACTION';
        });
      }
    });
  }

  processBots(deltaSimSeconds) {
    this.tables.forEach(table => {
      if (table.status === 'Locked') return;

      // Check if any bot should disclose secret constraints
      table.bots.forEach(bot => {
        if (!bot.revealedConstraints && this.simTime <= bot.revealTimeSeconds) {
          bot.revealedConstraints = true;
          this.emitEvent('bot_thought', table.id, bot.id, {
            thought: `Time is running out! I have to be completely honest about my private constraints now.`
          });
        }
      });

      // 1. Process typing progression for bots currently typing
      table.bots.forEach(bot => {
        if (bot.activityState === 'typing') {
          table.activeTypers.add(bot.nickname);
          // Typing speed ~25 chars per second scaled by speedMultiplier
          const charsToAdd = Math.max(1, Math.round(25 * deltaSimSeconds));
          bot.typingProgress += charsToAdd;

          if (bot.typingProgress >= bot.typingTarget.length) {
            // Typing complete! Send chat message
            const sentText = bot.typingTarget;
            bot.activityState = 'idle';
            bot.typingTarget = '';
            bot.typingProgress = 0;
            table.activeTypers.delete(bot.nickname);

            const messageObj = {
              id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              senderId: bot.id,
              senderNick: bot.nickname,
              senderStyle: bot.style.label,
              text: sentText,
              timestamp: Date.now()
            };

            table.chatFeed.push(messageObj);

            this.emitEvent('chat_sent', table.id, bot.id, {
              messageId: messageObj.id,
              text: sentText,
              senderStyle: bot.style.label
            });

            // Schedule bot's next action
            const delayRange = bot.style.initialDelayRange;
            bot.nextActionSimTime = this.simTime - (delayRange[0] + this.rng() * (delayRange[1] - delayRange[0]));
          } else {
            // Emit typing update throttled
            const partial = bot.typingTarget.substring(0, bot.typingProgress);
            this.emitEvent('chat_typing_update', table.id, bot.id, {
              partialText: partial
            });
          }
        }
      });

      // 2. Process active proposals and votes
      if (table.currentProposal) {
        this.processProposalVoting(table);
      }

      // 3. Process bot turns & decisions
      table.bots.forEach(bot => {
        if (bot.activityState === 'typing') return;
        if (this.simTime > bot.nextActionSimTime) return; // not time yet

        this.botExecuteDecision(table, bot);
      });
    });
  }

  botExecuteDecision(table, bot) {
    // Schedule next turn time
    const delay = bot.style.initialDelayRange[0] + this.rng() * (bot.style.initialDelayRange[1] - bot.style.initialDelayRange[0]);
    bot.nextActionSimTime = this.simTime - delay;

    // React to twist if scheduled
    if (bot.scheduledReactionType === 'TWIST_REACTION' && bot.activeTwist) {
      bot.scheduledReactionType = null;
      const twistMsg = this.pickTemplate(CHAT_TEMPLATES.TWIST_REACTION, bot.style.key, {
        twistText: bot.activeTwist.title || bot.activeTwist.description
      });
      this.startBotTyping(table, bot, twistMsg);
      return;
    }

    // Step A: Calendar Testing (Test a date window on private calendar)
    const testDay = Math.floor(this.rng() * 24) + 1; // days 1..24
    const calResult = checkPlayerDateAvailability(testDay, {
      role: bot.roleCard,
      dateRule: bot.dateRule,
      socketId: bot.id
    }, table.activeTwists, 'mandatory');

    if (!bot.checkedDates.includes(testDay)) {
      bot.checkedDates.push(testDay);
    }

    const dayMeta = CALENDAR_DAYS[testDay - 1] || { short: `Day ${testDay}` };
    const reasonText = (calResult.reasons && calResult.reasons[0]) ? calResult.reasons[0].shortLine : '';

    this.emitEvent('calendar_tap', table.id, bot.id, {
      dayIndex: testDay,
      dateString: dayMeta.short,
      fits: calResult.works,
      reason: reasonText
    });

    this.emitEvent('bot_thought', table.id, bot.id, {
      thought: calResult.works
        ? `Checked ${dayMeta.short}: Fits my personal leave rules.`
        : `Checked ${dayMeta.short}: Conflict! Reason: ${reasonText || 'Violates schedule'}`
    });

    // Step B: Should the bot speak or propose a plan?
    const rand = this.rng();

    // If no active proposal and bot has propose tendency
    if (!table.currentProposal && rand < bot.style.proposeTendency && this.simTime < 100) {
      this.botInitiateProposal(table, bot);
      return;
    }

    // Otherwise speak in chat if talkative enough
    if (rand < bot.style.talkativeness) {
      let chatLine = "";

      // Discuss calendar check
      if (calResult.works) {
        chatLine = this.pickTemplate(CHAT_TEMPLATES.DATE_OPINION.works, bot.style.key, { dateStr: dayMeta.short });
      } else {
        if (bot.revealedConstraints) {
          chatLine = this.pickTemplate(CHAT_TEMPLATES.DATE_OPINION.conflict_revealed, bot.style.key, { dateStr: dayMeta.short });
        } else {
          chatLine = this.pickTemplate(CHAT_TEMPLATES.DATE_OPINION.conflict_hidden, bot.style.key, { dateStr: dayMeta.short });
        }
      }

      if (chatLine) {
        this.startBotTyping(table, bot, chatLine);
      }
    }
  }

  startBotTyping(table, bot, text) {
    bot.activityState = 'typing';
    bot.typingTarget = text;
    bot.typingProgress = 0;
    table.activeTypers.add(bot.nickname);

    this.emitEvent('chat_typing_started', table.id, bot.id, {
      partialText: ''
    });
  }

  botInitiateProposal(table, bot) {
    // Pick candidate destination, transport, dates
    const dest = this.destinations[Math.floor(this.rng() * this.destinations.length)] || { name: 'Gokarna' };
    const transportModes = ['train', 'flight', 'bus', 'car'];
    const transport = transportModes[Math.floor(this.rng() * transportModes.length)];
    const acts = ['sightseeing', 'trekking', 'cafe_hopping', 'beach_relaxation', 'water_sports'];
    const act = acts[Math.floor(this.rng() * acts.length)];

    // Dates: In smooth/realistic, sometimes pick Golden Window; in chaotic, often pick random
    let dates;
    const pickGoldenChance = this.scenarioKey === 'SMOOTH' ? 0.85 : (this.scenarioKey === 'REALISTIC' ? 0.35 : 0.15);
    if (this.rng() < pickGoldenChance && table.goldenWindows.length > 0) {
      dates = table.goldenWindows[Math.floor(this.rng() * table.goldenWindows.length)];
    } else {
      dates = ALL_WINDOWS[Math.floor(this.rng() * ALL_WINDOWS.length)];
    }

    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const plan = {
      destination: dest.name,
      transportMode: transport,
      activity: act,
      startDate: dates.startDate,
      endDate: dates.endDate,
      startDay: dates.start,
      endDay: dates.end,
      tripLength: dates.length,
      windowId: dates.id
    };

    table.currentProposal = {
      id: proposalId,
      proposerId: bot.id,
      proposerNick: bot.nickname,
      plan,
      votes: { [bot.id]: 'yes' },
      createdAtSimTime: this.simTime
    };

    table.status = 'Proposal pending';

    this.emitEvent('proposal_submitted', table.id, bot.id, {
      proposalId,
      plan,
      proposerNick: bot.nickname
    });

    this.emitEvent('bot_thought', table.id, bot.id, {
      thought: `Proposing our plan: ${plan.destination} via ${plan.transportMode} on ${dates.label}. Fingers crossed!`
    });

    const announceMsg = `Guys, I just put up a proposal: ${plan.destination} (${plan.transportMode}) for ${dates.label}! Please vote YES!`;
    this.startBotTyping(table, bot, announceMsg);
  }

  processProposalVoting(table) {
    const prop = table.currentProposal;
    if (!prop) return;

    // Check bots that haven't voted yet
    table.bots.forEach(bot => {
      if (prop.votes[bot.id]) return; // already voted

      // Delay voting by ~1-3 sim seconds
      if (prop.createdAtSimTime - this.simTime < 1.0 + this.rng() * 2.0) return;

      // Bot evaluates plan: Does it satisfy its personal budget, transport, and date rules?
      let voteYes = true;
      let voteReason = "Looks good to me!";

      // Check dates
      for (let d = prop.plan.startDay; d <= prop.plan.endDay; d++) {
        const check = checkPlayerDateAvailability(d, {
          role: bot.roleCard,
          dateRule: bot.dateRule,
          socketId: bot.id
        }, table.activeTwists, 'mandatory');
        if (!check.works) {
          // If bot hasn't revealed and is agreeable, might passively vote YES anyway (causing blockage!)
          if (bot.style.key === 'AGREEABLE' && !bot.revealedConstraints) {
            voteYes = true; // Agreeable bot votes YES despite conflict!
            voteReason = "Don't want to create trouble, voting yes.";
          } else {
            voteYes = false;
            voteReason = check.reasons[0]?.shortLine || "Dates conflict with my schedule.";
          }
          break;
        }
      }

      prop.votes[bot.id] = voteYes ? 'yes' : 'no';

      this.emitEvent('vote_cast', table.id, bot.id, {
        proposalId: prop.id,
        vote: voteYes ? 'yes' : 'no',
        votesCount: {
          yes: Object.values(prop.votes).filter(v => v === 'yes').length,
          no: Object.values(prop.votes).filter(v => v === 'no').length,
          total: table.bots.length
        }
      });

      this.emitEvent('bot_thought', table.id, bot.id, {
        thought: voteYes
          ? `Voted YES on ${prop.plan.destination}. ${voteReason}`
          : `Voted NO on ${prop.plan.destination}. ${voteReason}`
      });
    });

    // Check if everyone has voted
    const totalVotes = Object.keys(prop.votes).length;
    if (totalVotes === table.bots.length) {
      const yesVotes = Object.values(prop.votes).filter(v => v === 'yes').length;

      if (yesVotes >= Math.ceil(table.bots.length * 0.75)) {
        // Group agreed to submit plan to server validator!
        this.validateAndResolveProposal(table, prop);
      } else {
        // Proposal rejected by group voting
        table.status = 'Planning';
        table.proposals.push({ ...prop, outcome: 'Rejected by team vote' });
        table.currentProposal = null;

        const rejectMsg = "Plan didn't get enough votes. Let's find another option.";
        const mediator = table.bots.find(b => b.style.key === 'PEACEMAKER') || table.bots[0];
        this.startBotTyping(table, mediator, rejectMsg);
      }
    }
  }

  validateAndResolveProposal(table, prop) {
    const memberList = table.bots.map(b => ({
      socketId: b.id,
      nickname: b.nickname,
      role: b.roleCard,
      dateRule: b.dateRule
    }));

    // Server-grade validation using solver.js
    const validation = validatePlan(
      prop.plan,
      memberList,
      table.activeTwists,
      this.destinations
    );

    if (validation.valid) {
      // SUCCESS! TRIP LOCKED!
      table.status = 'Locked';
      table.lockedPlan = {
        ...prop.plan,
        computedBudget: validation.computedBudget
      };
      table.lockedTime = Math.round(this.durationSeconds - this.simTime);
      table.proposals.push({ ...prop, outcome: 'Locked' });
      table.currentProposal = null;

      this.emitEvent('trip_locked', table.id, prop.proposerId, {
        proposalId: prop.id,
        lockedPlan: table.lockedPlan,
        lockedTime: table.lockedTime
      });

      // Celebratory chat
      const hypeman = table.bots.find(b => b.style.key === 'CHAOTIC' || b.style.key === 'DOMINANT') || table.bots[0];
      const winMsg = this.pickTemplate(CHAT_TEMPLATES.TRIP_LOCKED, hypeman.style.key, {});
      this.startBotTyping(table, hypeman, winMsg);
    } else {
      // BLOCKED! Machine validator caught a dealbreaker!
      table.status = 'Blocked';
      table.blockedAttemptsCount++;
      const firstViolation = validation.violations && validation.violations[0]
        ? validation.violations[0]
        : { category: 'Dates', message: 'Conflicts with a secret teammate constraint.' };

      const cat = firstViolation.category || 'Dates';
      table.blockedCategories.push(cat);
      table.pettyExcusesBlocked.push(firstViolation.message);
      table.proposals.push({ ...prop, outcome: 'Blocked', dealbreaker: firstViolation.message });
      table.currentProposal = null;

      this.emitEvent('proposal_blocked', table.id, prop.proposerId, {
        proposalId: prop.id,
        dealbreaker: firstViolation.message,
        category: cat,
        blockedAttemptsCount: table.blockedAttemptsCount
      });

      // Reaction chat
      const dominantOrAnalyst = table.bots.find(b => b.style.key === 'ANALYTICAL' || b.style.key === 'DOMINANT') || table.bots[0];
      const blockedMsg = this.pickTemplate(CHAT_TEMPLATES.PROPOSAL_REACTION_BLOCKED, dominantOrAnalyst.style.key, {
        dealbreaker: firstViolation.message,
        category: cat
      });
      this.startBotTyping(table, dominantOrAnalyst, blockedMsg);
    }
  }

  finishRound() {
    this.isEnded = true;
    this.status = 'completed';
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }

    // Mark remaining tables as timeout/failed
    this.tables.forEach(table => {
      if (table.status !== 'Locked') {
        table.status = table.blockedAttemptsCount > 0 ? 'Blocked' : 'Failed';
      }

      // Generate post-round 3-question survey responses per bot
      table.bots.forEach(bot => {
        let satisfaction;
        let feltHeard;
        let conflictSource;

        if (table.status === 'Locked') {
          satisfaction = bot.style.key === 'AGREEABLE' && !bot.revealedConstraints ? 3 : (4 + Math.floor(this.rng() * 2)); // 4 or 5
          feltHeard = bot.style.key !== 'SILENT';
          conflictSource = 'None';
        } else {
          // Failed or Blocked
          satisfaction = bot.style.key === 'SILENT' ? 1 : (1 + Math.floor(this.rng() * 2)); // 1 or 2
          feltHeard = bot.style.key === 'DOMINANT'; // only dominant felt heard when failed
          conflictSource = table.blockedCategories[0] || (bot.roleCard ? 'Budget' : 'Dates');
        }

        bot.survey = {
          satisfaction,
          feltHeard: feltHeard ? 'yes' : 'no',
          conflictSource,
          disclosedTwist: bot.activeTwist ? (bot.revealedConstraints ? 'yes' : 'no') : 'no'
        };
      });
    });

    this.emitEvent('round_ended', null, null, {
      totalTables: this.tables.length,
      lockedCount: this.tables.filter(t => t.status === 'Locked').length,
      results: this.getDebriefData()
    });

    this.onEndCallbacks.forEach(cb => {
      try { cb(this.getDebriefData()); } catch (e) { console.error('Error in onEnd callback:', e); }
    });
  }

  getDebriefData() {
    const totalTables = this.tables.length;
    const lockedTables = this.tables.filter(t => t.status === 'Locked');
    const lockedCount = lockedTables.length;
    const successRate = totalTables > 0 ? Math.round((lockedCount / totalTables) * 100) : 0;

    // Leaderboard
    const leaderboard = this.tables.map(t => ({
      tableId: t.id,
      name: t.name,
      outcome: t.status === 'Locked' ? 'Trip locked' : (t.blockedAttemptsCount > 0 ? 'Blocked at the end' : 'Trip cancelled'),
      timeTaken: t.lockedTime ? `${Math.floor(t.lockedTime / 60)}:${(t.lockedTime % 60).toString().padStart(2, '0')}` : 'Timeout',
      timeTakenSeconds: t.lockedTime || this.durationSeconds,
      blockedAttempts: t.blockedAttemptsCount,
      goldenWindows: t.goldenWindows || [],
      lockedPlan: t.lockedPlan,
      avgSatisfaction: Math.round((t.bots.reduce((acc, b) => acc + (b.survey?.satisfaction || 3), 0) / t.bots.length) * 10) / 10
    }));

    leaderboard.sort((a, b) => {
      if (a.outcome === 'Trip locked' && b.outcome !== 'Trip locked') return -1;
      if (a.outcome !== 'Trip locked' && b.outcome === 'Trip locked') return 1;
      return a.timeTakenSeconds - b.timeTakenSeconds;
    });

    // Culprits breakdown
    const categoryCounts = { 'Dates': 0, 'Budget': 0, 'Transport': 0, 'Activity': 0, 'Health/Comfort': 0 };
    this.tables.forEach(t => {
      t.blockedCategories.forEach(cat => {
        if (categoryCounts[cat] !== undefined) categoryCounts[cat]++;
        else categoryCounts['Dates']++;
      });
    });

    // Felt heard vs satisfaction
    const allBots = this.tables.flatMap(t => t.bots);
    const totalBots = allBots.length;
    const heardCount = allBots.filter(b => b.survey?.feltHeard === 'yes').length;
    const feltHeardPercent = totalBots > 0 ? Math.round((heardCount / totalBots) * 100) : 50;

    return {
      simulationId: this.id,
      seed: this.seed,
      scenario: this.scenario.name,
      totalTables,
      totalPlayers: totalBots,
      lockedCount,
      successRate,
      leaderboard,
      blockedCategories: categoryCounts,
      humanSide: {
        feltHeardPercent,
        avgSatisfaction: Math.round((allBots.reduce((a, b) => a + (b.survey?.satisfaction || 3), 0) / totalBots) * 10) / 10
      },
      eventsCount: this.events.length
    };
  }

  pickTemplate(templates, styleKey, replacements = {}) {
    const list = templates[styleKey] || templates.Agreeable || templates[Object.keys(templates)[0]] || [];
    if (!list || list.length === 0) return "";
    let str = list[Math.floor(this.rng() * list.length)];
    Object.keys(replacements).forEach(k => {
      str = str.replace(new RegExp(`{${k}}`, 'g'), replacements[k]);
    });
    return str;
  }
}

module.exports = {
  SimulationEngine,
  BOT_COMMUNICATION_STYLES,
  SCENARIO_PRESETS
};
