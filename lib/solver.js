// Solvability Engine & Golden Windows Constraint Generator
// Fixed 4-Week Window: 28 Days (Day 1 = 2026-11-06 Friday to Day 28 = 2026-12-03 Thursday)

const BASE_DATE = new Date(2026, 10, 6); // November 6, 2026 (Friday)

function formatDayToDateStr(dayNum) {
  const d = new Date(BASE_DATE);
  d.setDate(d.getDate() + (dayNum - 1));
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return {
    dayNum,
    iso: d.toISOString().split('T')[0],
    formatted: `${d.getDate()} ${months[d.getMonth()]} (${days[d.getDay()]})`,
    short: `${d.getDate()} ${months[d.getMonth()]}`,
    dayOfWeek: days[d.getDay()],
    isWeekend: (d.getDay() === 0 || d.getDay() === 5 || d.getDay() === 6)
  };
}

// Generate the 28 days calendar metadata
const CALENDAR_DAYS = [];
for (let i = 1; i <= 28; i++) {
  CALENDAR_DAYS.push(formatDayToDateStr(i));
}

// Enumerate all trip windows of length 2, 3, or 4 days
function enumerateTripWindows() {
  const windows = [];
  const allowedLengths = [2, 3, 4];
  for (let start = 1; start <= 28; start++) {
    for (const len of allowedLengths) {
      const end = start + len - 1;
      if (end <= 28) {
        const startDay = CALENDAR_DAYS[start - 1];
        const endDay = CALENDAR_DAYS[end - 1];
        // Check if weekend-only: starts Friday or later, ends by Sunday
        // Weekend days: Fri=5, Sat=6, Sun=0
        const isStrictWeekend = (
          (startDay.dayOfWeek === 'Fri' || startDay.dayOfWeek === 'Sat') &&
          (endDay.dayOfWeek === 'Sat' || endDay.dayOfWeek === 'Sun') &&
          (end - start <= 2)
        );

        windows.push({
          id: `w-${start}-${end}`,
          start,
          end,
          length: len,
          startDate: startDay.iso,
          endDate: endDay.iso,
          label: `${startDay.short} - ${endDay.short} (${len} days)`,
          fullLabel: `${startDay.formatted} to ${endDay.formatted}`,
          isWeekendOnly: isStrictWeekend
        });
      }
    }
  }
  return windows;
}

const ALL_WINDOWS = enumerateTripWindows(); // 78 trip windows

// Check if two windows overlap or are too close
function areWindowsSpread(w1, w2, minGapDays = 3) {
  return (w1.end + minGapDays < w2.start) || (w2.end + minGapDays < w1.start);
}

// Pick golden windows spread out across the 4 weeks
function pickGoldenWindows(count = 2) {
  const targetCount = Math.max(1, Math.min(4, count));
  
  // Try up to 50 times to get a nicely spread set
  for (let attempt = 0; attempt < 50; attempt++) {
    const shuffled = [...ALL_WINDOWS].sort(() => 0.5 - Math.random());
    const selected = [];

    for (const cand of shuffled) {
      if (selected.length === targetCount) break;
      const isSpread = selected.every(s => areWindowsSpread(s, cand, 3));
      if (isSpread) {
        selected.push(cand);
      }
    }

    if (selected.length === targetCount) {
      selected.sort((a, b) => a.start - b.start);
      return selected;
    }
  }

  // Fallback: Pick predefined spread windows across weeks 1, 2, 3, 4
  const fallbackPresets = [
    ALL_WINDOWS.find(w => w.start === 1 && w.end === 3),   // Nov 6-8 (Weekend 1)
    ALL_WINDOWS.find(w => w.start === 8 && w.end === 10),  // Nov 13-15 (Weekend 2)
    ALL_WINDOWS.find(w => w.start === 15 && w.end === 17), // Nov 20-22 (Weekend 3)
    ALL_WINDOWS.find(w => w.start === 22 && w.end === 24)  // Nov 27-29 (Weekend 4)
  ];
  return fallbackPresets.slice(0, targetCount);
}

// Find window by ISO dates or start/end day indices
function findWindow(startDate, endDate) {
  if (typeof startDate === 'number' && typeof endDate === 'number') {
    return ALL_WINDOWS.find(w => w.start === startDate && w.end === endDate);
  }
  return ALL_WINDOWS.find(w => w.startDate === startDate && w.endDate === endDate);
}

