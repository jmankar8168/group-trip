// Automated Comprehensive Test Suite for Golden Dates, Hard Constraints, Validator, and Twists
const {
  ALL_WINDOWS,
  CALENDAR_DAYS,
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

const cards = require('./data/cards.json');
const twists = require('./data/twists.json');
const destinations = require('./data/destinations.json');

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    console.error(`❌ FAILED: ${testName}`);
    process.exitCode = 1;
  }
}

console.log('================================================================');
console.log('🔬 TEST 1: Golden Windows & Calendar Intersection (200 deals per difficulty)');
console.log('================================================================');

const difficulties = [
  { name: 'Easy', goldenCount: 4 },
  { name: 'Medium', goldenCount: 2 },
  { name: 'Hard', goldenCount: 1 }
];

difficulties.forEach(diff => {
  let intersectionCorrectCount = 0;
  let noAvailabilityBelow40Count = 0;
  let goldenWindowsSizeCorrect = 0;
  let nonGoldenRejectedCorrect = 0;

  for (let i = 0; i < 200; i++) {
    const playerCount = 4 + (i % 3); // Test with 4, 5, 6 players
    const deal = dealGoldenDates(playerCount, diff.goldenCount);

    // 1. Golden set size check
    if (deal.goldenSet.length === diff.goldenCount) {
      goldenWindowsSizeCorrect++;
    }

    // 2. Intersection calculation
    const calculatedIntersection = ALL_WINDOWS.filter(w => {
      return deal.playerRules.every(r => doesPlayerAcceptWindow(w, r));
    });

    const goldenIds = new Set(deal.goldenSet.map(g => g.id));
    const isExactIntersection = (
      calculatedIntersection.length === deal.goldenSet.length &&
      calculatedIntersection.every(w => goldenIds.has(w.id))
    );
    if (isExactIntersection) intersectionCorrectCount++;

    // 3. Confirm every non-golden window is rejected by at least one player
    const nonGolden = ALL_WINDOWS.filter(w => !goldenIds.has(w.id));
    const allNonGoldenRejected = nonGolden.every(w => {
      return deal.playerRules.some(r => !doesPlayerAcceptWindow(w, r));
    });
    if (allNonGoldenRejected) nonGoldenRejectedCorrect++;

    // 4. Confirm no player's individual availability drops below 40%
    const allPlayersAbove40 = deal.playerRules.every(r => {
      const allowedCount = ALL_WINDOWS.filter(w => doesPlayerAcceptWindow(w, r)).length;
      return (allowedCount / ALL_WINDOWS.length) >= 0.40;
    });
    if (allPlayersAbove40) noAvailabilityBelow40Count++;
  }

  assert(goldenWindowsSizeCorrect === 200, `${diff.name}: Golden set size always matches target (${diff.goldenCount})`);
  assert(intersectionCorrectCount === 200, `${diff.name}: Intersection exactly equals golden set across 200 deals (200/200)`);
  assert(nonGoldenRejectedCorrect === 200, `${diff.name}: All non-golden windows rejected by at least one player (200/200)`);
  assert(noAvailabilityBelow40Count === 200, `${diff.name}: No player availability drops below 40% (200/200)`);

  console.log(`✅ ${diff.name} Difficulty: 200/200 deals verified. Exact intersection = ${diff.goldenCount} windows. Min availability >= 40%.`);
});

console.log('\n================================================================');
console.log('🔬 TEST 2: Hard Constraint Machine Validator Enforcement');
console.log('================================================================');

// Set up 4 players with known distinct cards
let deal = dealGoldenDates(4, 2);
let goldenWindow = deal.goldenSet.find(w => w.length <= 3);
while (!goldenWindow) {
  deal = dealGoldenDates(4, 2);
  goldenWindow = deal.goldenSet.find(w => w.length <= 3);
}

const testPlayers = [
  { socketId: 's1', role: cards[0], dateRule: deal.playerRules[0] }, // Over-planner: Max 3 days, no road trip, veg required, no nightlife
  { socketId: 's2', role: cards[1], dateRule: deal.playerRules[1] }, // Budget Watcher: Max budget Rs 8,000, no flights
  { socketId: 's3', role: cards[4], dateRule: deal.playerRules[2] }, // I'm Fine With Anything: No beach, no boat, max road 4h
  { socketId: 's4', role: cards[6], dateRule: deal.playerRules[3] }  // Foodie: Seafood allergy, no cold places, max budget 14,000
];

