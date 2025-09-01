// Test file for mathGen module
import { genQuestion, genQuestionSet, selfTest } from './lib/mathGen';

// Run the self-test
console.log('Running self-test...');
if (selfTest()) {
  console.log('Self-test passed!');
} else {
  console.log('Self-test failed!');
}

// Test individual questions
console.log('\nTesting individual questions:');

// Test division
console.log('\nDivision tests:');
for (let i = 0; i < 5; i++) {
  const q = genQuestion('÷', 1, 10, 1, 10);
  console.log(`${q.a} ÷ ${q.b} = ${q.answer} (check: ${q.a / q.b})`);
}

// Test subtraction with allowNegative = false
console.log('\nSubtraction tests (no negatives):');
for (let i = 0; i < 5; i++) {
  const q = genQuestion('-', 1, 10, 1, 10, false);
  console.log(`${q.a} - ${q.b} = ${q.answer}`);
}

// Test subtraction with allowNegative = true
console.log('\nSubtraction tests (allow negatives):');
for (let i = 0; i < 5; i++) {
  const q = genQuestion('-', 1, 10, 1, 10, true);
  console.log(`${q.a} - ${q.b} = ${q.answer}`);
}

// Test question sets
console.log('\nTesting question sets:');
const addSet = genQuestionSet(3, '+', 1, 10, 1, 10);
console.log('Addition set:', addSet);

const multSet = genQuestionSet(3, '×', 1, 5, 1, 5);
console.log('Multiplication set:', multSet);