'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseSoundReturn {
  playSound: (soundName: string) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const soundUrls: Record<string, string> = {
  collision: '/sounds/collision.mp3',
  correct: '/sounds/correct.mp3',
  wrong: '/sounds/wrong.mp3',
  powerup: '/sounds/powerup.mp3',
  gameOver: '/sounds/game-over.mp3',
  pause: '/sounds/pause.mp3'
};

export function useSound(): UseSoundReturn {
  const [isMuted, setIsMuted] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  // Load sounds on mount
  useEffect(() => {
    Object.entries(soundUrls).forEach(([name, url]) => {
      const audio = new Audio();
      audio.preload = 'auto';
      
      // Set source and handle errors
      audio.src = url;
      audio.addEventListener('error', (e) => {
        console.warn(`Sound file not found: ${url}`);
      });
      
      audioRefs.current[name] = audio;
    });
  }, []);

  const playSound = useCallback((soundName: string) => {
    if (isMuted) return;

    const audio = audioRefs.current[soundName];
    if (audio && audio.readyState >= 2) { // Check if audio is loaded
      // Clone the audio to allow multiple simultaneous plays
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = 0.5; // Set default volume
      clone.play().catch(error => {
        // Silently fail - sound files are optional
      });
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    playSound,
    isMuted,
    toggleMute
  };
}