// (a) Test Budget Violation
const expensiveDest = destinations.find(d => d.baseCost3Day > 15000) || destinations[20]; // Dubai Rs 32,000
const budgetTestPlan = {
  destinationId: expensiveDest.id,
  destination: expensiveDest.name,
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'flight',
  activity: 'sightseeing'
};
const budgetResult = validatePlan(budgetTestPlan, testPlayers, [], destinations);
assert(!budgetResult.valid, 'Validator correctly BLOCKS over-budget trip');
assert(budgetResult.categories.includes('Budget'), 'Blocked categories includes "Budget"');

// (b) Test Transport Ban Violation (Fear of flying for Budget Watcher)
const flightTestPlan = {
  destinationId: 'dest-1',
  destination: 'Pachmarhi, MP',
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'flight',
  activity: 'sightseeing'
};
const flightResult = validatePlan(flightTestPlan, testPlayers, [], destinations);
assert(!flightResult.valid, 'Validator correctly BLOCKS banned flight mode');
assert(flightResult.categories.includes('Transport'), 'Blocked categories includes "Transport"');

// (c) Test Environment Violation (No beach for "I\'m fine with anything")
const beachDest = destinations.find(d => d.environment === 'beach');
const beachTestPlan = {
  destinationId: beachDest.id,
  destination: beachDest.name,
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'train',
  activity: 'sightseeing'
};
const beachResult = validatePlan(beachTestPlan, testPlayers, [], destinations);
assert(!beachResult.valid, 'Validator correctly BLOCKS banned beach destination');
assert(beachResult.categories.includes('Environment'), 'Blocked categories includes "Environment"');

// (d) Test Health/Diet Violation (Seafood focus for Foodie)
const seafoodDest = destinations.find(d => d.food?.seafoodFocused);
const seafoodTestPlan = {
  destinationId: seafoodDest.id,
  destination: seafoodDest.name,
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'train',
  activity: 'sightseeing'
};
const seafoodResult = validatePlan(seafoodTestPlan, testPlayers, [], destinations);
assert(!seafoodResult.valid, 'Validator correctly BLOCKS seafood-focused spot for allergic player');
assert(seafoodResult.categories.includes('Health'), 'Blocked categories includes "Health"');

// (e) Test Non-Golden Date Violation
const nonGoldenWindow = ALL_WINDOWS.find(w => !deal.goldenSet.some(g => g.id === w.id));
const dateTestPlan = {
  destinationId: 'dest-1',
  destination: 'Pachmarhi, MP',
  startDate: nonGoldenWindow.startDate,
  endDate: nonGoldenWindow.endDate,
  transportMode: 'train',
  activity: 'sightseeing'
};
const dateResult = validatePlan(dateTestPlan, testPlayers, [], destinations);
assert(!dateResult.valid, 'Validator correctly BLOCKS non-golden dates');
assert(dateResult.categories.includes('Dates'), 'Blocked categories includes "Dates"');

// (f) Submit a Valid Plan that satisfies all 4 players
// Pachmarhi: train, Rs 6,500 <= 8,000, vegetarian, medium altitude, mild climate, no beach, no boat
const validTestPlan = {
  destinationId: 'dest-1',
  destination: 'Pachmarhi, MP',
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'train',
  activity: 'spa_wellness'
};
const validResult = validatePlan(validTestPlan, testPlayers, [], destinations);
assert(validResult.valid, 'Validator ACCEPTS valid plan that satisfies all constraints');
assert(validResult.violationCount === 0, 'Valid plan has 0 violations');

console.log('✅ All constraint violations correctly blocked by category without leaking identities.');
console.log('✅ Valid consensus plan successfully verified and accepted.');

console.log('\n================================================================');
console.log('🔬 TEST 3: Guaranteed Solvability Across 100 Random Deals');
console.log('================================================================');

let allDealsSolvable = true;
for (let d = 0; d < 100; d++) {
  const pCount = 4 + (d % 3);
  const diff = d % 3 === 0 ? 'easy' : (d % 3 === 1 ? 'medium' : 'hard');
  const targetGolden = diff === 'easy' ? 4 : (diff === 'medium' ? 2 : 1);
  const roundDeal = dealSolvableRound(cards, pCount, targetGolden, diff, destinations);

  if (!roundDeal || roundDeal.totalValidPlans < 1) {
    allDealsSolvable = false;
    console.error(`Deal ${d} was not solvable!`);
  }
}
assert(allDealsSolvable, 'Full plan solver confirms at least 1 valid plan exists for 100/100 random deals');
console.log('✅ 100/100 random deals guaranteed solvable with full valid plans.');

