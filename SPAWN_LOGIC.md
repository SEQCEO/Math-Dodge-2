# Red Hazard Bubble Spawn Logic

## Overview
The game uses a sophisticated spawn system to create challenging but fair gameplay with red hazard bubbles that players must dodge.

## Spawn Rate Factors

### 1. Base Spawn Rate (BPM - Bubbles Per Minute)
- **Starting Rate**: 40 BPM (40 bubbles per minute)
- **Maximum Rate**: 80 BPM (80 bubbles per minute)
- **Ramp Time**: 2 minutes to reach maximum difficulty

### 2. Difficulty Scaling
```javascript
const t = Math.min(elapsedTimeRef.current / 120, 1); // 0 to 1 over 2 minutes
const currentHazardBPM = lerp(baseHazardBPM, maxHazardBPM, t);
```
- Uses linear interpolation (lerp) to smoothly increase spawn rate
- Starts at 40 BPM when game begins
- Reaches 80 BPM after 2 minutes of gameplay
- Stays at 80 BPM for remainder of game

### 3. Maximum Bubble Limits
- **Max Hazards on Screen**: 8 red bubbles
- **Max Operator Bubbles**: 4 math bubbles
- Prevents screen from becoming impossibly crowded

### 4. Fairness Constraints
The system checks multiple conditions before spawning a new bubble:

#### Spacing Rules:
- **minXYGapPx**: 60px - Minimum distance between any two bubbles
- **minRowGapPx**: 100px - Minimum horizontal gap if bubbles are in same row
- **rowBandPx**: 60px - Height of a "row" for row-based spacing
- **minPlayerXGapPx**: 80px - Minimum distance from player's X position

#### Placement Algorithm:
```javascript
// Try up to 10 random positions to find valid placement
for (let attempt = 0; attempt < 10; attempt++) {
  const x = random position across screen width
  if (canPlaceBubble(x, y, existingBubbles, playerX)) {
    spawn bubble at this position
    break
  }
}
```

### 5. Spawn Timing
- Converts BPM to seconds between spawns: `spawnInterval = 60 / currentBPM`
- At 40 BPM: spawns every 1.5 seconds
- At 80 BPM: spawns every 0.75 seconds
- Independent timer for hazards vs operator bubbles

### 6. Movement Speed
- Red hazard bubbles move at 150-200 pixels/second (randomized)
- Faster than operator bubbles (100-150 pixels/second)
- Makes them more threatening and harder to dodge

## Key Design Decisions

1. **High spawn rate** (40-80 BPM) creates constant pressure
2. **Fairness constraints** prevent unfair/impossible situations
3. **Player X gap** ensures bubbles don't spawn directly above player
4. **Row-based spacing** prevents horizontal walls of bubbles
5. **Difficulty scaling** gives players time to learn before max challenge

## Configuration
All values can be adjusted in `gameSettings.ts`:
```javascript
spawn: {
  baseHazardBPM: 40,      // Starting spawn rate
  maxHazardBPM: 80,       // Maximum spawn rate
  maxHazards: 8,          // Max red bubbles on screen
  minXYGapPx: 60,         // Min distance between bubbles
  minPlayerXGapPx: 80,    // Min distance from player X
  // ... other settings
}
```