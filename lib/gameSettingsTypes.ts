// Canonical game settings types
export type Operator = 'add' | 'sub' | 'mul' | 'div';

export interface Range {
  min: number;
  max: number;
}

export interface GameSettings {
  operators: {
    add: boolean;
    sub: boolean;
    mul: boolean;
    div: boolean;
  };
  ranges: {
    add?: { a: Range; b: Range };
    sub?: { a: Range; b: Range };
    mul?: { a: Range; b: Range };
    div?: { a: Range; b: Range };
  };
  bpm: number;                    // bubbles per minute
  maxActiveBubbles: number;       // hard cap on screen
  secondsPerQuestion: number;     // deprecated, use questionTimeLimitSeconds
  questionTimeLimitSeconds: number; // 5-30, default 15
  failFast: boolean;
  sound: boolean;
  showMobileControls: boolean;
  
  escalation: {
    enabled: boolean;              // default true
    idleStartSeconds: number;      // after this no-collision time, start ramp (default 10)
    maxSpawnMultiplier: number;    // cap multiplier on BPM (e.g. 2.0 = 200%)
    maxSizeMultiplier: number;     // cap multiplier on radius (e.g. 1.4 = +40%)
    rampSeconds: number;           // time from start→max (default 10)
    curve: 'linear' | 'easeIn' | 'easeOut'; // default 'linear'
  };

  scoring: {
    basePoints: number;            // default 100
    bucketSeconds: number;         // default 2 (tier width)
    fastBonusPctAtZero: number;    // default 100 (% bonus at instant answer)
    slowBonusPctAtTimeout: number; // default 0 (% bonus at last millisecond)
  };
}

// Helper to convert from existing operator names to canonical ones
export function toCanonicalOperator(op: string): Operator | null {
  switch (op) {
    case '+':
    case 'addition':
      return 'add';
    case '-':
    case 'subtraction':
      return 'sub';
    case '×':
    case '*':
    case 'multiplication':
      return 'mul';
    case '÷':
    case '/':
    case 'division':
      return 'div';
    default:
      return null;
  }
}

// Helper to convert from canonical operators to math symbols
export function toMathSymbol(op: Operator): '+' | '-' | '×' | '÷' {
  switch (op) {
    case 'add': return '+';
    case 'sub': return '-';
    case 'mul': return '×';
    case 'div': return '÷';
  }
}

// Helper to get active operators from settings
export function getActiveOperators(settings: GameSettings): Operator[] {
  return (Object.keys(settings.operators) as Operator[])
    .filter(op => settings.operators[op]);
}

// Helper to sanitize ranges (swap if min>max, clamp to reasonable bounds)
export function sanitizeRange(range: Range, minBound = 1, maxBound = 100): Range {
  let min = Math.max(minBound, Math.min(range.min, range.max));
  let max = Math.max(min, Math.max(range.min, range.max));
  max = Math.min(max, maxBound);
  return { min, max };
}

// Convert from ExtendedGameSettings to GameSettings
export function toCanonicalSettings(extended: any): GameSettings {
  const settings: GameSettings = {
    operators: {
      add: extended.operators?.addition?.enabled ?? true,
      sub: extended.operators?.subtraction?.enabled ?? true,
      mul: extended.operators?.multiplication?.enabled ?? true,  
      div: extended.operators?.division?.enabled ?? true
    },
    ranges: {},
    bpm: extended.bubblesPerMinute ?? 30,
    maxActiveBubbles: extended.maxActiveBubbles ?? 15,
    secondsPerQuestion: extended.secondsPerQuestion ?? 15,
    questionTimeLimitSeconds: extended.questionTimeLimitSeconds ?? extended.secondsPerQuestion ?? 15,
    failFast: extended.failFast ?? false,
    sound: extended.soundEnabled ?? true,
    showMobileControls: extended.mobileControls ?? true,
    escalation: {
      enabled: extended.escalation?.enabled ?? true,
      idleStartSeconds: extended.escalation?.idleStartSeconds ?? 10,
      maxSpawnMultiplier: extended.escalation?.maxSpawnMultiplier ?? 2.0,
      maxSizeMultiplier: extended.escalation?.maxSizeMultiplier ?? 1.4,
      rampSeconds: extended.escalation?.rampSeconds ?? 10,
      curve: extended.escalation?.curve ?? 'linear'
    },
    scoring: {
      basePoints: extended.scoring?.basePoints ?? 100,
      bucketSeconds: extended.scoring?.bucketSeconds ?? 2,
      fastBonusPctAtZero: extended.scoring?.fastBonusPctAtZero ?? 100,
      slowBonusPctAtTimeout: extended.scoring?.slowBonusPctAtTimeout ?? 0
    }
  };

  // Convert ranges for enabled operators
  if (settings.operators.add && extended.operators?.addition) {
    settings.ranges.add = {
      a: sanitizeRange({ min: extended.operators.addition.minA, max: extended.operators.addition.maxA }),
      b: sanitizeRange({ min: extended.operators.addition.minB, max: extended.operators.addition.maxB })
    };
  }
  
  if (settings.operators.sub && extended.operators?.subtraction) {
    settings.ranges.sub = {
      a: sanitizeRange({ min: extended.operators.subtraction.minA, max: extended.operators.subtraction.maxA }),
      b: sanitizeRange({ min: extended.operators.subtraction.minB, max: extended.operators.subtraction.maxB })
    };
  }
  
  if (settings.operators.mul && extended.operators?.multiplication) {
    settings.ranges.mul = {
      a: sanitizeRange({ min: extended.operators.multiplication.minA, max: extended.operators.multiplication.maxA }, 1, 20),
      b: sanitizeRange({ min: extended.operators.multiplication.minB, max: extended.operators.multiplication.maxB }, 1, 20)
    };
  }
  
  if (settings.operators.div && extended.operators?.division) {
    settings.ranges.div = {
      a: sanitizeRange({ min: extended.operators.division.minA, max: extended.operators.division.maxA }, 1, 20),
      b: sanitizeRange({ min: extended.operators.division.minB, max: extended.operators.division.maxB }, 1, 20)
    };
  }

  return settings;
}

// Random integer helper
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}