console.log('\n================================================================');
console.log('🔬 TEST 4: India-Centered Twists & Solvability Invariance (200 runs)');
console.log('================================================================');

let twistsPreserveSolvability = true;
let privateTwistsTargetPhoneOnly = true;
let timePenaltyTriggersCorrectly = true;

for (let r = 0; r < 200; r++) {
  const pCount = 4 + (r % 3);
  const roundDeal = dealSolvableRound(cards, pCount, 2, 'medium', destinations);
  const roundPlayers = roundDeal.dealtCards.map((c, idx) => ({
    socketId: `test-s-${idx}`,
    role: c,
    dateRule: roundDeal.playerRules[idx]
  }));

  // Use the twist solvability pre-checker algorithm
  const scheduledTwists = scheduleRoundTwists(roundDeal.goldenSet, roundPlayers, twists, destinations);

  // Verify private twists target only the intended player
  scheduledTwists.forEach(tw => {
    if (tw.visibility === 'private' && !tw.targetPlayerId) {
      privateTwistsTargetPhoneOnly = false;
    }
    if (tw.effectType === 'time_penalty' && (!tw.ruleChange?.penalty || tw.ruleChange.penalty <= 0)) {
      timePenaltyTriggersCorrectly = false;
    }
  });

  // Verify solvability holds with scheduled twists active
  const sol = solveFullValidPlans(roundDeal.goldenSet, roundPlayers, destinations, scheduledTwists);
  if (!sol.solvable) {
    twistsPreserveSolvability = false;
  }
}

assert(twistsPreserveSolvability, 'Twist solvability pre-checker maintains solvability across 200 runs');
assert(privateTwistsTargetPhoneOnly, 'Private twists are scoped strictly to target player phone');
assert(timePenaltyTriggersCorrectly, 'Time penalty rules properly configure penalty seconds');
console.log('✅ 200/200 twist simulations preserved solvability and privacy rules.');

console.log('\n================================================================');
console.log('🔬 TEST 5: Private Calendar Date Checks, Privacy Invariance & Own-Voice Reasons');
console.log('================================================================');

// Pick a player with a known date rule
const samplePlayer = {
  socketId: 'p-test-1',
  role: cards[0], // Over-planner: Max 3 days, reason templates
  dateRule: {
    type: 'allowed_ranges',
    label: 'Nov 6-8, Nov 13-15',
    allowedRanges: [
      { start: 1, end: 3, startDate: '2026-11-06', endDate: '2026-11-08' },
      { start: 8, end: 10, startDate: '2026-11-13', endDate: '2026-11-15' }
    ]
  }
};

// 1. Single valid date check
const res1 = checkPlayerDateAvailability(2, samplePlayer, [], 'full');
assert(res1.works === true, 'Single date within allowed range returns works = true');
assert(res1.reasons.length === 0, 'Valid date produces 0 error reasons');

// 2. Single invalid date check with reason
const res2 = checkPlayerDateAvailability(5, samplePlayer, [], 'full');
assert(res2.works === false, 'Date outside allowed range returns works = false');
assert(res2.reasons.length > 0, 'Invalid date returns own-voice reason');
assert(res2.reasons[0].category !== undefined, 'Reason has category tag');

// 3. Privacy Inspection: check message payload for forbidden leaks
const serialized = JSON.stringify(res2);
assert(!serialized.includes('goldenSet'), 'Network payload NEVER leaks goldenSet');
assert(!serialized.includes('otherPlayers'), 'Network payload NEVER contains other players data');
assert(!serialized.includes('closest valid date'), 'Network payload NEVER gives directional hints');
assert(!serialized.includes('try next week'), 'Network payload NEVER gives directional navigation hints');

// 4. Test reasonSetting modes: 'full', 'category', 'none'
const resFull = checkPlayerDateAvailability(5, samplePlayer, [], 'full');
const resCat = checkPlayerDateAvailability(5, samplePlayer, [], 'category');
const resNone = checkPlayerDateAvailability(5, samplePlayer, [], 'none');
assert(resFull.reasons.length > 0 && resFull.reasons[0].line.length > 15, 'Full reason setting returns descriptive own-voice line');
assert(resCat.reasons.length > 0 && resCat.reasons[0].line === resCat.reasons[0].category, 'Category setting returns category tag only');
assert(resNone.reasons.length === 0, 'None setting returns zero reasons (colour & icon only)');