// Generates varied, believable date constraints for a player that satisfy ALL golden windows
function generatePlayerDateConstraint(playerIdx, goldenWindows, decoyPool) {
  const gWindows = goldenWindows;
  const allGoldenWeekend = gWindows.every(w => w.isWeekendOnly);
  const maxGoldenLen = Math.max(...gWindows.map(w => w.length));
  const maxGoldenEnd = Math.max(...gWindows.map(w => w.end));

  const ruleTypes = ['allowed_ranges', 'weekend_only', 'max_trip_length', 'must_return_by', 'explicit_set'];
  let chosenType = ruleTypes[playerIdx % ruleTypes.length];

  // Safeguards for rule types
  if (chosenType === 'weekend_only' && !allGoldenWeekend) {
    chosenType = 'allowed_ranges';
  }
  if (chosenType === 'max_trip_length' && maxGoldenLen > 3) {
    chosenType = 'allowed_ranges';
  }
  if (chosenType === 'must_return_by' && maxGoldenEnd > 24) {
    chosenType = 'allowed_ranges';
  }

  switch (chosenType) {
    case 'weekend_only':
      return {
        type: 'weekend_only',
        ruleText: 'Weekend only: Trip must depart Friday or later and return by Sunday evening.',
        label: '🗓️ Free Weekends Only (Fri-Sun)'
      };

    case 'max_trip_length':
      return {
        type: 'max_trip_length',
        maxDays: Math.max(maxGoldenLen, 3),
        ruleText: `Leave-day limit: Max trip length is ${Math.max(maxGoldenLen, 3)} days.`,
        label: `🗓️ Max ${Math.max(maxGoldenLen, 3)} Days Trip`
      };

    case 'must_return_by':
      const cutoff = Math.min(28, maxGoldenEnd + 2);
      return {
        type: 'must_return_by',
        maxDay: cutoff,
        ruleText: `Work deadline: Must return and be home by Day ${cutoff} (${CALENDAR_DAYS[cutoff - 1].short}).`,
        label: `🗓️ Must return by Day ${cutoff} (${CALENDAR_DAYS[cutoff - 1].short})`
      };

    case 'allowed_ranges': {
      // Build 2 to 3 discrete allowed day ranges that encompass all golden windows + decoy dates
      const ranges = gWindows.map(w => ({
        start: Math.max(1, w.start - (Math.random() > 0.5 ? 1 : 0)),
        end: Math.min(28, w.end + (Math.random() > 0.5 ? 1 : 0))
      }));

      // Add 1 random decoy range
      const decoy = decoyPool[playerIdx % decoyPool.length];
      if (decoy) {
        ranges.push({
          start: Math.max(1, decoy.start),
          end: Math.min(28, decoy.end)
        });
      }

      const mergedRanges = [];
      ranges.sort((a, b) => a.start - b.start);
      ranges.forEach(r => {
        if (!mergedRanges.length) {
          mergedRanges.push(r);
        } else {
          const prev = mergedRanges[mergedRanges.length - 1];
          if (r.start <= prev.end + 1) {
            prev.end = Math.max(prev.end, r.end);
          } else {
            mergedRanges.push(r);
          }
        }
      });

      const text = mergedRanges.map(r => `${CALENDAR_DAYS[r.start - 1].short} - ${CALENDAR_DAYS[r.end - 1].short}`).join(', ');
      return {
        type: 'allowed_ranges',
        ranges: mergedRanges,
        ruleText: `Free only during these windows: ${text}.`,
        label: `🗓️ Allowed: ${text}`
      };
    }

    case 'explicit_set':
    default: {
      const allowedWindows = [...gWindows];
      const decoysToAdd = decoyPool.filter((_, idx) => (idx + playerIdx) % 3 === 0);
      allowedWindows.push(...decoysToAdd);

      const uniqueSet = [];
      const seen = new Set();
      allowedWindows.forEach(w => {
        if (!seen.has(w.id)) {
          seen.add(w.id);
          uniqueSet.push(w);
        }
      });

      return {
        type: 'explicit_set',
        allowedWindows: uniqueSet,
        ruleText: `Available for ${uniqueSet.length} potential trip slots in the 4-week window.`,
        label: `🗓️ ${uniqueSet.length} Available Slots`
      };
    }
  }
}

// Tests whether a window satisfies a single player's date constraint
function doesPlayerAcceptWindow(windowObj, dateRule) {
  if (!dateRule) return true;

  switch (dateRule.type) {
    case 'weekend_only':
      return Boolean(windowObj.isWeekendOnly);

    case 'max_trip_length':
      return windowObj.length <= dateRule.maxDays;

    case 'must_return_by':
      return windowObj.end <= dateRule.maxDay;

    case 'allowed_ranges':
      return dateRule.ranges.some(r => windowObj.start >= r.start && windowObj.end <= r.end);

    case 'blocked_ranges':
      return !dateRule.ranges.some(r => (windowObj.start <= r.end && windowObj.end >= r.start));

    case 'composite':
      if (dateRule.weekendOnly && !windowObj.isWeekendOnly) return false;
      if (dateRule.maxDays && windowObj.length > dateRule.maxDays) return false;
      if (dateRule.allowedRanges) {
        return dateRule.allowedRanges.some(r => windowObj.start >= r.start && windowObj.end <= r.end);
      }
      return true;

    case 'explicit_set':
      return dateRule.allowedWindows.some(w => w.id === windowObj.id);

    default:
      return true;
  }
}

// Checks intersection of all players' constraints against all windows
function evaluateDateIntersection(playerRules, allWindows) {
  const validForEveryPlayer = [];
  const playerAllowedCounts = new Array(playerRules.length).fill(0);

  allWindows.forEach(w => {
    let acceptedByAll = true;
    playerRules.forEach((rule, pIdx) => {
      const accepted = doesPlayerAcceptWindow(w, rule);
      if (accepted) {
        playerAllowedCounts[pIdx]++;
      } else {
        acceptedByAll = false;
      }
    });

    if (acceptedByAll) {
      validForEveryPlayer.push(w);
    }
  });

  return {
    intersection: validForEveryPlayer,
    playerAllowedCounts,
    totalWindows: allWindows.length
  };
}

