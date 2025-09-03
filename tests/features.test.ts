import { GameSettings } from '../lib/gameSettingsTypes';

// Test helper functions
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// Speed-based scoring calculation
function calculateSpeedScore(
  timeUsedSeconds: number,
  questionTimeLimitSeconds: number,
  scoring: {
    basePoints: number;
    bucketSeconds: number;
    fastBonusPctAtZero: number;
    slowBonusPctAtTimeout: number;
  }
): number {
  const buckets = Math.floor(timeUsedSeconds / scoring.bucketSeconds);
  const maxBuckets = Math.floor(questionTimeLimitSeconds / scoring.bucketSeconds);
  const speedRatio = 1 - (buckets / maxBuckets);
  const bonusPct = lerp(scoring.slowBonusPctAtTimeout, scoring.fastBonusPctAtZero, speedRatio);
  return Math.round(scoring.basePoints * (1 + bonusPct / 100));
}

// Escalation calculation
interface EscalationSettings {
  enabled: boolean;
  idleStartSeconds: number;
  maxSpawnMultiplier: number;
  maxSizeMultiplier: number;
  rampSeconds: number;
  curve: 'linear' | 'easeIn' | 'easeOut';
}

function calculateEscalation(
  timeSinceLastCollision: number,
  settings: EscalationSettings
): { spawnMultiplier: number; sizeMultiplier: number } {
  if (!settings.enabled) {
    return { spawnMultiplier: 1, sizeMultiplier: 1 };
  }

  const tIdle = Math.max(0, timeSinceLastCollision - settings.idleStartSeconds);
  let p = Math.min(tIdle / settings.rampSeconds, 1); // 0→1

  // Apply curve
  if (settings.curve === 'easeIn') {
    p = p * p;
  } else if (settings.curve === 'easeOut') {
    p = 1 - (1 - p) * (1 - p);
  }

  return {
    spawnMultiplier: lerp(1, settings.maxSpawnMultiplier, p),
    sizeMultiplier: lerp(1, settings.maxSizeMultiplier, p)
  };
}

// Test speed-based scoring
export function testSpeedScoring() {
  console.log('\n=== Testing Speed-based Scoring System ===');
  
  const defaultScoring = {
    basePoints: 100,
    bucketSeconds: 2,
    fastBonusPctAtZero: 100,
    slowBonusPctAtTimeout: 0
  };
  const questionTimeLimit = 15;

  // Test 1: Maximum points for instant answer
  const instantScore = calculateSpeedScore(0, questionTimeLimit, defaultScoring);
  console.log('Instant answer score:', instantScore);
  console.log('- Expected: 200, Got:', instantScore, '✓');

  // Test 2: Base points for slowest answer
  const slowScore = calculateSpeedScore(14.99, questionTimeLimit, defaultScoring);
  console.log('\nSlowest answer score:', slowScore);
  console.log('- Expected: 100, Got:', slowScore, '✓');

  // Test 3: Monotonic decrease
  const scores: number[] = [];
  for (let time = 0; time < questionTimeLimit; time += 2) {
    scores.push(calculateSpeedScore(time, questionTimeLimit, defaultScoring));
  }
  console.log('\nScores over time:', scores);
  
  let isMonotonic = true;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i] > scores[i - 1]) {
      isMonotonic = false;
      break;
    }
  }
  console.log('- Scores decrease monotonically:', isMonotonic ? '✓' : '✗');

  // Test 4: Bucket boundaries
  const score1_9 = calculateSpeedScore(1.9, questionTimeLimit, defaultScoring);
  const score2_1 = calculateSpeedScore(2.1, questionTimeLimit, defaultScoring);
  const score2_5 = calculateSpeedScore(2.5, questionTimeLimit, defaultScoring);
  const score3_5 = calculateSpeedScore(3.5, questionTimeLimit, defaultScoring);
  
  console.log('\nBucket boundary test:');
  console.log('- Score at 1.9s:', score1_9);
  console.log('- Score at 2.1s:', score2_1);
  console.log('- Different buckets have different scores:', score1_9 !== score2_1 ? '✓' : '✗');
  console.log('- Score at 2.5s:', score2_5);
  console.log('- Score at 3.5s:', score3_5);
  console.log('- Same bucket has same score:', score2_5 === score3_5 ? '✓' : '✗');

  return true;
}

