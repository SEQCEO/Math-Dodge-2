'use client';

import { useState, useEffect } from 'react';
import { loadSettings, saveSettings, GameSettings, defaultSettings } from '@/lib/settings';

interface UseGameSettingsReturn {
  settings: GameSettings & {
    difficulty: 'easy' | 'medium' | 'hard';
    enabledOperators: string[];
    questionsPerCollision: number;
    bubbleSpawnRate: number;
    showMobileControls: boolean;
  };
  updateSettings: (newSettings: Partial<GameSettings>) => Promise<void>;
  loading: boolean;
}

export function useGameSettings(): UseGameSettingsReturn {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const loaded = await loadSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<GameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveSettings(updated);
  };

  // Transform settings to match the expected interface
  const transformedSettings = {
    ...settings,
    difficulty: settings.difficulty || 'medium' as 'easy' | 'medium' | 'hard',
    enabledOperators: Object.entries(settings.allowedOperators)
      .filter(([_, enabled]) => enabled)
      .map(([op]) => {
        switch (op) {
          case 'addition': return '+';
          case 'subtraction': return '-';
          case 'multiplication': return '×';
          case 'division': return '÷';
          default: return '+';
        }
      }),
    questionsPerCollision: 3, // Default value
    bubbleSpawnRate: settings.difficulty === 'easy' ? 0.5 : settings.difficulty === 'hard' ? 2 : 1,
    showMobileControls: false // Default value
  };

  return {
    settings: transformedSettings,
    updateSettings,
    loading
  };
}