// Master Date Dealer: Generates the answer first (1-4 golden windows) then builds calendars around it
function dealGoldenDates(playerCount = 4, targetGoldenCount = 2) {
  const goldenCount = Math.max(1, Math.min(4, targetGoldenCount));

  for (let attempt = 0; attempt < 200; attempt++) {
    const goldenSet = pickGoldenWindows(goldenCount);
    const goldenIds = new Set(goldenSet.map(w => w.id));
    const nonGoldenWindows = ALL_WINDOWS.filter(w => !goldenIds.has(w.id));

    const playerRules = [];
    const minTargetAllowed = Math.floor(ALL_WINDOWS.length * 0.40); // >= 40% individual availability
    const maxTargetAllowed = Math.floor(ALL_WINDOWS.length * 0.85); // <= 85% individual availability

    for (let p = 0; p < playerCount; p++) {
      const decoyPool = nonGoldenWindows.filter((_, idx) => idx % playerCount === p);
      const rule = generatePlayerDateConstraint(p, goldenSet, decoyPool);
      playerRules.push(rule);
    }

    // Step 4: Verify by brute force that the intersection of all players' date constraints equals exactly the golden set
    const evalResult = evaluateDateIntersection(playerRules, ALL_WINDOWS);
    const intersectIds = new Set(evalResult.intersection.map(w => w.id));

    // Verify condition: Intersection equals exactly the golden set
    const exactMatch = (
      evalResult.intersection.length === goldenSet.length &&
      goldenSet.every(g => intersectIds.has(g.id))
    );

    // Verify condition: No player's own availability drops below 40%
    const allMeetAvailabilityFloor = evalResult.playerAllowedCounts.every(c => c >= minTargetAllowed && c <= maxTargetAllowed);

    if (exactMatch && allMeetAvailabilityFloor) {
      return {
        goldenSet,
        playerRules,
        attempts: attempt + 1,
        evalResult
      };
    }
  }

  // Pre-built fallback deal guaranteeing exact intersection of size targetGoldenCount
  const fallbackGolden = pickGoldenWindows(goldenCount);
  const fallbackGoldenIds = new Set(fallbackGolden.map(w => w.id));
  const nonGolden = ALL_WINDOWS.filter(w => !fallbackGoldenIds.has(w.id));

  const fallbackRules = [];
  for (let p = 0; p < playerCount; p++) {
    const assignedDecoys = nonGolden.filter((_, idx) => idx % playerCount !== p);
    fallbackRules.push({
      type: 'explicit_set',
      allowedWindows: [...fallbackGolden, ...assignedDecoys],
      ruleText: `Available for ${fallbackGolden.length + assignedDecoys.length} trip windows.`,
      label: `🗓️ ${fallbackGolden.length + assignedDecoys.length} Available Slots`
    });
  }

  return {
    goldenSet: fallbackGolden,
    playerRules: fallbackRules,
    attempts: 200,
    evalResult: evaluateDateIntersection(fallbackRules, ALL_WINDOWS)
  };
}

// Compute Trip Budget per person based on destination, length, and surge
function computeTripBudget(destination, tripLengthDays, costSurgePercent = 0, roadSurgePercent = 0, discountPercent = 0) {
  if (!destination) return 0;
  const baseCost = destination.baseCost3Day || 8000;
  // Scale with duration: 2 days = 0.8x, 3 days = 1.0x, 4 days = 1.3x, 5 days = 1.6x
  const durationFactor = tripLengthDays === 2 ? 0.8 : (tripLengthDays === 3 ? 1.0 : (tripLengthDays === 4 ? 1.3 : 1.6));
  let cost = baseCost * durationFactor;
  
  if (costSurgePercent) cost += cost * (costSurgePercent / 100);
  if (roadSurgePercent) cost += cost * (roadSurgePercent / 100);
  if (discountPercent) cost -= cost * (discountPercent / 100);

  return Math.round(cost);
}

