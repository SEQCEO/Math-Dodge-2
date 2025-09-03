import { genQuestion, MathOperator, genQuestionFromSettings } from './mathGen';
import { GameSettings, toCanonicalOperator, toMathSymbol, toCanonicalSettings } from './gameSettingsTypes';

export interface Problem {
  a: number;
  b: number;
  operator: '+' | '-' | '×' | '÷';
  answer: number;
}

interface GenerateProblemOptions {
  difficulty?: 'easy' | 'medium' | 'hard';
  operators?: string[];
  settings?: any; // ExtendedGameSettings
  specificOperator?: string; // When we want problems for a specific operator only
}

// Map UI operators to mathGen operators
function mapOperator(op: string): MathOperator {
  switch (op) {
    case '+': return '+';
    case '-': return '-';
    case '×': return '×';
    case '÷': return '÷';
    default: return '+';
  }
}

export function generateProblem(options: GenerateProblemOptions): Problem {
  // If we have settings, use them to generate questions with proper ranges
  if (options.settings) {
    const canonicalSettings = toCanonicalSettings(options.settings);
    
    // If a specific operator is requested (e.g., from bubble collision)
    if (options.specificOperator) {
      const canonicalOp = toCanonicalOperator(options.specificOperator);
      if (!canonicalOp || !canonicalSettings.operators[canonicalOp]) {
        // Fallback to old behavior if operator is invalid or disabled
        return generateProblemLegacy(options);
      }
      
      // Create a temporary settings object with only the requested operator enabled
      const tempSettings: GameSettings = {
        ...canonicalSettings,
        operators: {
          add: canonicalOp === 'add',
          sub: canonicalOp === 'sub',
          mul: canonicalOp === 'mul',
          div: canonicalOp === 'div'
        }
      };
      
      const question = genQuestionFromSettings(tempSettings, options.settings.operators?.subtraction?.allowNegative ?? false);
      if (question) {
        return {
          a: question.a,
          b: question.b,
          operator: question.op,
          answer: question.answer
        };
      }
    } else {
      // Generate from any enabled operator
      const question = genQuestionFromSettings(canonicalSettings, options.settings.operators?.subtraction?.allowNegative ?? false);
      if (question) {
        return {
          a: question.a,
          b: question.b,
          operator: question.op,
          answer: question.answer
        };
      }
    }
  }
  
  // Fallback to legacy behavior
  return generateProblemLegacy(options);
}

// Legacy problem generation for backward compatibility
function generateProblemLegacy(options: GenerateProblemOptions): Problem {
  // Select a random operator from the enabled ones
  const operators = options.operators || ['+'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
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