export type Operator = 'mul' | 'div' | 'add' | 'sub';

export interface GameSettings {
  startingLives: number;
  bubbleSpeed: number;
  spawnInterval: number;
  maxBubbles: number;
  soundEnabled: boolean;
  playerSpeed: number;
  bubbleRadius: number;
  playerWidth: number;
  playerHeight: number;
  scoreMultiplier: number;
  difficultyIncrease: number;
  maxDifficulty: number;
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  value: number;
  operator: Operator;
  speed: number;
  radius: number;
}