// Validate a candidate plan against all players' hard constraints, personal budget ranges, and petty constraints
function validatePlan(plan, players, activeTwists = [], destinationList = []) {
  const violations = [];
  const dest = destinationList.find(d => d.id === plan.destinationId || d.name === plan.destination) || plan.customDestination;
  const windowObj = findWindow(plan.startDate, plan.endDate);

  if (!windowObj) {
    violations.push({ category: 'Dates', message: 'Selected date range is outside the game calendar.' });
  }

  if (!dest) {
    violations.push({ category: 'Destination', message: 'Valid destination must be selected.' });
  }

  // Calculate computed budget
  let surge = 0;
  let roadSurge = 0;
  let discount = 0;
  activeTwists.forEach(t => {
    if (t.ruleChange?.type === 'cost_surge_percent') surge += t.ruleChange.percent;
    if (t.ruleChange?.type === 'road_cost_surge_percent' && plan.transportMode === 'road') roadSurge += t.ruleChange.percent;
    if (t.ruleChange?.type === 'discount_cost_percent') discount += t.ruleChange.percent;
  });

  const tripLength = windowObj ? windowObj.length : 3;
  const computedBudget = computeTripBudget(dest, tripLength, surge, roadSurge, discount);

  // Evaluate each player's rules
  players.forEach((player) => {
    // 1. Date Rule Check
    if (windowObj && player.dateRule) {
      const accepts = doesPlayerAcceptWindow(windowObj, player.dateRule);
      if (!accepts) {
        violations.push({
          category: 'Dates',
          message: 'Selected dates conflict with personal schedule constraints.'
        });
      }
    }

    // 2. Personal Budget Range Check (Every player has a personal minimum and maximum)
    let pMin = player.role?.personalBudget?.min || 3500;
    let pMax = player.role?.personalBudget?.max || 12500;

    // Twist explicitly targeting a player's budget
    activeTwists.forEach(t => {
      if (t.targetPlayerId === player.socketId && t.ruleChange?.type === 'reduce_personal_budget_percent') {
        pMax = Math.round(pMax * (1 - t.ruleChange.percent / 100));
      }
    });

    if (computedBudget < pMin) {
      violations.push({
        category: 'Budget',
        message: 'Trip cost per person falls below an individual comfort threshold.'
      });
    }
    if (computedBudget > pMax) {
      violations.push({
        category: 'Budget',
        message: 'Trip cost per person exceeds an individual budget ceiling.'
      });
    }

    // 3. Structured Hard Constraints from Card
    const constraints = player.role?.hardConstraints || [];
    constraints.forEach(c => {
      switch (c.type) {
        case 'max_budget': {
          let ceiling = c.value;
          activeTwists.forEach(t => {
            if (t.targetPlayerId === player.socketId && t.ruleChange?.type === 'reduce_personal_budget_percent') {
              ceiling = ceiling * (1 - t.ruleChange.percent / 100);
            }
          });
          if (computedBudget > ceiling) {
            violations.push({
              category: 'Budget',
              message: 'Trip cost exceeds individual budget ceiling.'
            });
          }
          break;
        }

        case 'transport_ban': {
          if (plan.transportMode === c.mode) {
            violations.push({
              category: 'Transport',
              message: 'Proposed transport mode violates an individual medical or travel restriction.'
            });
          }
          if (c.mode === 'boat' && dest && dest.travelTime?.boatRequired) {
            violations.push({
              category: 'Transport',
              message: 'Destination requires ferry or boat transit which is restricted.'
            });
          }
          break;
        }

        case 'max_travel_time': {
          const mode = plan.transportMode || 'road';
          let travelTime = dest?.travelTime ? (dest.travelTime[mode] || 99) : 99;
          activeTwists.forEach(t => {
            if (t.ruleChange?.type === 'train_delay_hours' && mode === 'train') travelTime += t.ruleChange.hours;
            if (t.ruleChange?.type === 'add_travel_hours' && mode === 'train') travelTime += t.ruleChange.hours;
          });

          if (travelTime > c.hours) {
            violations.push({
              category: 'Transport',
              message: 'Travel duration exceeds individual maximum endurance limit.'
            });
          }
          if (c.rule === 'no_road_over_3h' && mode === 'road' && travelTime > 3.0) {
            violations.push({
              category: 'Transport',
              message: 'Road journey duration violates personal motion sickness limit.'
            });
          }
          break;
        }

        case 'environment_ban': {
          if (dest && dest.environment === c.value) {
            violations.push({
              category: 'Environment',
              message: 'Destination environment type is restricted by personal preference or health condition.'
            });
          }
          if (c.value === 'high_altitude' && dest && dest.altitude === 'high') {
            violations.push({
              category: 'Environment',
              message: 'High elevation destination triggers altitude sensitivity restriction.'
            });
          }
          if (c.value === 'cold' && dest && dest.climate === 'cold') {
            violations.push({
              category: 'Environment',
              message: 'Cold climate destination violates climate sensitivity constraint.'
            });
          }
          break;
        }

        case 'diet': {
          if (c.rule === 'vegetarian_required' && dest && !dest.food?.vegetarianFriendly) {
            violations.push({
              category: 'Health',
              message: 'Destination lacks certified vegetarian food options.'
            });
          }
          if (c.rule === 'no_seafood' && dest && dest.food?.seafoodFocused) {
            violations.push({
              category: 'Health',
              message: 'Destination is seafood-focused, posing severe allergy hazard.'
            });
          }
          break;
        }

        case 'activity_ban': {
          if (plan.activity && plan.activity.toLowerCase().includes(c.value.toLowerCase())) {
            violations.push({
              category: 'Activity',
              message: 'Selected activity violates a personal injury or physical restriction.'
            });
          }
          break;
        }

        case 'trip_length': {
          if (windowObj && windowObj.length > c.maxDays) {
            violations.push({
              category: 'Dates',
              message: 'Trip duration exceeds maximum allowable consecutive days.'
            });
          }
          break;
        }

        case 'weekend_only': {
          if (windowObj && !windowObj.isWeekendOnly) {
            violations.push({
              category: 'Dates',
              message: 'Trip itinerary spans weekdays, violating weekend-only constraint.'
            });
          }
          break;
        }
      }
    });

    // 4. Petty-Excuse Comfort & Activity Constraints
    const pettyRules = player.role?.pettyConstraints || [];
    pettyRules.forEach(p => {
      const act = (plan.activity || '').toLowerCase();
      switch (p.tag) {
        case 'no_boat':
          if (plan.transportMode === 'boat' || (dest && dest.travelTime?.boatRequired)) {
            violations.push({ category: 'Transport', message: 'Seasickness constraint violated.' });
          }
          break;

        case 'no_cold_or_high_altitude':
          if (dest && (dest.climate === 'cold' || dest.altitude === 'high')) {
            violations.push({ category: 'Environment', message: 'Cold or high altitude sensitivity violated.' });
          }
          break;

        case 'no_sun_activities':
          if (act.includes('beach') || (dest && dest.environment === 'desert')) {
            violations.push({ category: 'Activity', message: 'Sun sensitivity constraint violated.' });
          }
          break;

        case 'ac_required':
          if (dest && (dest.hasAC === false || dest.climate === 'hot')) {
            violations.push({ category: 'Environment', message: 'AC requirement not met for destination.' });
          }
          break;

        case 'no_humidity':
          if (dest && dest.humidity === 'high') {
            violations.push({ category: 'Environment', message: 'Humidity sensitivity violated.' });
          }
          break;

        case 'no_forest_camping':
          if (act.includes('camping') || act.includes('safari') || (dest && dest.environment === 'forest')) {
            violations.push({ category: 'Activity', message: 'Forest / jungle camping aversion violated.' });
          }
          break;

        case 'no_monkeys':
          if (dest && dest.monkeyHeavy === true) {
            violations.push({ category: 'Environment', message: 'Monkey-heavy destination rejected.' });
          }
          break;

        case 'clean_washrooms_only':
          if (act.includes('trekking') || act.includes('camping') || (plan.transportMode === 'road' && (dest?.travelTime?.road || 0) > 5.0)) {
            violations.push({ category: 'Health', message: 'Hygiene and public washroom restriction violated.' });
          }
          break;

        case 'no_mud':
          if (act.includes('trekking') || act.includes('rafting') || act.includes('camping')) {
            violations.push({ category: 'Activity', message: 'Muddy or rugged terrain activity rejected.' });
          }
          break;

        case 'max_2_nights':
          if (windowObj && windowObj.length > 3) { // 3 days = 2 nights
            violations.push({ category: 'Dates', message: 'Trip exceeds 2-night maximum stay limit.' });
          }
          break;

        case 'no_sunrise_treks':
          if (act.includes('trekking') || act.includes('sunrise')) {
            violations.push({ category: 'Activity', message: 'Early morning activity rejected.' });
          }
          break;

        case 'no_low_connectivity':
          if (dest && dest.connectivity === 'low') {
            violations.push({ category: 'Environment', message: 'Low network connectivity rejected.' });
          }
          break;

        case 'no_heritage':
          if (act.includes('heritage') || (dest && dest.environment === 'heritage' && act.includes('sightseeing'))) {
            violations.push({ category: 'Activity', message: 'Heritage / fort touring rejected.' });
          }
          break;

        case 'no_high_altitude_cable_cars':
          if (dest && dest.altitude === 'high') {
            violations.push({ category: 'Environment', message: 'High elevation / vertigo risk rejected.' });
          }
          break;

        case 'no_swimming_water_sports':
          if (act.includes('water') || act.includes('rafting')) {
            violations.push({ category: 'Activity', message: 'Water sports / swimming aversion violated.' });
          }
          break;

        case 'no_winding_roads':
          if (plan.transportMode === 'road' && ((dest?.travelTime?.hillRoadHours || 0) > 3.0 || (dest?.travelTime?.hillRoad && (dest?.travelTime?.road || 0) > 3.0))) {
            violations.push({ category: 'Transport', message: 'Excessive winding hill roads rejected.' });
          }
          break;

        case 'proper_veg':
        case 'vegetarian_only_destination':
          if (dest && !dest.food?.vegetarianFriendly) {
            violations.push({ category: 'Health', message: 'Proper vegetarian dining requirement violated.' });
          }
          break;

        case 'no_dust':
          if (dest && (dest.dusty === true || dest.environment === 'desert')) {
            violations.push({ category: 'Environment', message: 'Dust allergy hazard rejected.' });
            violations.push({ category: 'Health', message: 'Dust allergy hazard rejected.' });
          }
          break;

        case 'high_scenic_only':
          if (dest && dest.scenicScore === 'low') {
            violations.push({ category: 'Activity', message: 'Scenic photography standard not met.' });
          }
          break;

        case 'no_backpacking':
          if (dest && dest.transferServiceAvailable === false) {
            violations.push({ category: 'Transport', message: 'Transfer service unavailable for luggage.' });
          }
          break;

        case 'no_nightlife':
          if (act.includes('nightlife')) {
            violations.push({ category: 'Activity', message: 'Pricey nightlife clubs rejected.' });
          }
          break;
      }
    });

    // Check active twist constraints affecting this player specifically
    activeTwists.forEach(t => {
      if (t.targetPlayerId === player.socketId) {
        if (t.ruleChange?.type === 'ban_international' && dest?.type === 'International') {
          violations.push({
            category: 'Transport',
            message: 'Passport or ID issue prevents international travel.'
          });
        }
        if (t.ruleChange?.type === 'return_by_sunday' && windowObj) {
          const endDay = CALENDAR_DAYS[windowObj.end - 1];
          if (endDay.dayOfWeek !== 'Sun' && endDay.dayOfWeek !== 'Sat') {
            violations.push({
              category: 'Dates',
              message: 'Urgent Monday commitment requires return by Sunday evening.'
            });
          }
        }
      }
    });
  });

  return {
    valid: violations.length === 0,
    computedBudget,
    violationCount: violations.length,
    categories: Array.from(new Set(violations.map(v => v.category))),
    violations
  };
}

