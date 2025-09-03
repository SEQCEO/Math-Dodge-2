import { genQuestionFromSettings, genQuestionSetFromSettings } from '../lib/mathGen';
import { GameSettings } from '../lib/gameSettingsTypes';

// Mock settings for testing
const createTestSettings = (overrides: Partial<GameSettings> = {}): GameSettings => ({
  operators: { add: true, sub: true, mul: true, div: true },
  ranges: {
    add: { a: { min: 1, max: 10 }, b: { min: 1, max: 10 } },
    sub: { a: { min: 1, max: 10 }, b: { min: 1, max: 10 } },
    mul: { a: { min: 6, max: 9 }, b: { min: 2, max: 12 } },
    div: { a: { min: 1, max: 10 }, b: { min: 1, max: 10 } }
  },
  bpm: 30,
  maxActiveBubbles: 15,
  secondsPerQuestion: 15,
  questionTimeLimitSeconds: 15,
  failFast: false,
  sound: true,
  showMobileControls: true,
  escalation: {
    enabled: true,
    idleStartSeconds: 10,
    maxSpawnMultiplier: 2.0,
    maxSizeMultiplier: 1.4,
    rampSeconds: 10,
    curve: 'linear'
  },
  scoring: {
    basePoints: 100,
    bucketSeconds: 2,
    fastBonusPctAtZero: 100,
    slowBonusPctAtTimeout: 0
  },
  ...overrides
});

// Test that questions respect operator toggles
export function testOperatorFiltering() {
  console.log('\n=== Testing Operator Filtering ===');
  
  // Test with only multiplication enabled
  const mulOnlySettings = createTestSettings({
    operators: { add: false, sub: false, mul: true, div: false },
    ranges: {
      mul: { a: { min: 6, max: 9 }, b: { min: 2, max: 12 } }
    }
  });
  
  const mulQuestions = genQuestionSetFromSettings(1000, mulOnlySettings);
  const operators = new Set(mulQuestions.map(q => q.op));
  
  console.log('Multiplication-only test:');
  console.log('- Operators found:', Array.from(operators));
  console.log('- Test passed:', operators.size === 1 && operators.has('×'));
  
  // Test with subtraction disabled
  const noSubSettings = createTestSettings({
    operators: { add: true, sub: false, mul: true, div: true }
  });
  
  const noSubQuestions = genQuestionSetFromSettings(1000, noSubSettings);
  const noSubOperators = new Set(noSubQuestions.map(q => q.op));
  
  console.log('\nSubtraction disabled test:');
  console.log('- Operators found:', Array.from(noSubOperators));
  console.log('- Test passed:', !noSubOperators.has('-'));
  
  // Test with all operators disabled (should return empty)
  const noOpsSettings = createTestSettings({
    operators: { add: false, sub: false, mul: false, div: false }
  });
  
  const noOpsQuestion = genQuestionFromSettings(noOpsSettings);
  console.log('\nAll operators disabled test:');
  console.log('- Result:', noOpsQuestion);
  console.log('- Test passed:', noOpsQuestion === null);
}

// Test that questions respect ranges
export function testRangeEnforcement() {
  console.log('\n=== Testing Range Enforcement ===');
  
  const settings = createTestSettings({
    operators: { add: false, sub: false, mul: true, div: false },
    ranges: {
      mul: { a: { min: 6, max: 9 }, b: { min: 2, max: 12 } }
    }
  });
  
  const questions = genQuestionSetFromSettings(10000, settings);
  
  // Check all values are within range
  let minA = Infinity, maxA = -Infinity;
  let minB = Infinity, maxB = -Infinity;
  let violations = 0;
  
  for (const q of questions) {
    minA = Math.min(minA, q.a);
    maxA = Math.max(maxA, q.a);
    minB = Math.min(minB, q.b);
    maxB = Math.max(maxB, q.b);
    
    if (q.a < 6 || q.a > 9 || q.b < 2 || q.b > 12) {
      violations++;
    }
  }
  
  console.log(`Range test over ${questions.length} questions:`);
  console.log(`- A range: [${minA}, ${maxA}] (expected [6, 9])`);
  console.log(`- B range: [${minB}, ${maxB}] (expected [2, 12])`);
  console.log(`- Violations: ${violations}`);
  console.log(`- Test passed: ${violations === 0 && minA >= 6 && maxA <= 9 && minB >= 2 && maxB <= 12}`);
  
  // Show distribution
  const aDistribution = new Map<number, number>();
  const bDistribution = new Map<number, number>();
  
  for (const q of questions.slice(0, 1000)) {
    aDistribution.set(q.a, (aDistribution.get(q.a) || 0) + 1);
    bDistribution.set(q.b, (bDistribution.get(q.b) || 0) + 1);
  }
  
  console.log('\nFirst operand distribution (sample of 1000):');
  for (let i = 6; i <= 9; i++) {
    console.log(`  ${i}: ${aDistribution.get(i) || 0}`);
  }
}

