export interface Problem {
  a: number;
  b: number;
  operator: '+' | '-' | '×' | '÷';
  answer: number;
}

export interface Bubble {
  id: number;
  x: number;
  y: number;
  speed: number;
  operator: string;
  color: string;
  isPenalty?: boolean;
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