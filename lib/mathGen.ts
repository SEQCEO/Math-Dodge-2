export type Operator = '+' | '-' | '×' | '÷';

export type Q = {
  a: number;
  b: number;
  op: Operator;
  answer: number;
};

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function genQuestion(
  op: Operator,
  minA: number,
  maxA: number,
  minB: number,
  maxB: number,
  allowNegative: boolean = false
): Q {
  let a = randomInt(minA, maxA);
  let b = randomInt(minB, maxB);
  let answer: number;

  switch (op) {
    case '+':
      answer = a + b;
      break;
    
    case '-':
      answer = a - b;
      // If negative answers aren't allowed and result is negative, swap a and b
      if (!allowNegative && answer < 0) {
        [a, b] = [b, a];
        answer = a - b;
      }
      break;
    
    case '×':
      answer = a * b;
      break;
    
    case '÷':
      // For division, we generate it as (a*b) ÷ a = b to ensure integer results
      // First generate the answer (b) and divisor (a), then calculate dividend
      const divisor = randomInt(minA, maxA);
      const quotient = randomInt(minB, maxB);
      a = divisor * quotient; // This ensures a ÷ divisor = quotient (integer)
      b = divisor;
      answer = quotient;
      break;
    
    default:
      throw new Error(`Unknown operator: ${op}`);
  }

  return { a, b, op, answer };
}

export function genQuestionSet(
  n: number,
  op: Operator,
  minA: number,
  maxA: number,
  minB: number,
  maxB: number,
  allowNegative: boolean = false
): Q[] {
  const questions: Q[] = [];
  
  for (let i = 0; i < n; i++) {
    questions.push(genQuestion(op, minA, maxA, minB, maxB, allowNegative));
  }
  
  return questions;
}

// Self-test function to validate division always produces integers
export function selfTest(): boolean {
  console.log('Running mathGen self-test...');
  
  // Test division specifically
  for (let i = 0; i < 100; i++) {
    const q = genQuestion('÷', 1, 10, 1, 10);
    const actualAnswer = q.a / q.b;
    
    if (!Number.isInteger(actualAnswer)) {
      console.error(`Division test failed: ${q.a} ÷ ${q.b} = ${actualAnswer} (not an integer)`);
      return false;
    }
    
    if (actualAnswer !== q.answer) {
      console.error(`Division test failed: ${q.a} ÷ ${q.b} = ${actualAnswer}, expected ${q.answer}`);
      return false;
    }
  }
  
  // Test subtraction with allowNegative = false
  for (let i = 0; i < 100; i++) {
    const q = genQuestion('-', 1, 10, 1, 10, false);
    
    if (q.answer < 0) {
      console.error(`Subtraction test failed: ${q.a} - ${q.b} = ${q.answer} (negative when not allowed)`);
      return false;
    }
  }
  
  console.log('All tests passed!');
  return true;
}