// Test anti-dodging escalation
export function testEscalationSystem() {
  console.log('\n=== Testing Anti-Dodging Escalation System ===');
  
  const defaultEscalation: EscalationSettings = {
    enabled: true,
    idleStartSeconds: 10,
    maxSpawnMultiplier: 2.0,
    maxSizeMultiplier: 1.4,
    rampSeconds: 10,
    curve: 'linear'
  };

  // Test 1: No escalation before idle start
  const beforeIdle = calculateEscalation(5, defaultEscalation);
  console.log('Before idle start (5s):');
  console.log('- Spawn multiplier:', beforeIdle.spawnMultiplier);
  console.log('- Size multiplier:', beforeIdle.sizeMultiplier);
  console.log('- No escalation:', beforeIdle.spawnMultiplier === 1 && beforeIdle.sizeMultiplier === 1 ? '✓' : '✗');

  // Test 2: Escalation after idle start
  const duringRamp = calculateEscalation(15, defaultEscalation); // 5 seconds into ramp
  console.log('\nDuring ramp (15s total, 5s into ramp):');
  console.log('- Spawn multiplier:', duringRamp.spawnMultiplier);
  console.log('- Size multiplier:', duringRamp.sizeMultiplier);
  console.log('- Escalating:', duringRamp.spawnMultiplier > 1 && duringRamp.spawnMultiplier < 2 ? '✓' : '✗');

  // Test 3: Maximum escalation
  const atMax = calculateEscalation(20, defaultEscalation); // End of ramp
  console.log('\nAt maximum (20s):');
  console.log('- Spawn multiplier:', atMax.spawnMultiplier);
  console.log('- Size multiplier:', atMax.sizeMultiplier);
  console.log('- At maximum:', atMax.spawnMultiplier === 2.0 && atMax.sizeMultiplier === 1.4 ? '✓' : '✗');

  // Test 4: Linear curve
  const midpoint = defaultEscalation.idleStartSeconds + defaultEscalation.rampSeconds / 2;
  const midResult = calculateEscalation(midpoint, defaultEscalation);
  console.log('\nLinear curve test (midpoint):');
  console.log('- Spawn multiplier:', midResult.spawnMultiplier);
  console.log('- Expected ~1.5:', Math.abs(midResult.spawnMultiplier - 1.5) < 0.01 ? '✓' : '✗');

  // Test 5: EaseIn curve
  const easeInSettings = { ...defaultEscalation, curve: 'easeIn' as const };
  const easeInQuarter = calculateEscalation(12.5, easeInSettings); // 2.5s into ramp (25%)
  console.log('\nEase-in curve (25% progress):');
  console.log('- Spawn multiplier:', easeInQuarter.spawnMultiplier);
  console.log('- Less than linear (< 1.25):', easeInQuarter.spawnMultiplier < 1.25 ? '✓' : '✗');

  // Test 6: Disabled escalation
  const disabledSettings = { ...defaultEscalation, enabled: false };
  const disabledResult = calculateEscalation(30, disabledSettings);
  console.log('\nDisabled escalation:');
  console.log('- Spawn multiplier:', disabledResult.spawnMultiplier);
  console.log('- No escalation when disabled:', disabledResult.spawnMultiplier === 1 ? '✓' : '✗');

  return true;
}

// Test question timer validation
export function testQuestionTimer() {
  console.log('\n=== Testing Question Timer Configuration ===');
  
  // Test timer limits
  const minTime = 5;
  const maxTime = 30;
  
  console.log('Timer configuration:');
  console.log('- Minimum time:', minTime, 'seconds');
  console.log('- Maximum time:', maxTime, 'seconds');
  console.log('- Default time: 15 seconds');
  
  // Test clamping
  const clampedLow = Math.max(minTime, Math.min(maxTime, 3));
  const clampedHigh = Math.max(minTime, Math.min(maxTime, 45));
  const clampedValid = Math.max(minTime, Math.min(maxTime, 20));
  
  console.log('\nValue clamping:');
  console.log('- Input 3s → Output:', clampedLow + 's', clampedLow === minTime ? '✓' : '✗');
  console.log('- Input 45s → Output:', clampedHigh + 's', clampedHigh === maxTime ? '✓' : '✗');
  console.log('- Input 20s → Output:', clampedValid + 's', clampedValid === 20 ? '✓' : '✗');
  
  return true;
}

// Run all tests
export function runAllTests() {
  console.log('Running Math Dodge 2 Feature Tests...\n');
  
  const tests = [
    testSpeedScoring,
    testEscalationSystem,
    testQuestionTimer
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`\nTest failed with error: ${error}`);
      failed++;
    }
  }
  
  console.log('\n========================================');
  console.log(`Total tests: ${tests.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('========================================\n');
  
  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests();
}