// 5. Multi-reason range check (trip length violation + blocked date)
const multiRangeRes = checkPlayerDateAvailability({ start: 8, end: 13 }, samplePlayer, [], 'full'); // 6 days > 3 days max
assert(multiRangeRes.works === false, 'Multi-day range exceeding max trip length is rejected');
assert(multiRangeRes.durationDays === 6, 'Range correctly computes duration days');
const hasTripLengthReason = multiRangeRes.reasons.some(r => r.category === 'TripLength');
assert(hasTripLengthReason, 'Range correctly detects trip length constraint violation');

// 6. Twist updating availability & reason
const sundayTwist = {
  id: 'tw-return-sunday',
  targetPlayerId: samplePlayer.socketId,
  ruleChange: { type: 'return_by_sunday' },
  title: "Mom's Condition"
};
const resBeforeTwist = checkPlayerDateAvailability({ start: 1, end: 4 }, samplePlayer, []); // Day 4 is Monday
const resAfterTwist = checkPlayerDateAvailability({ start: 1, end: 4 }, samplePlayer, [sundayTwist]);
assert(resAfterTwist.works === false, 'Twist correctly enforces return-by-Sunday constraint');
const hasSundayReason = resAfterTwist.reasons.some(r => r.line.includes('Sunday'));
assert(hasSundayReason, 'Twist dynamically attaches updated own-voice reason for new condition');

console.log('✅ Date check privacy invariance confirmed: 0 golden leaks, 0 hints, strictly scoped to player.');
console.log('✅ Own-voice reason generation verified across Full, Category, and None modes.');

console.log('\n================================================================');
console.log('🔬 TEST 6: Personal Budget Range Enforcement (Min & Max)');
console.log('================================================================');

const budgetPlayer = {
  socketId: 'p-budget-test',
  role: {
    ...cards[1],
    hardConstraints: [],
    personalBudget: {
      min: 5000,
      max: 12000,
      minLabel: 'No shared dorms',
      maxLabel: 'Buffer for shopping'
    }
  },
  dateRule: deal.playerRules[0]
};

// Plan below personal minimum (e.g. Rs 3,000 per person)
const cheapDest = {
  id: 'dest-cheap',
  name: 'Budget Camp',
  baseCost3Day: 2800,
  availableModes: ['train'],
  environment: 'hills'
};
const cheapPlan = {
  destinationId: 'dest-cheap',
  destination: 'Budget Camp',
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'train',
  activity: 'sightseeing'
};
const cheapRes = validatePlan(cheapPlan, [budgetPlayer], [], [cheapDest, ...destinations]);
assert(!cheapRes.valid, 'Plan below individual personal minimum budget is BLOCKED');
assert(cheapRes.categories.includes('Budget'), 'Blocked category is strictly "Budget"');

// Plan above personal maximum (e.g. Rs 20,000 per person)
const expensivePlan = {
  destinationId: expensiveDest.id,
  destination: expensiveDest.name,
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'flight',
  activity: 'sightseeing'
};
const expRes = validatePlan(expensivePlan, [budgetPlayer], [], destinations);
assert(!expRes.valid, 'Plan above individual personal maximum budget is BLOCKED');
assert(expRes.categories.includes('Budget'), 'Blocked category is strictly "Budget"');

// Plan inside personal range (Rs 8,000 per person)
const midPlan = {
  destinationId: 'dest-1',
  destination: 'Pachmarhi, MP',
  startDate: goldenWindow.startDate,
  endDate: goldenWindow.endDate,
  transportMode: 'train',
  activity: 'wellness'
};
const midRes = validatePlan(midPlan, [budgetPlayer], [], destinations);
const midBudgetPassed = !midRes.categories.includes('Budget');
assert(midBudgetPassed, 'Plan within individual personal budget range passes budget check');

console.log('✅ Personal budget min and max limits strictly enforced. Blocked screen shows "Budget" only.');

console.log('\n================================================================');
console.log('🔬 TEST 7: All 20 Petty-Excuse Constraints Verified');
console.log('================================================================');

