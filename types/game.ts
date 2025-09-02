export interface Problem {
  a: number;
  b: number;
  operator: '+' | '-' | '×' | '÷';
  answer: number;
}

export type BubbleKind = 'hazard' | 'op';

export interface Bubble {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  kind: BubbleKind;
  operator?: string;
  color: string;
}

export interface GameState {
  lives: number;
  score: number;
  streak: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  showQuiz: boolean;
  bubbles: Bubble[];
  playerX: number;
  playerY: number;
  currentSpeedMultiplier: number;
}