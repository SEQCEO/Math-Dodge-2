import { Operator } from './types';

export interface OperatorSettings {
  enabled: boolean;
  minA: number;
  maxA: number;
  minB: number;
  maxB: number;
  allowNegative?: boolean;
}

export interface ExtendedGameSettings {
  operators: {
    addition: OperatorSettings;
    subtraction: OperatorSettings & { allowNegative: boolean };
    multiplication: OperatorSettings;
    division: OperatorSettings;
  };
  questionsPerCollision: number;
  secondsPerQuestion: number;
  bubblesPerMinute: number;
  soundEnabled: boolean;
  mobileControls: boolean;
  failFast: boolean;
  spawn: {
    baseHazardBPM: number;
    maxHazardBPM: number;
    opBPM: number;
    hazardRatioBias: number;
    maxHazards: number;
    maxOps: number;
    minXYGapPx: number;
    minRowGapPx: number;
    rowBandPx: number;
    minPlayerXGapPx: number;
    quizCooldownMs: number;
  };
}

export const operatorColors = {
  addition: {
    bg: 'bg-green-600',
    text: 'text-green-600',
    light: 'bg-green-50'
  },
  subtraction: {
    bg: 'bg-blue-600',
    text: 'text-blue-600',
    light: 'bg-blue-50'
  },
  multiplication: {
    bg: 'bg-purple-600',
    text: 'text-purple-600',
    light: 'bg-purple-50'
  },
  division: {
    bg: 'bg-orange-600',
    text: 'text-orange-600',
    light: 'bg-orange-50'
  }
};

export const defaultGameSettings: ExtendedGameSettings = {
  operators: {
    addition: {
      enabled: true,
      minA: 1,
      maxA: 20,
      minB: 1,
      maxB: 20
    },
    subtraction: {
      enabled: true,
      minA: 1,
      maxA: 20,
      minB: 1,
      maxB: 20,
      allowNegative: false
    },
    multiplication: {
      enabled: true,
      minA: 1,
      maxA: 10,
      minB: 1,
      maxB: 10
    },
    division: {
      enabled: true,
      minA: 1,
      maxA: 10,
      minB: 1,
      maxB: 10
    }
  },
  questionsPerCollision: 3,
  secondsPerQuestion: 15,
  bubblesPerMinute: 30,
  soundEnabled: true,
  mobileControls: true,
  failFast: false,
  spawn: {
    baseHazardBPM: 12,
    maxHazardBPM: 30,
    opBPM: 15,
    hazardRatioBias: 0.3,
    maxHazards: 3,
    maxOps: 4,
    minXYGapPx: 80,
    minRowGapPx: 120,
    rowBandPx: 60,
    minPlayerXGapPx: 100,
    quizCooldownMs: 3000
  }
};

export const presets = {
  '7_table': {
    operators: {
      multiplication: {
        enabled: true,
        minA: 7,
        maxA: 7,
        minB: 1,
        maxB: 12
      }
    }
  },
  '8_table': {
    operators: {
      multiplication: {
        enabled: true,
        minA: 8,
        maxA: 8,
        minB: 1,
        maxB: 12
      }
    }
  },
  '9_table': {
    operators: {
      multiplication: {
        enabled: true,
        minA: 9,
        maxA: 9,
        minB: 1,
        maxB: 12
      }
    }
  },
  'warmup_2_5': {
    operators: {
      multiplication: {
        enabled: true,
        minA: 2,
        maxA: 5,
        minB: 2,
        maxB: 5
      }
    }
  }
};

export function loadGameSettings(): Promise<ExtendedGameSettings> {
  return new Promise((resolve) => {
    try {
      const stored = localStorage.getItem('mathDodgeSettings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Deep merge with defaults to ensure all properties exist, especially nested ones
        const merged = {
          ...defaultGameSettings,
          ...parsed,
          spawn: {
            ...defaultGameSettings.spawn,
            ...(parsed.spawn || {})
          },
          operators: {
            ...defaultGameSettings.operators,
            ...(parsed.operators || {})
          }
        };
        resolve(merged);
      } else {
        resolve(defaultGameSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      resolve(defaultGameSettings);
    }
  });
}

export function saveGameSettings(settings: ExtendedGameSettings): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      localStorage.setItem('mathDodgeSettings', JSON.stringify(settings));
      resolve();
    } catch (error) {
      console.error('Failed to save settings:', error);
      reject(error);
    }
  });
}

export function applyPreset(currentSettings: ExtendedGameSettings, presetName: keyof typeof presets): ExtendedGameSettings {
  const preset = presets[presetName];
  
  // First, disable all operators
  const newSettings = {
    ...currentSettings,
    operators: {
      ...currentSettings.operators,
      addition: { ...currentSettings.operators.addition, enabled: false },
      subtraction: { ...currentSettings.operators.subtraction, enabled: false },
      multiplication: { ...currentSettings.operators.multiplication, enabled: false },
      division: { ...currentSettings.operators.division, enabled: false }
    }
  };
  
  // Then apply the preset
  Object.entries(preset.operators).forEach(([operator, config]) => {
    const op = operator as keyof typeof newSettings.operators;
    if (op === 'subtraction') {
      newSettings.operators[op] = {
        ...newSettings.operators[op],
        ...config,
        allowNegative: (config as any).allowNegative ?? newSettings.operators[op].allowNegative
      };
    } else {
      newSettings.operators[op] = {
        ...newSettings.operators[op],
        ...config
      } as any;
    }
  });
  
  return newSettings;
}