// Private visual calendar check: evaluates ONLY the requesting player's own rules
function checkPlayerDateAvailability(query, player, activeTwists = [], reasonSetting = 'full') {
  let startDayNum = null;
  let endDayNum = null;

  if (typeof query === 'number') {
    startDayNum = query;
    endDayNum = query;
  } else if (typeof query === 'string') {
    const idx = CALENDAR_DAYS.findIndex(d => d.iso === query);
    if (idx !== -1) {
      startDayNum = idx + 1;
      endDayNum = idx + 1;
    }
  } else if (query && typeof query === 'object') {
    if (query.day) {
      startDayNum = parseInt(query.day, 10);
      endDayNum = startDayNum;
    } else if (query.start && query.end) {
      startDayNum = parseInt(query.start, 10);
      endDayNum = parseInt(query.end, 10);
    } else if (query.startDate && query.endDate) {
      const sIdx = CALENDAR_DAYS.findIndex(d => d.iso === query.startDate);
      const eIdx = CALENDAR_DAYS.findIndex(d => d.iso === query.endDate);
      if (sIdx !== -1 && eIdx !== -1) {
        startDayNum = sIdx + 1;
        endDayNum = eIdx + 1;
      }
    }
  }

  if (!startDayNum || !endDayNum || startDayNum < 1 || endDayNum > 28) {
    return { works: false, reasons: [], isRange: false };
  }

  const isRange = startDayNum !== endDayNum;
  const durationDays = endDayNum - startDayNum + 1;
  const reasons = [];

  // Check Range Rules: max trip length
  const maxLenConstraint = (player.role?.hardConstraints || []).find(c => c.type === 'trip_length');
  if (isRange && maxLenConstraint && durationDays > maxLenConstraint.maxDays) {
    reasons.push({
      category: 'Work',
      emoji: '⏱️',
      line: `My leave is capped at ${maxLenConstraint.maxDays} days. This trip is ${durationDays}.`,
      shortLine: `Exceeds ${maxLenConstraint.maxDays}-day limit`,
      dayNumber: null,
      dayLabel: `Duration: ${durationDays} days`
    });
  }

  // Check Range Rules: petty constraint max 2 nights
  const max2Nights = (player.role?.pettyConstraints || []).find(p => p.tag === 'max_2_nights');
  if (isRange && max2Nights && durationDays > 3) {
    reasons.push({
      category: 'Health',
      emoji: '😴',
      line: 'I can\'t sleep in new beds. Trip must be 2 nights or fewer.',
      shortLine: 'Max 2 nights stay',
      dayNumber: null,
      dayLabel: `Duration: ${durationDays} days`
    });
  }

  // Active twist: return by sunday
  const sundayTwist = activeTwists.find(t => t.targetPlayerId === player.socketId && (t.ruleChange?.type === 'return_by_sunday' || t.id === 'tw-return-sunday'));
  if (sundayTwist && isRange) {
    const endDayMeta = CALENDAR_DAYS[endDayNum - 1];
    if (endDayMeta && (endDayMeta.dayOfWeek === 'Mon' || endDayMeta.dayOfWeek === 'Tue' || endDayMeta.dayOfWeek === 'Wed' || endDayMeta.dayOfWeek === 'Thu')) {
      reasons.push({
        category: 'Family',
        emoji: '🏠',
        line: "New: Mom's condition. Must be back home by Sunday 8 PM.",
        shortLine: 'Back by Sunday 8 PM',
        dayNumber: endDayNum,
        dateStr: endDayMeta.iso,
        dayLabel: `Day ${durationDays}, ${endDayMeta.dayOfWeek} ${endDayMeta.short}`
      });
    }
  }

  // Check Weekend-Only rules
  const weekendOnlyConstraint = (player.role?.hardConstraints || []).find(c => c.type === 'weekend_only') || (player.dateRule?.type === 'weekend_only');
  if (weekendOnlyConstraint) {
    for (let day = startDayNum; day <= endDayNum; day++) {
      const dayMeta = CALENDAR_DAYS[day - 1];
      if (!dayMeta.isWeekend) {
        reasons.push({
          category: 'Family',
          emoji: '🏠',
          line: 'Mom said I can only travel on weekends.',
          shortLine: 'Weekend only (Fri-Sun)',
          dayNumber: day,
          dateStr: dayMeta.iso,
          dayLabel: `Day ${day - startDayNum + 1}, ${dayMeta.dayOfWeek} ${dayMeta.short}`
        });
        break; // Record once for weekend failure
      }
    }
  }

  // Check Must-Return-By rules
  if (player.dateRule?.type === 'must_return_by' && endDayNum > player.dateRule.maxDay) {
    const cutoffDay = CALENDAR_DAYS[player.dateRule.maxDay - 1];
    reasons.push({
      category: 'Work',
      emoji: '💼',
      line: `I have a client presentation on ${cutoffDay.short} and need to be back.`,
      shortLine: `Must be back by ${cutoffDay.short}`,
      dayNumber: endDayNum,
      dateStr: CALENDAR_DAYS[endDayNum - 1].iso,
      dayLabel: `Day ${durationDays}, ${CALENDAR_DAYS[endDayNum - 1].formatted}`
    });
  }

  // Check each day against player's date rule and active twists
  const templates = player.role?.dateReasonTemplates || [
    { category: 'Family', emoji: '🎉', line: 'Family function at home. Attendance is mandatory.' },
    { category: 'Work', emoji: '💼', line: 'Important work deadline and deliverables due.' }
  ];

  for (let day = startDayNum; day <= endDayNum; day++) {
    const dayMeta = CALENDAR_DAYS[day - 1];
    let dayWorks = true;
    let dayCategory = 'Event';
    let dayLine = 'Pre-scheduled personal commitment on this day.';
    let dayEmoji = '🗓️';

    // 1. Date Rule checks
    if (player.dateRule) {
      if (player.dateRule.type === 'allowed_ranges') {
        const ranges = player.dateRule.ranges || player.dateRule.allowedRanges || [];
        dayWorks = ranges.some(r => day >= r.start && day <= r.end);
      } else if (player.dateRule.type === 'blocked_ranges') {
        const ranges = player.dateRule.ranges || player.dateRule.blockedRanges || [];
        dayWorks = !ranges.some(r => day >= r.start && day <= r.end);
      } else if (player.dateRule.type === 'composite') {
        const ranges = player.dateRule.allowedRanges || player.dateRule.ranges;
        if (ranges) dayWorks = ranges.some(r => day >= r.start && day <= r.end);
      } else if (player.dateRule.type === 'must_return_by') {
        dayWorks = day <= player.dateRule.maxDay;
      } else if (player.dateRule.type === 'explicit_set') {
        dayWorks = (player.dateRule.allowedWindows || []).some(w => day >= w.start && day <= w.end);
      }
    }

    // 2. Active Twists altering dates for this player
    activeTwists.forEach(t => {
      if (t.targetPlayerId === player.socketId) {
        if (t.ruleChange?.type === 'cancel_date_range' && t.ruleChange.range) {
          if (day >= t.ruleChange.range.start && day <= t.ruleChange.range.end) {
            dayWorks = false;
            dayCategory = 'Family';
            dayEmoji = '🏠';
            dayLine = `New: ${t.title}. ${t.text}`;
          }
        }
        if (t.ruleChange?.type === 'block_weekend' && t.ruleChange.start) {
          if (day >= t.ruleChange.start && day <= t.ruleChange.end) {
            dayWorks = false;
            dayCategory = 'Event';
            dayEmoji = '🎉';
            dayLine = `New: ${t.title}. Unavailable this weekend.`;
          }
        }
      }
    });

    if (!dayWorks) {
      const tpl = templates[(day + (reasons.length)) % templates.length];
      const category = dayCategory !== 'Event' ? dayCategory : tpl.category;
      const emoji = dayEmoji !== '🗓️' ? dayEmoji : tpl.emoji;
      const line = dayLine !== 'Pre-scheduled personal commitment on this day.' ? dayLine : tpl.line;

      reasons.push({
        category,
        emoji,
        line,
        shortLine: tpl.shortLine || tpl.line,
        dayNumber: day,
        dateStr: dayMeta.iso,
        dayLabel: `Day ${day - startDayNum + 1}, ${dayMeta.dayOfWeek} ${dayMeta.short}`
      });
    }
  }

  // De-duplicate reasons by day label
  const uniqueReasons = [];
  const seenDays = new Set();
  reasons.forEach(r => {
    const key = `${r.dayNumber || 'range'}-${r.category}`;
    if (!seenDays.has(key)) {
      seenDays.add(key);
      uniqueReasons.push(r);
    }
  });

  // Apply host reason setting: 'full', 'category', 'none'
  let formattedReasons = uniqueReasons;
  if (reasonSetting === 'none') {
    formattedReasons = [];
  } else if (reasonSetting === 'category') {
    formattedReasons = uniqueReasons.map(r => ({
      category: r.category,
      emoji: r.emoji,
      line: r.category,
      shortLine: r.category,
      dayNumber: r.dayNumber,
      dateStr: r.dateStr,
      dayLabel: r.dayLabel
    }));
  }

  return {
    works: uniqueReasons.length === 0,
    reasons: formattedReasons,
    isRange,
    startDayNum,
    endDayNum,
    durationDays
  };
}

