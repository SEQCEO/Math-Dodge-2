// Test file for settings module
import { loadSettings, saveSettings, defaultSettings, SettingsSchema } from './lib/settings';

async function testSettings() {
  console.log('Testing settings module...');
  
  // Test loading default settings
  console.log('\nLoading settings (should be defaults on first run):');
  const loaded = await loadSettings();
  console.log('Loaded settings:', JSON.stringify(loaded, null, 2));
  
  // Test saving modified settings
  console.log('\nModifying and saving settings...');
  const modified = { ...loaded };
  modified.allowedOperators.multiplication = true;
  modified.ranges.multiplication = { minA: 2, maxA: 8, minB: 2, maxB: 8 };
  modified.difficulty = 'hard';
  
  await saveSettings(modified);
  console.log('Settings saved.');
  
  // Test loading saved settings
  console.log('\nReloading settings:');
  const reloaded = await loadSettings();
  console.log('Reloaded settings:', JSON.stringify(reloaded, null, 2));
  
  // Test invalid settings (inverted ranges)
  console.log('\nTesting inverted ranges fix:');
  const invalidSettings = { ...defaultSettings };
  invalidSettings.ranges.addition = { minA: 10, maxA: 1, minB: 20, maxB: 5 };
  
  await saveSettings(invalidSettings);
  const fixed = await loadSettings();
  console.log('Fixed addition ranges:', fixed.ranges.addition);
  
  // Test validation with no operators enabled
  console.log('\nTesting validation (no operators enabled):');
  const noOps = { ...defaultSettings };
  noOps.allowedOperators = {
    addition: false,
    subtraction: false,
    multiplication: false,
    division: false
  };
  
  try {
    await saveSettings(noOps);
    const savedNoOps = await loadSettings();
    console.log('After saving with no operators, addition enabled:', savedNoOps.allowedOperators.addition);
  } catch (error) {
    console.log('Validation error (expected):', error);
  }
  
  // Test clamping
  console.log('\nTesting value clamping:');
  const outOfRange = { ...defaultSettings };
  outOfRange.ranges.addition = { minA: -10, maxA: 200, minB: -5, maxB: 150 };
  outOfRange.ranges.division = { minA: 0, maxA: 20, minB: 0, maxB: 20 };
  
  await saveSettings(outOfRange);
  const clamped = await loadSettings();
  console.log('Clamped addition ranges:', clamped.ranges.addition);
  console.log('Clamped division ranges:', clamped.ranges.division);
}

// Run the tests
testSettings().catch(console.error);