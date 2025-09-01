import { genQuestion, Operator } from './mathGen';

export interface Problem {
  a: number;
  b: number;
  operator: '+' | '-' | '×' | '÷';
  answer: number;
}

interface GenerateProblemOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  operators: string[];
}

// Map UI operators to mathGen operators
function mapOperator(op: string): Operator {
  switch (op) {
    case '+': return '+';
    case '-': return '-';
    case '×': return '×';
    case '÷': return '÷';
    default: return '+';
  }
}

export function generateProblem(options: GenerateProblemOptions): Problem {
  // Select a random operator from the enabled ones
  const operator = options.operators[Math.floor(Math.random() * options.operators.length)];
  const mathGenOp = mapOperator(operator);
  
  // Difficulty-based ranges
  let minA = 1, maxA = 10, minB = 1, maxB = 10;
  
  switch (options.difficulty) {
    case 'easy':
      if (mathGenOp === '×' || mathGenOp === '÷') {
        minA = 1; maxA = 5;
        minB = 1; maxB = 5;
      } else {
        minA = 1; maxA = 10;
        minB = 1; maxB = 10;
      }
      break;
    case 'medium':
      if (mathGenOp === '×' || mathGenOp === '÷') {
        minA = 1; maxA = 10;
        minB = 1; maxB = 10;
      } else {
        minA = 1; maxA = 20;
        minB = 1; maxB = 20;
      }
      break;
    case 'hard':
      if (mathGenOp === '×' || mathGenOp === '÷') {
        minA = 1; maxA = 12;
        minB = 1; maxB = 12;
      } else {
        minA = 10; maxA = 50;
        minB = 10; maxB = 50;
      }
      break;
  }
  
  const question = genQuestion(mathGenOp, minA, maxA, minB, maxB, false);
  
  return {
    a: question.a,
    b: question.b,
    operator: question.op,
    answer: question.answer
  };
}

export function checkAnswer(problem: Problem, userAnswer: number): boolean {
  return problem.answer === userAnswer;
}