// Diagnostics for spawn rate and settings tracking
export interface SpawnDiagnostics {
  spawnTimestamps: number[];
  activeOperators: string[];
  activeBubbleCount: number;
  effectiveBPM: number;
  settings: {
    bpm: number;
    maxActiveBubbles: number;
    enabledOperators: string[];
  };
  questionSamples: {
    operator: string;
    minA: number;
    maxA: number;
    minB: number;
    maxB: number;
    actualA: number[];
    actualB: number[];
  }[];
}

class DiagnosticsTracker {
  private spawnTimestamps: number[] = [];
  private questionSamples = new Map<string, { a: number[]; b: number[] }>();
  private lastLogTime = 0;
  private logInterval = 5000; // Log every 5 seconds
  
  recordSpawn(timestamp: number) {
    this.spawnTimestamps.push(timestamp);
    // Keep only last 100 spawns
    if (this.spawnTimestamps.length > 100) {
      this.spawnTimestamps.shift();
    }
  }
  
  recordQuestion(operator: string, a: number, b: number) {
    if (!this.questionSamples.has(operator)) {
      this.questionSamples.set(operator, { a: [], b: [] });
    }
    const samples = this.questionSamples.get(operator)!;
    samples.a.push(a);
    samples.b.push(b);
    
    // Keep only last 50 samples per operator
    if (samples.a.length > 50) {
      samples.a.shift();
      samples.b.shift();
    }
  }
  
  calculateEffectiveBPM(): number {
    if (this.spawnTimestamps.length < 2) return 0;
    
    // Calculate from last 30 seconds of spawns
    const now = performance.now();
    const recentSpawns = this.spawnTimestamps.filter(t => now - t < 30000);
    
    if (recentSpawns.length < 2) return 0;
    
    const timeSpan = (recentSpawns[recentSpawns.length - 1] - recentSpawns[0]) / 1000 / 60; // minutes
    return recentSpawns.length / timeSpan;
  }
  
  getQuestionRanges(operator: string) {
    const samples = this.questionSamples.get(operator);
    if (!samples || samples.a.length === 0) {
      return { minA: 0, maxA: 0, minB: 0, maxB: 0, actualA: [], actualB: [] };
    }
    
    return {
      minA: Math.min(...samples.a),
      maxA: Math.max(...samples.a),
      minB: Math.min(...samples.b),
      maxB: Math.max(...samples.b),
      actualA: [...samples.a].slice(-10), // Last 10 samples
      actualB: [...samples.b].slice(-10)
    };
  }
  
  shouldLog(now: number): boolean {
    if (now - this.lastLogTime > this.logInterval) {
      this.lastLogTime = now;
      return true;
    }
    return false;
  }
  
  logDiagnostics(
    activeOperators: string[],
    activeBubbleCount: number,
    settings: { bpm: number; maxActiveBubbles: number; enabledOperators: string[] }
  ) {
    const effectiveBPM = this.calculateEffectiveBPM();
    
    console.log('=== Math Dodge Diagnostics ===');
    console.log(`Time: ${new Date().toISOString()}`);
    console.log(`Active Operators: ${activeOperators.join(', ') || 'NONE'}`);
    console.log(`Active Bubbles: ${activeBubbleCount}/${settings.maxActiveBubbles}`);
    console.log(`Configured BPM: ${settings.bpm}`);
    console.log(`Effective BPM (last 30s): ${effectiveBPM.toFixed(1)}`);
    console.log(`BPM Accuracy: ${((effectiveBPM / settings.bpm) * 100).toFixed(1)}%`);
    
    // Log question samples
    console.log('\n--- Question Samples ---');
    for (const op of activeOperators) {
      const ranges = this.getQuestionRanges(op);
      if (ranges.actualA.length > 0) {
        console.log(`${op}: A[${ranges.minA}-${ranges.maxA}] B[${ranges.minB}-${ranges.maxB}]`);
        console.log(`  Recent A: ${ranges.actualA.join(', ')}`);
        console.log(`  Recent B: ${ranges.actualB.join(', ')}`);
      }
    }
    
    console.log('==========================\n');
  }
  
  reset() {
    this.spawnTimestamps = [];
    this.questionSamples.clear();
    this.lastLogTime = 0;
  }
}

// Global diagnostics instance
export const diagnostics = new DiagnosticsTracker();

// Helper to check if diagnostics should be enabled
export function isDiagnosticsEnabled(): boolean {
  // Check for debug mode in URL params or environment
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }
  return process.env.NODE_ENV === 'development';
}