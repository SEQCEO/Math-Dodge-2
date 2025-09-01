import React from 'react';
import { Heart, Pause } from 'lucide-react';

interface HudBarProps {
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  streak: number;
  onPause: () => void;
}

export function HudBar({
  score,
  lives,
  maxLives,
  speed,
  streak,
  onPause
}: HudBarProps) {
  return (
    <header 
      className="fixed top-0 left-0 right-0 z-10 bg-gray-800 text-white p-4 shadow-lg"
      role="banner"
      aria-label="Game status"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          {/* Score */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400" aria-label="Score label">Score</span>
            <span className="text-xl font-bold" aria-label={`Score: ${score}`}>{score}</span>
          </div>

          {/* Lives */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400" aria-label="Lives label">Lives</span>
            <div className="flex space-x-1" role="img" aria-label={`${lives} lives remaining out of ${maxLives}`}>
              {Array.from({ length: maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  size={20}
                  className={i < lives ? 'fill-red-500 text-red-500' : 'text-gray-600'}
                  aria-hidden="true"
                />
              ))}
            </div>
          </div>

          {/* Speed */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400" aria-label="Speed label">Speed</span>
            <span className="text-xl font-bold" aria-label={`Speed: ${speed}x`}>{speed}x</span>
          </div>

          {/* Streak */}
          <div className="flex flex-col">
            <span className="text-xs text-gray-400" aria-label="Streak label">Streak</span>
            <span className="text-xl font-bold" aria-label={`Streak: ${streak}`}>{streak}</span>
          </div>
        </div>

        {/* Pause Button */}
        <button
          onClick={onPause}
          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Pause game"
        >
          <Pause size={24} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}