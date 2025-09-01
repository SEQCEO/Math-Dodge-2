'use client';

import { useState, useEffect } from 'react';
import { loadGameSettings, saveGameSettings, ExtendedGameSettings, defaultGameSettings } from '@/lib/gameSettings';

interface UseGameSettingsReturn {
  settings: ExtendedGameSettings & {
    difficulty: 'easy' | 'medium' | 'hard';
    enabledOperators: string[];
    questionsPerCollision: number;
    bubbleSpawnRate: number;
    showMobileControls: boolean;
  };
  updateSettings: (newSettings: Partial<ExtendedGameSettings>) => Promise<void>;
  loading: boolean;
}

export function useGameSettings(): UseGameSettingsReturn {
  const [settings, setSettings] = useState<ExtendedGameSettings>(defaultGameSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const loaded = await loadGameSettings();
        setSettings(loaded);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<ExtendedGameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    await saveGameSettings(updated);
  };

  // Transform settings to match the expected interface
  const enabledOps = Object.entries(settings.operators)
    .filter(([_, config]) => config.enabled)
    .map(([op]) => {
      switch (op) {
        case 'addition': return '+';
        case 'subtraction': return '-';
        case 'multiplication': return '×';
        case 'division': return '÷';
        default: return '+';
      }
    });
  
  const transformedSettings = {
    ...settings,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard', // Default difficulty
    enabledOperators: enabledOps,
    questionsPerCollision: settings.questionsPerCollision,
    bubbleSpawnRate: settings.bubblesPerMinute / 60, // Convert per minute to per second
    showMobileControls: settings.mobileControls
  };

  return {
    settings: transformedSettings,
    updateSettings,
    loading
  };
}