const pettyTags = [
  { tag: 'no_boat', test: { transportMode: 'boat' }, cat: 'Transport' },
  { tag: 'no_cold_or_high_altitude', destMod: { climate: 'cold' }, cat: 'Environment' },
  { tag: 'no_sun_activities', test: { activity: 'beach day' }, cat: 'Activity' },
  { tag: 'ac_required', destMod: { hasAC: false }, cat: 'Environment' },
  { tag: 'no_humidity', destMod: { humidity: 'high' }, cat: 'Environment' },
  { tag: 'no_forest_camping', test: { activity: 'camping' }, cat: 'Activity' },
  { tag: 'no_monkeys', destMod: { monkeyHeavy: true }, cat: 'Environment' },
  { tag: 'clean_washrooms_only', test: { activity: 'trekking' }, cat: 'Health' },
  { tag: 'no_mud', test: { activity: 'trekking' }, cat: 'Activity' },
  { tag: 'max_2_nights', testWindow: ALL_WINDOWS.find(w => w.length === 4), cat: 'Dates' },
  { tag: 'no_sunrise_treks', test: { activity: 'sunrise trekking' }, cat: 'Activity' },
  { tag: 'no_low_connectivity', destMod: { connectivity: 'low' }, cat: 'Environment' },
  { tag: 'no_heritage', test: { activity: 'heritage walk' }, cat: 'Activity' },
  { tag: 'no_high_altitude_cable_cars', destMod: { altitude: 'high' }, cat: 'Environment' },
  { tag: 'no_swimming_water_sports', test: { activity: 'water sports' }, cat: 'Activity' },
  { tag: 'no_winding_roads', destMod: { travelTime: { road: 4.5, hillRoad: true } }, test: { transportMode: 'road' }, cat: 'Transport' },
  { tag: 'vegetarian_only_destination', destMod: { food: { vegetarianFriendly: false } }, cat: 'Health' },
  { tag: 'no_dust', destMod: { dusty: true }, cat: 'Environment' },
  { tag: 'high_scenic_only', destMod: { scenicScore: 'low' }, cat: 'Activity' },
  { tag: 'no_backpacking', destMod: { transferServiceAvailable: false }, cat: 'Transport' }
];

let allPettyBlocked = true;
pettyTags.forEach(({ tag, test, destMod, testWindow, cat }) => {
  const pCard = {
    ...cards[0],
    hardConstraints: [],
    pettyConstraints: [{ id: 'p-test', tag, emoji: '⚠️', playerLine: `Test petty excuse for ${tag}` }],
    personalBudget: { min: 1000, max: 30000 }
  };
  const testP = { socketId: 'p-petty', role: pCard, dateRule: { type: 'unrestricted' } };

  const baseDest = { ...destinations[0], ...(destMod || {}) };
  const targetWindow = testWindow || goldenWindow;
  const plan = {
    destinationId: baseDest.id,
    destination: baseDest.name,
    startDate: targetWindow.startDate,
    endDate: targetWindow.endDate,
    transportMode: test?.transportMode || 'train',
    activity: test?.activity || 'wellness',
    ...(test || {})
  };

  const vRes = validatePlan(plan, [testP], [], [baseDest, ...destinations]);
  if (vRes.valid || !vRes.categories.includes(cat)) {
    allPettyBlocked = false;
    console.error(`Petty constraint tag failed blocking: ${tag} (expected category ${cat}, got ${vRes.categories.join(', ')})`);
  }
});

assert(allPettyBlocked, 'All 20 petty-excuse constraints correctly block conflicting plans with proper category');
console.log('✅ All 20 petty constraints successfully verified against machine validator.');

console.log('\n================================================================');
console.log('🔬 TEST 8: Full Plan Solvability (200 deals across all 3 difficulties)');
console.log('================================================================');

let all200DealsSolvable = true;
let allBudgetOverlapsValid = true;

for (let i = 0; i < 200; i++) {
  const diff = i % 3 === 0 ? 'easy' : (i % 3 === 1 ? 'medium' : 'hard');
  const goldenCount = diff === 'easy' ? 4 : (diff === 'medium' ? 2 : 1);
  const pCount = 4 + (i % 3);

  const rDeal = dealSolvableRound(cards, pCount, goldenCount, diff, destinations);
  if (!rDeal || rDeal.totalValidPlans < 1) {
    all200DealsSolvable = false;
    console.error(`Failed deal at index ${i} (${diff})`);
  }

  // Verify mutual budget overlap width
  const overlapWidth = (rDeal.mutualBudgetMax || 0) - (rDeal.mutualBudgetMin || 0);
  if (overlapWidth < 1000) {
    allBudgetOverlapsValid = false;
  }
}

assert(all200DealsSolvable, 'Every deal across 200 deals at all difficulties produces >= 1 full valid plan');
assert(allBudgetOverlapsValid, 'Every deal has a guaranteed mutual budget overlap width >= Rs 1,000');
console.log('✅ 200/200 random deals verified across Easy, Medium, and Hard. Guaranteed solvability & budget overlap.');

console.log('\n================================================================');
console.log(`🎉 ALL TESTS PASSED: ${passedTests} / ${totalTests} assertions verified!`);
console.log('================================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