// Test division always produces integers
export function testDivisionIntegerResults() {
  console.log('\n=== Testing Division Integer Results ===');
  
  const settings = createTestSettings({
    operators: { add: false, sub: false, mul: false, div: true },
    ranges: {
      div: { a: { min: 1, max: 20 }, b: { min: 1, max: 10 } }
    }
  });
  
  const questions = genQuestionSetFromSettings(1000, settings);
  let nonIntegerCount = 0;
  let divisionByZero = 0;
  
  for (const q of questions) {
    if (q.b === 0) {
      divisionByZero++;
    } else if (q.a % q.b !== 0) {
      nonIntegerCount++;
      console.log(`Non-integer division found: ${q.a} ÷ ${q.b} = ${q.a / q.b}`);
    }
  }
  
  console.log(`Division test over ${questions.length} questions:`);
  console.log(`- Non-integer results: ${nonIntegerCount}`);
  console.log(`- Division by zero: ${divisionByZero}`);
  console.log(`- Test passed: ${nonIntegerCount === 0 && divisionByZero === 0}`);
}

// Simulate spawn rate test
export function testSpawnRate() {
  console.log('\n=== Testing Spawn Rate ===');
  
  const bpm = 240; // 4 per second
  const maxBubbles = 100;
  const simulationTime = 30; // seconds
  
  let time = 0;
  let spawnTimer = 0;
  let bubbleCount = 0;
  let spawnCount = 0;
  const spawnTimes: number[] = [];
  
  const dt = 16 / 1000; // 16ms per frame
  const spawnInterval = 60 / bpm;
  
  while (time < simulationTime) {
    time += dt;
    spawnTimer += dt;
    
    if (spawnTimer >= spawnInterval && bubbleCount < maxBubbles) {
      spawnTimer = 0;
      bubbleCount++;
      spawnCount++;
      spawnTimes.push(time);
    }
    
    // Simulate bubble removal (some bubbles leave screen)
    if (Math.random() < 0.02 && bubbleCount > 0) {
      bubbleCount--;
    }
  }
  
  const expectedSpawns = bpm * (simulationTime / 60);
  const accuracy = (spawnCount / expectedSpawns) * 100;
  
  console.log(`Spawn rate test (${bpm} BPM for ${simulationTime}s):`);
  console.log(`- Expected spawns: ${expectedSpawns}`);
  console.log(`- Actual spawns: ${spawnCount}`);
  console.log(`- Accuracy: ${accuracy.toFixed(1)}%`);
  console.log(`- Test passed: ${accuracy >= 90 && accuracy <= 110}`);
  
  // Check spawn timing consistency
  if (spawnTimes.length > 10) {
    const intervals = [];
    for (let i = 1; i < spawnTimes.length; i++) {
      intervals.push(spawnTimes[i] - spawnTimes[i-1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const expectedInterval = 60 / bpm;
    console.log(`\nSpawn interval consistency:`);
    console.log(`- Expected interval: ${expectedInterval.toFixed(3)}s`);
    console.log(`- Average interval: ${avgInterval.toFixed(3)}s`);
    console.log(`- Variance: ${Math.abs(avgInterval - expectedInterval).toFixed(3)}s`);
  }
}

// Run all tests
export function runAllTests() {
  console.log('Running Math Dodge Settings Tests...');
  console.log('=====================================');
  
  testOperatorFiltering();
  testRangeEnforcement();
  testDivisionIntegerResults();
  testSpawnRate();
  
  console.log('\n=====================================');
  console.log('All tests completed!');
}

// Export for command line execution
if (require.main === module) {
  runAllTests();
}