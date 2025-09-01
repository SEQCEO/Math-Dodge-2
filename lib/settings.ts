import { z } from 'zod';
import { safeLoad, safeSave } from './utils';

// Zod schema for GameSettings validation
export const SettingsSchema = z.object({
  allowedOperators: z.object({
    addition: z.boolean(),
    subtraction: z.boolean(),
    multiplication: z.boolean(),
    division: z.boolean()
  }).refine(data => {
    // At least one operator must be enabled
    return data.addition || data.subtraction || data.multiplication || data.division;
  }, {
    message: "At least one operator must be enabled"
  }),
  
  ranges: z.object({
    addition: z.object({
      minA: z.number().int().min(0).max(100),
      maxA: z.number().int().min(0).max(100),
      minB: z.number().int().min(0).max(100),
      maxB: z.number().int().min(0).max(100)
    }),
    subtraction: z.object({
      minA: z.number().int().min(0).max(100),
      maxA: z.number().int().min(0).max(100),
      minB: z.number().int().min(0).max(100),
      maxB: z.number().int().min(0).max(100)
    }),
    multiplication: z.object({
      minA: z.number().int().min(0).max(12),
      maxA: z.number().int().min(0).max(12),
      minB: z.number().int().min(0).max(12),
      maxB: z.number().int().min(0).max(12)
    }),
    division: z.object({
      minA: z.number().int().min(1).max(12),
      maxA: z.number().int().min(1).max(12),
      minB: z.number().int().min(1).max(12),
      maxB: z.number().int().min(1).max(12)
    })
  }),
  
  allowNegativeAnswers: z.boolean(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  soundEnabled: z.boolean(),
  vibrationEnabled: z.boolean()
});

export type GameSettings = z.infer<typeof SettingsSchema>;

export const defaultSettings: GameSettings = {
  allowedOperators: {
    addition: true,
    subtraction: true,
    multiplication: false,
    division: false
  },
  ranges: {
    addition: { minA: 1, maxA: 10, minB: 1, maxB: 10 },
    subtraction: { minA: 1, maxA: 10, minB: 1, maxB: 10 },
    multiplication: { minA: 1, maxA: 5, minB: 1, maxB: 5 },
    division: { minA: 1, maxA: 10, minB: 1, maxB: 5 }
  },
  allowNegativeAnswers: false,
  difficulty: 'medium',
  soundEnabled: true,
  vibrationEnabled: true
};

// Helper function to fix inverted ranges (ensure min <= max)
function fixRange(range: { minA: number; maxA: number; minB: number; maxB: number }) {
  if (range.minA > range.maxA) {
    [range.minA, range.maxA] = [range.maxA, range.minA];
  }
  if (range.minB > range.maxB) {
    [range.minB, range.maxB] = [range.maxB, range.minB];
  }
  return range;
}

// Clamp a value between min and max
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function loadSettings(): Promise<GameSettings> {
  const loaded = await safeLoad<GameSettings>('gameSettings', defaultSettings);
  
  try {
    // Validate with zod schema
    const validated = SettingsSchema.parse(loaded);
    
    // Fix any inverted ranges
    Object.keys(validated.ranges).forEach(op => {
      validated.ranges[op as keyof typeof validated.ranges] = fixRange(
        validated.ranges[op as keyof typeof validated.ranges]
      );
    });
    
    return validated;
  } catch (error) {
    console.warn('Invalid settings found, using defaults:', error);
    return defaultSettings;
  }
}

export async function saveSettings(settings: GameSettings): Promise<void> {
  try {
    // Validate settings
    const validated = SettingsSchema.parse(settings);
    
    // Fix ranges and clamp values
    const fixed = { ...validated };
    
    // Fix and clamp addition ranges
    fixed.ranges.addition = fixRange(fixed.ranges.addition);
    fixed.ranges.addition.minA = clamp(fixed.ranges.addition.minA, 0, 100);
    fixed.ranges.addition.maxA = clamp(fixed.ranges.addition.maxA, 0, 100);
    fixed.ranges.addition.minB = clamp(fixed.ranges.addition.minB, 0, 100);
    fixed.ranges.addition.maxB = clamp(fixed.ranges.addition.maxB, 0, 100);
    
    // Fix and clamp subtraction ranges
    fixed.ranges.subtraction = fixRange(fixed.ranges.subtraction);
    fixed.ranges.subtraction.minA = clamp(fixed.ranges.subtraction.minA, 0, 100);
    fixed.ranges.subtraction.maxA = clamp(fixed.ranges.subtraction.maxA, 0, 100);
    fixed.ranges.subtraction.minB = clamp(fixed.ranges.subtraction.minB, 0, 100);
    fixed.ranges.subtraction.maxB = clamp(fixed.ranges.subtraction.maxB, 0, 100);
    
    // Fix and clamp multiplication ranges
    fixed.ranges.multiplication = fixRange(fixed.ranges.multiplication);
    fixed.ranges.multiplication.minA = clamp(fixed.ranges.multiplication.minA, 0, 12);
    fixed.ranges.multiplication.maxA = clamp(fixed.ranges.multiplication.maxA, 0, 12);
    fixed.ranges.multiplication.minB = clamp(fixed.ranges.multiplication.minB, 0, 12);
    fixed.ranges.multiplication.maxB = clamp(fixed.ranges.multiplication.maxB, 0, 12);
    
    // Fix and clamp division ranges
    fixed.ranges.division = fixRange(fixed.ranges.division);
    fixed.ranges.division.minA = clamp(fixed.ranges.division.minA, 1, 12);
    fixed.ranges.division.maxA = clamp(fixed.ranges.division.maxA, 1, 12);
    fixed.ranges.division.minB = clamp(fixed.ranges.division.minB, 1, 12);
    fixed.ranges.division.maxB = clamp(fixed.ranges.division.maxB, 1, 12);
    
    // Ensure at least one operator is enabled
    if (!fixed.allowedOperators.addition && 
        !fixed.allowedOperators.subtraction && 
        !fixed.allowedOperators.multiplication && 
        !fixed.allowedOperators.division) {
      fixed.allowedOperators.addition = true; // Default to addition if none selected
    }
    
    await safeSave('gameSettings', fixed);
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}