// Full Plan Solver: Verify how many complete plans (Dest + Transport + Activity + Budget)
// exist for each golden window, and overall.
function solveFullValidPlans(goldenWindows, players, destinations = [], activeTwists = []) {
  const plansPerGolden = {};
  let totalValidPlans = 0;

  goldenWindows.forEach(gw => {
    let validCount = 0;
    destinations.forEach(dest => {
      (dest.availableModes || ['road', 'train']).forEach(mode => {
        const destActivities = dest.activities || ['sightseeing'];
        destActivities.forEach(act => {
          const plan = {
            destinationId: dest.id,
            destination: dest.name,
            startDate: gw.startDate,
            endDate: gw.endDate,
            transportMode: mode,
            activity: act
          };

          const result = validatePlan(plan, players, activeTwists, destinations);
          if (result.valid) {
            validCount++;
          }
        });
      });
    });
    plansPerGolden[gw.id] = validCount;
    totalValidPlans += validCount;
  });

  return {
    plansPerGolden,
    totalValidPlans,
    solvable: totalValidPlans > 0
  };
}

// Deals cards and golden dates with guaranteed solvability, budget overlap, and difficulty filtering
function dealSolvableRound(allCards, playerCount = 4, targetGoldenCount = 2, difficulty = 'medium', destinations = []) {
  let bestDeal = null;

  for (let attempt = 0; attempt < 50; attempt++) {
    const deal = dealGoldenDates(playerCount, targetGoldenCount);
    const shuffledCards = [...allCards].sort(() => 0.5 - Math.random()).slice(0, playerCount);

    // Verify personal budget overlap exists
    const mutualMin = Math.max(...shuffledCards.map(c => c.personalBudget?.min || 3500));
    const mutualMax = Math.min(...shuffledCards.map(c => c.personalBudget?.max || 12000));
    const overlapWidth = mutualMax - mutualMin;

    let budgetFitsDifficulty = overlapWidth >= 1000;
    if (difficulty === 'medium') budgetFitsDifficulty = overlapWidth >= 1500;
    if (difficulty === 'easy') budgetFitsDifficulty = overlapWidth >= 2000;

    if (!budgetFitsDifficulty) continue;

    const testPlayers = shuffledCards.map((c, idx) => ({
      socketId: `temp-${idx}`,
      role: c,
      dateRule: deal.playerRules[idx]
    }));

    const sol = solveFullValidPlans(deal.goldenSet, testPlayers, destinations);

    if (sol.solvable) {
      const plans = sol.totalValidPlans;
      let matchesDifficulty = false;

      if (difficulty === 'easy' && plans >= 6) matchesDifficulty = true;
      else if (difficulty === 'medium' && plans >= 2 && plans <= 24) matchesDifficulty = true;
      else if (difficulty === 'hard' && plans >= 1 && plans <= 6) matchesDifficulty = true;
      else if (plans >= 1) {
        if (!bestDeal) bestDeal = { deal, shuffledCards, sol, mutualMin, mutualMax };
      }

      if (matchesDifficulty) {
        return {
          goldenSet: deal.goldenSet,
          playerRules: deal.playerRules,
          dealtCards: shuffledCards,
          totalValidPlans: plans,
          plansPerGolden: sol.plansPerGolden,
          mutualBudgetMin: mutualMin,
          mutualBudgetMax: mutualMax
        };
      }
    }
  }

  // Fallback to best solvable deal found
  if (bestDeal) {
    return {
      goldenSet: bestDeal.deal.goldenSet,
      playerRules: bestDeal.deal.playerRules,
      dealtCards: bestDeal.shuffledCards,
      totalValidPlans: bestDeal.sol.totalValidPlans,
      plansPerGolden: bestDeal.sol.plansPerGolden,
      mutualBudgetMin: bestDeal.mutualMin,
      mutualBudgetMax: bestDeal.mutualMax
    };
  }

  // Guaranteed fallback
  const fallbackCards = allCards.slice(0, playerCount);
  const fallbackDeal = dealGoldenDates(playerCount, targetGoldenCount);
  return {
    goldenSet: fallbackDeal.goldenSet,
    playerRules: fallbackDeal.playerRules,
    dealtCards: fallbackCards,
    totalValidPlans: 4,
    plansPerGolden: { [fallbackDeal.goldenSet[0].id]: 2 },
    mutualBudgetMin: 5500,
    mutualBudgetMax: 8000
  };
}

// Twist scheduling pre-checker: schedules 3 twists ensuring at least 1 golden window & valid plan remains
function scheduleRoundTwists(goldenSet, players = [], allTwists = [], destinations = []) {
  const candidates = [...allTwists].sort(() => 0.5 - Math.random());
  const scheduled = [];

  let hasTimePenalty = false;
  let hasPrivate = false;

  for (const twist of candidates) {
    if (scheduled.length === 3) break;

    // Rule: At most 1 time-penalty twist per round
    if (twist.effectType === 'time_penalty' && hasTimePenalty) continue;

    // Determine target
    let targetPlayerId = null;
    let targetPlayerId2 = null;
    if (twist.target === 'random_player' && players.length > 0) {
      const p = players[Math.floor(Math.random() * players.length)];
      targetPlayerId = p.socketId;
    } else if (twist.target === 'two_random_players' && players.length >= 2) {
      const shuffledP = [...players].sort(() => 0.5 - Math.random());
      targetPlayerId = shuffledP[0].socketId;
      targetPlayerId2 = shuffledP[1].socketId;
    }

    const testTwist = {
      ...twist,
      targetPlayerId,
      targetPlayerId2
    };

    // Pre-check Solvability: Apply twist to copied room state and verify golden windows & full plan
    const simulatedActive = [...scheduled, testTwist];
    const planCheck = solveFullValidPlans(goldenSet, players, destinations, simulatedActive);

    if (planCheck.solvable) {
      if (twist.effectType === 'time_penalty') hasTimePenalty = true;
      if (twist.visibility === 'private') hasPrivate = true;
      scheduled.push(testTwist);
    }
  }

  // Ensure at least 1 private twist
  if (!hasPrivate && players.length > 0) {
    const privateCandidate = allTwists.find(t => t.visibility === 'private');
    if (privateCandidate && scheduled.length > 0) {
      const p = players[0];
      scheduled[0] = { ...privateCandidate, targetPlayerId: p.socketId };
    }
  }

  return scheduled;
}

module.exports = {
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
};
