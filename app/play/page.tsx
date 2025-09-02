'use client';

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pause, Play, Volume2, VolumeX, Home } from 'lucide-react';
import { QuizModal } from '@/components/QuizModal';
import { useGameSettings } from '@/hooks/useGameSettings';
import { useSound } from '@/hooks/useSound';
import { generateProblem, checkAnswer } from '@/lib/math';
import { circleIntersectsRect } from '@/lib/physics';
import confetti from 'canvas-confetti';
import type { Problem, Bubble, GameState } from '@/types/game';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const PLAYER_SIZE = 30;
const BUBBLE_RADIUS = 25;
const PLAYER_SPEED = 420; // pixels per second - increased for better control
const SPEED_INCREASE_INTERVAL = 20; // seconds
const SPEED_INCREASE_RATE = 0.02; // 2%
const MAX_SPEED_MULTIPLIER = 1.5;
const MAX_DT = 33; // milliseconds

// Lerp function for smooth interpolation
function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

function PlayGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === '1';
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);
  const debugSpawnIndexRef = useRef<number>(0);
  
  // Spawn system refs
  const hazardSpawnTimerRef = useRef<number>(0);
  const opSpawnTimerRef = useRef<number>(0);
  const lastQuizTimeRef = useRef<number>(0);
  const lastOpSpawnRef = useRef<number>(0);
  
  // Pattern system refs
  type Pattern = 'burstTriplet' | 'sweepWithGap' | 'driftStream';
  const patternStateRef = useRef<{ cooldownUntil: number }>({ cooldownUntil: 0 });
  
  const { settings } = useGameSettings();
  const { playSound, isMuted, toggleMute } = useSound();
  
  const [gameState, setGameState] = useState<GameState>({
    lives: 3,
    score: 0,
    streak: 0,
    isPlaying: true,
    isPaused: false,
    isGameOver: false,
    showQuiz: false,
    bubbles: [],
    playerX: CANVAS_WIDTH / 2,
    playerY: CANVAS_HEIGHT - 50,
    currentSpeedMultiplier: 1
  });
  
  const [quizProblems, setQuizProblems] = useState<Problem[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [currentOperator, setCurrentOperator] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState({ fps: 0, entities: 0 });
  
  // Track held keys for smooth movement
  const keysPressed = useRef<Set<string>>(new Set());

  // Handle pause
  const togglePause = useCallback(() => {
    if (gameState.isGameOver || gameState.showQuiz) return;
    
    setGameState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
    
    if (!gameState.isPaused) {
      playSound('pause');
    }
  }, [gameState.isGameOver, gameState.showQuiz, gameState.isPaused, playSound]);

  // Helper function to check if a bubble can be placed
  const canPlaceBubble = useCallback((newBubble: { x: number; y: number; radius: number }, existingBubbles: Bubble[], playerX: number, playerY: number): boolean => {
    const spawnSettings = settings.spawn || {
      minXYGapPx: 80,
      minRowGapPx: 120,
      minPlayerXGapPx: 100,
      rowBandPx: 60
    };
    
    // Check against existing bubbles
    for (const bubble of existingBubbles) {
      const dx = Math.abs(bubble.x - newBubble.x);
      const dy = Math.abs(bubble.y - newBubble.y);
      
      // Check X/Y minimum gap
      if (dx < spawnSettings.minXYGapPx && dy < spawnSettings.minXYGapPx) {
        return false;
      }
      
      // Check row gap (if in same row band)
      if (dy < spawnSettings.rowBandPx && dx < spawnSettings.minRowGapPx) {
        return false;
      }
    }
    
    // Check against player X position
    if (Math.abs(playerX - newBubble.x) < spawnSettings.minPlayerXGapPx) {
      return false;
    }
    
    return true;
  }, [settings.spawn]);

  // Pattern spawning functions
  const spawnPattern = useCallback((pattern: Pattern, updatedBubbles: Bubble[], speedMultiplier: number) => {
    const now = performance.now();
    
    if (pattern === 'burstTriplet') {
      // Three hazards at staggered x, same y, different vx → weave
      const y = -20;
      const baseX = 80 + Math.random() * (CANVAS_WIDTH - 160);
      const dx = 90 + Math.random() * 50;
      const xs = [baseX - dx, baseX, baseX + dx].map(x => Math.max(40, Math.min(CANVAS_WIDTH - 40, x)));
      
      for (let i = 0; i < xs.length; i++) {
        const bubble: Bubble = {
          id: Date.now() + Math.random() + i,
          x: xs[i],
          y,
          vx: (Math.random() - 0.5) * 200,
          vy: (120 + Math.random() * 60) * speedMultiplier,
          radius: 14 + Math.random() * 8,
          kind: 'hazard',
          color: '#ef4444',
          bornAt: now
        };
        updatedBubbles.push(bubble);
      }
      patternStateRef.current.cooldownUntil = now + 900;
    }
    
    if (pattern === 'sweepWithGap') {
      // A horizontal sweep (3–5 hazards) leaving a guaranteed gap corridor
      const lanes = 5;
      const laneWidth = CANVAS_WIDTH / lanes;
      const gapLane = 1 + Math.floor(Math.random() * (lanes - 2)); // avoid extreme edges
      
      for (let i = 0; i < lanes; i++) {
        if (i === gapLane) continue; // single-lane gap
        
        const x = (i + 0.5) * laneWidth + (Math.random() - 0.5) * 40;
        const bubble: Bubble = {
          id: Date.now() + Math.random() + i,
          x,
          y: -20,
          vx: (Math.random() - 0.5) * 100,
          vy: (120 + Math.random() * 60) * speedMultiplier,
          radius: 16 + Math.random() * 6,
          kind: 'hazard',
          color: '#ef4444',
          bornAt: now
        };
        updatedBubbles.push(bubble);
      }
      patternStateRef.current.cooldownUntil = now + 1100;
    }
    
    if (pattern === 'driftStream') {
      // A short stream from one side with diagonal drift across
      const fromLeft = Math.random() < 0.5;
      const x0 = fromLeft ? (50 + Math.random() * 70) : (CANVAS_WIDTH - 120 + Math.random() * 70);
      const vx = fromLeft ? (60 + Math.random() * 60) : -(60 + Math.random() * 60);
      
      for (let k = 0; k < 3; k++) {
        const y = -20 - k * 60;
        const bubble: Bubble = {
          id: Date.now() + Math.random() + k,
          x: x0 + (Math.random() - 0.5) * 40,
          y,
          vx,
          vy: (120 + Math.random() * 40) * speedMultiplier,
          radius: 14 + Math.random() * 6,
          kind: 'hazard',
          color: '#ef4444',
          bornAt: now
        };
        updatedBubbles.push(bubble);
      }
      patternStateRef.current.cooldownUntil = now + 900;
    }
  }, []);

  // Handle collision
  const handleCollision = useCallback((bubble: Bubble) => {
    if (bubble.kind === 'hazard') {
      // Hazard bubble - instant life loss
      playSound('wrong');
      setGameState(prev => {
        const newLives = prev.lives - 1;
        if (newLives <= 0) {
          playSound('gameOver');
          return {
            ...prev,
            lives: 0,
            isGameOver: true,
            isPaused: true,
            bubbles: []
          };
        }
        return {
          ...prev,
          lives: newLives,
          streak: 0,
          bubbles: [] // Clear all bubbles on hazard hit
        };
      });
    } else {
      // Math operator bubble - trigger quiz
      playSound('collision');
      lastQuizTimeRef.current = performance.now();
      
      // Track which operator was hit
      setCurrentOperator(bubble.operator || '+');
      
      // Generate quiz problems for the specific operator that was hit
      const problems: Problem[] = [];
      for (let i = 0; i < settings.questionsPerCollision; i++) {
        problems.push(generateProblem({
          difficulty: settings.difficulty,
          operators: [bubble.operator || '+'] // Only generate problems for the hit operator
        }));
      }
      
      setQuizProblems(problems);
      setCurrentQuizIndex(0);
      setQuizScore(0);
      
      // Clear ALL bubbles and show quiz
      setGameState(prev => ({
        ...prev,
        bubbles: [], // Despawn all bubbles
        showQuiz: true
        // Don't pause the game - let it continue in the background
      }));
    }
  }, [settings, playSound]);

  // Handle quiz answer
  const handleQuizAnswer = useCallback((answer: number) => {
    const currentProblem = quizProblems[currentQuizIndex];
    const isCorrect = checkAnswer(currentProblem, answer);
    
    if (isCorrect) {
      playSound('correct');
      setQuizScore(prev => prev + 1);
      setGameState(prev => ({
        ...prev,
        score: prev.score + 10,
        streak: prev.streak + 1
      }));
    } else {
      playSound('wrong');
      setGameState(prev => ({
        ...prev,
        streak: 0,
        lives: prev.lives - 1
      }));
    }
    
    // Check if quiz is complete
    if (currentQuizIndex >= quizProblems.length - 1) {
      // Quiz complete
      const finalScore = quizScore + (isCorrect ? 1 : 0);
      if (finalScore === quizProblems.length) {
        // Perfect score!
        playSound('powerup');
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      
      // Check if game over
      if (gameState.lives - (isCorrect ? 0 : 1) <= 0) {
        setGameState(prev => ({
          ...prev,
          lives: 0,
          isGameOver: true,
          showQuiz: false,
          isPaused: true
        }));
        playSound('gameOver');
      } else {
        // Continue game
        setGameState(prev => ({
          ...prev,
          showQuiz: false
          // Game continues without changing pause state
        }));
      }
    } else {
      // Next question
      setCurrentQuizIndex(prev => prev + 1);
    }
  }, [quizProblems, currentQuizIndex, quizScore, gameState.lives, playSound]);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    if (!canvasRef.current || !gameState.isPlaying || gameState.isPaused || gameState.showQuiz) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate delta time and clamp it
    let dt = timestamp - lastTimeRef.current;
    if (dt > MAX_DT) dt = MAX_DT;
    dt = dt / 1000; // Convert to seconds
    
    lastTimeRef.current = timestamp;
    elapsedTimeRef.current += dt;
    hazardSpawnTimerRef.current += dt;
    opSpawnTimerRef.current += dt;

    // Update FPS for debug
    if (isDebug) {
      setDebugInfo(prev => ({
        ...prev,
        fps: Math.round(1 / dt)
      }));
    }

    // Calculate speed multiplier
    const speedMultiplier = Math.min(
      1 + Math.floor(elapsedTimeRef.current / SPEED_INCREASE_INTERVAL) * SPEED_INCREASE_RATE,
      MAX_SPEED_MULTIPLIER
    );
    
    setGameState(prev => ({ ...prev, currentSpeedMultiplier: speedMultiplier }));

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Update player position based on held keys
    let playerX = gameState.playerX;
    let playerY = gameState.playerY;
    if (!gameState.isGameOver && !gameState.showQuiz && !gameState.isPaused) {
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        playerX -= PLAYER_SPEED * dt;
      }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        playerX += PLAYER_SPEED * dt;
      }
      if (keysPressed.current.has('arrowup') || keysPressed.current.has('w')) {
        playerY -= PLAYER_SPEED * dt;
      }
      if (keysPressed.current.has('arrowdown') || keysPressed.current.has('s')) {
        playerY += PLAYER_SPEED * dt;
      }
      
      // Keep player in bounds
      playerX = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, playerX));
      playerY = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, playerY));
      
      // Update state if position changed
      if (playerX !== gameState.playerX || playerY !== gameState.playerY) {
        setGameState(prev => ({ ...prev, playerX, playerY }));
      }
    }

    // Update and draw player
    const playerRect = {
      x: playerX - PLAYER_SIZE / 2,
      y: playerY - PLAYER_SIZE / 2,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE
    };

    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(playerRect.x, playerRect.y, playerRect.width, playerRect.height);

    // Update bubbles
    const updatedBubbles: Bubble[] = [];
    let collisionDetected = false;

    for (const bubble of gameState.bubbles) {
      // Update position with velocity
      bubble.x += bubble.vx * dt;
      bubble.y += bubble.vy * dt;

      // Check collision with player
      if (!collisionDetected && circleIntersectsRect(
        { x: bubble.x, y: bubble.y, radius: bubble.radius },
        playerRect
      )) {
        collisionDetected = true;
        handleCollision(bubble);
        break; // Stop processing bubbles since we'll clear them all
      }

      // Keep bubble if still on screen
      if (bubble.y < CANVAS_HEIGHT + bubble.radius) {
        // Near-miss detection for hazard bubbles
        if (bubble.kind === 'hazard' && !bubble.grazed) {
          const dx = Math.abs(bubble.x - playerX);
          const dy = Math.abs(bubble.y - playerY);
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = bubble.radius + PLAYER_SIZE / 2;
          
          if (distance > minDistance && distance < minDistance + 20) {
            bubble.grazed = true;
            setGameState(prev => ({
              ...prev,
              score: prev.score + 1
            }));
            // Could add a small sound effect here if desired
          }
        }
        
        updatedBubbles.push(bubble);
      }
    }

    // Draw bubbles
    for (const bubble of updatedBubbles) {
      // Calculate fade-in alpha
      const age = bubble.bornAt ? currentTime - bubble.bornAt : 1000;
      const alpha = Math.min(age / 300, 1); // Fade in over 300ms
      
      ctx.save();
      ctx.globalAlpha = alpha;
      
      // Bubble background
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fillStyle = bubble.color;
      ctx.fill();

      // Bubble text (only for math bubbles)
      if (bubble.kind === 'op' && bubble.operator) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bubble.operator, bubble.x, bubble.y);
      }
      
      ctx.restore();
    }

    // Spawn new bubbles
    const spawnSettings = settings.spawn || {
      baseHazardBPM: 60,
      maxHazardBPM: 110,
      opBPM: 8,
      hazardRatioBias: 0.7,
      maxHazards: 10,
      maxOps: 2,
      minXYGapPx: 90,
      minRowGapPx: 140,
      rowBandPx: 90,
      minPlayerXGapPx: 140,
      quizCooldownMs: 2500
    };
    
    // Count current bubble types
    const hazardCount = updatedBubbles.filter(b => b.kind === 'hazard').length;
    const opCount = updatedBubbles.filter(b => b.kind === 'op').length;
    
    // Calculate hazard spawn rate with difficulty scaling
    const currentTime = performance.now();
    const timeSinceLastQuiz = currentTime - lastQuizTimeRef.current;
    const canSpawnOp = timeSinceLastQuiz > spawnSettings.quizCooldownMs;
    
    const t = Math.min(elapsedTimeRef.current / 120, 1); // 2 minutes to max difficulty
    const currentHazardBPM = lerp(spawnSettings.baseHazardBPM, spawnSettings.maxHazardBPM, t);
    
    // Try to spawn hazard bubbles
    if (hazardCount < spawnSettings.maxHazards) {
      const hazardSpawnInterval = 60 / currentHazardBPM; // Convert BPM to seconds
      if (hazardSpawnTimerRef.current >= hazardSpawnInterval) {
        hazardSpawnTimerRef.current = 0;
        
        // Try multiple positions to find valid placement
        for (let attempt = 0; attempt < 10; attempt++) {
          const x = BUBBLE_RADIUS + Math.random() * (CANVAS_WIDTH - 2 * BUBBLE_RADIUS);
          const newBubble = { x, y: -BUBBLE_RADIUS, radius: BUBBLE_RADIUS };
          
          if (canPlaceBubble(newBubble, updatedBubbles, playerX, playerY)) {
            const bubble: Bubble = {
              id: Date.now() + Math.random(),
              x,
              y: -BUBBLE_RADIUS,
              vx: (Math.random() - 0.5) * 240, // -120 to 120 pixels/second horizontal drift
              vy: 100 + Math.random() * 80, // 100-180 pixels/second down
              radius: 14 + Math.random() * 8, // 14-22 pixel radius variety
              kind: 'hazard',
              color: '#ef4444', // Red color for hazards
              bornAt: currentTime
            };
            updatedBubbles.push(bubble);
            break;
          }
        }
      }
    }
    
    // Try to spawn operator bubbles
    if (canSpawnOp && opCount < spawnSettings.maxOps) {
      const opSpawnInterval = 60 / spawnSettings.opBPM; // Convert BPM to seconds
      if (opSpawnTimerRef.current >= opSpawnInterval) {
        opSpawnTimerRef.current = 0;
        
        // Select operator
        const operators = settings.enabledOperators.length > 0 ? settings.enabledOperators : ['+'];
        const operator = isDebug 
          ? operators[debugSpawnIndexRef.current++ % operators.length]
          : operators[Math.floor(Math.random() * operators.length)];
        
        // Try multiple positions to find valid placement
        for (let attempt = 0; attempt < 10; attempt++) {
          const x = BUBBLE_RADIUS + Math.random() * (CANVAS_WIDTH - 2 * BUBBLE_RADIUS);
          const newBubble = { x, y: -BUBBLE_RADIUS, radius: BUBBLE_RADIUS };
          
          if (canPlaceBubble(newBubble, updatedBubbles, playerX, playerY)) {
            const bubble: Bubble = {
              id: Date.now() + Math.random(),
              x,
              y: -BUBBLE_RADIUS,
              vx: (Math.random() - 0.5) * 120, // -60 to 60 pixels/second horizontal drift
              vy: 60 + Math.random() * 40, // 60-100 pixels/second down (slower than hazards)
              radius: 18,
              kind: 'op',
              operator,
              color: operator === '+' ? '#4ade80' : 
                     operator === '-' ? '#3b82f6' :
                     operator === '×' ? '#a855f7' : '#f97316',
              bornAt: currentTime
            };
            updatedBubbles.push(bubble);
            break;
          }
        }
      }
    }
    
    // Guaranteed math bubble every 8-12 seconds
    const timeSinceLastOp = currentTime - lastOpSpawnRef.current;
    if (canSpawnOp && opCount < spawnSettings.maxOps && timeSinceLastOp > 8000 + Math.random() * 4000) {
      lastOpSpawnRef.current = currentTime;
      
      // Select operator
      const operators = settings.enabledOperators.length > 0 ? settings.enabledOperators : ['+'];
      const operator = isDebug 
        ? operators[debugSpawnIndexRef.current++ % operators.length]
        : operators[Math.floor(Math.random() * operators.length)];
      
      // Bias toward center for reachability
      const centerBias = CANVAS_WIDTH * 0.3 + Math.random() * CANVAS_WIDTH * 0.4;
      const bubble: Bubble = {
        id: Date.now() + Math.random(),
        x: centerBias,
        y: -BUBBLE_RADIUS,
        vx: (Math.random() - 0.5) * 60,
        vy: 60 + Math.random() * 40,
        radius: 18,
        kind: 'op',
        operator,
        color: operator === '+' ? '#4ade80' : 
               operator === '-' ? '#3b82f6' :
               operator === '×' ? '#a855f7' : '#f97316',
        bornAt: currentTime
      };
      updatedBubbles.push(bubble);
    }
    
    // Pattern spawning - scales with difficulty, never during quiz
    if (!gameState.showQuiz && currentTime > patternStateRef.current.cooldownUntil) {
      const intensity = Math.min(1, elapsedTimeRef.current / 120); // 0→1 over 120s
      const chance = 0.004 + intensity * 0.006; // 0.4%→1% per frame at 60fps
      
      if (Math.random() < chance) {
        const patterns: Pattern[] = ['burstTriplet', 'sweepWithGap', 'driftStream'];
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        spawnPattern(selectedPattern, updatedBubbles, speedMultiplier);
      }
    }

    // Update state
    if (!collisionDetected) {
      setGameState(prev => ({ ...prev, bubbles: updatedBubbles }));
      setDebugInfo(prev => ({ ...prev, entities: updatedBubbles.length }));
    }

    // Continue loop
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, settings, isDebug, handleCollision, canPlaceBubble, spawnPattern]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.add(key);
      
      if (key === ' ') {
        e.preventDefault();
        if (!gameState.isGameOver && !gameState.showQuiz) {
          togglePause();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      keysPressed.current.clear();
    };
  }, [gameState.isGameOver, gameState.showQuiz, togglePause]);

  // Handle mouse/touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (gameState.isGameOver || gameState.showQuiz || gameState.isPaused) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      setGameState(prev => ({
        ...prev,
        playerX: Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, x)),
        playerY: Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, y))
      }));
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    return () => canvas.removeEventListener('pointermove', handlePointerMove);
  }, [gameState.isGameOver, gameState.showQuiz, gameState.isPaused]);

  // Start game loop
  useEffect(() => {
    if (gameState.isPlaying && !gameState.isPaused && !gameState.showQuiz) {
      lastTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(gameLoop);
    } else if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [gameState.isPlaying, gameState.isPaused, gameState.showQuiz, gameLoop]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;

      const container = containerRef.current;
      const canvas = canvasRef.current;
      const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const containerAspect = containerWidth / containerHeight;

      let scale: number;
      if (containerAspect > aspectRatio) {
        scale = containerHeight / CANVAS_HEIGHT;
      } else {
        scale = containerWidth / CANVAS_WIDTH;
      }

      canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <Card className="px-4 py-2">
              <span className="text-sm text-muted-foreground">Lives</span>
              <p className="text-xl font-bold">{gameState.lives}</p>
            </Card>
            <Card className="px-4 py-2">
              <span className="text-sm text-muted-foreground">Score</span>
              <p className="text-xl font-bold">{gameState.score}</p>
            </Card>
            <Card className="px-4 py-2">
              <span className="text-sm text-muted-foreground">Streak</span>
              <p className="text-xl font-bold">{gameState.streak}</p>
            </Card>
            {isDebug && (
              <>
                <Card className="px-4 py-2">
                  <span className="text-sm text-muted-foreground">FPS</span>
                  <p className="text-xl font-bold">{debugInfo.fps}</p>
                </Card>
                <Card className="px-4 py-2">
                  <span className="text-sm text-muted-foreground">Entities</span>
                  <p className="text-xl font-bold">{debugInfo.entities}</p>
                </Card>
                <Card className="px-4 py-2">
                  <span className="text-sm text-muted-foreground">Speed</span>
                  <p className="text-xl font-bold">{gameState.currentSpeedMultiplier.toFixed(2)}x</p>
                </Card>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePause}
              disabled={gameState.isGameOver || gameState.showQuiz}
            >
              {gameState.isPaused ? <Play /> : <Pause />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX /> : <Volume2 />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/')}
            >
              <Home />
            </Button>
          </div>
        </div>

        {/* Game Canvas */}
        <div
          ref={containerRef}
          className="relative bg-black rounded-lg overflow-hidden shadow-2xl"
          style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          />

          {/* Pause Overlay */}
          {gameState.isPaused && !gameState.showQuiz && !gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Card className="p-8">
                <h2 className="text-2xl font-bold mb-4">Game Paused</h2>
                <p className="text-muted-foreground mb-4">Press Space or click Play to continue</p>
                <Button onClick={togglePause} className="w-full">
                  <Play className="mr-2" /> Resume
                </Button>
              </Card>
            </div>
          )}

          {/* Game Over Overlay */}
          {gameState.isGameOver && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Card className="p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
                <p className="text-2xl mb-2">Final Score: {gameState.score}</p>
                <p className="text-lg text-muted-foreground mb-6">Best Streak: {gameState.streak}</p>
                <div className="flex gap-4">
                  <Button onClick={() => window.location.reload()} className="flex-1">
                    Play Again
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/')} className="flex-1">
                    <Home className="mr-2" /> Home
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        {settings.showMobileControls && !gameState.isGameOver && !gameState.showQuiz && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-center">
              <Button
                size="lg"
                variant="outline"
                onPointerDown={() => {
                  const moveUp = () => {
                    setGameState(prev => ({
                      ...prev,
                      playerY: Math.max(PLAYER_SIZE / 2, prev.playerY - PLAYER_SPEED * 0.016)
                    }));
                  };
                  const interval = setInterval(moveUp, 16);
                  const cleanup = () => clearInterval(interval);
                  window.addEventListener('pointerup', cleanup, { once: true });
                }}
              >
                ↑ Up
              </Button>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                size="lg"
                variant="outline"
                onPointerDown={() => {
                  const moveLeft = () => {
                    setGameState(prev => ({
                      ...prev,
                      playerX: Math.max(PLAYER_SIZE / 2, prev.playerX - PLAYER_SPEED * 0.016)
                    }));
                  };
                  const interval = setInterval(moveLeft, 16);
                  const cleanup = () => clearInterval(interval);
                  window.addEventListener('pointerup', cleanup, { once: true });
                }}
              >
                ← Left
              </Button>
              <Button
                size="lg"
                variant="outline"
                onPointerDown={() => {
                  const moveRight = () => {
                    setGameState(prev => ({
                      ...prev,
                      playerX: Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, prev.playerX + PLAYER_SPEED * 0.016)
                    }));
                  };
                  const interval = setInterval(moveRight, 16);
                  const cleanup = () => clearInterval(interval);
                  window.addEventListener('pointerup', cleanup, { once: true });
                }}
              >
                Right →
              </Button>
            </div>
            <div className="flex justify-center">
              <Button
                size="lg"
                variant="outline"
                onPointerDown={() => {
                  const moveDown = () => {
                    setGameState(prev => ({
                      ...prev,
                      playerY: Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, prev.playerY + PLAYER_SPEED * 0.016)
                    }));
                  };
                  const interval = setInterval(moveDown, 16);
                  const cleanup = () => clearInterval(interval);
                  window.addEventListener('pointerup', cleanup, { once: true });
                }}
              >
                ↓ Down
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quiz Modal */}
      {gameState.showQuiz && quizProblems.length > 0 && (
        <QuizModal
          isOpen={gameState.showQuiz}
          question={{
            a: quizProblems[currentQuizIndex].a,
            b: quizProblems[currentQuizIndex].b,
            operator: quizProblems[currentQuizIndex].operator === '×' ? '*' : 
                     quizProblems[currentQuizIndex].operator === '÷' ? '/' :
                     quizProblems[currentQuizIndex].operator as '+' | '-' | '*' | '/',
            answer: quizProblems[currentQuizIndex].answer
          }}
          timeLimit={15} // Default 15 seconds per question
          onAnswer={(answer: number) => {
            const isCorrect = checkAnswer(quizProblems[currentQuizIndex], answer);
            handleQuizAnswer(answer);
          }}
          onTimeout={() => {
            // Treat timeout as a wrong answer
            handleQuizAnswer(-999999); // Unlikely to be correct
          }}
          onClose={() => {
            setGameState(prev => ({
              ...prev,
              showQuiz: false
              // Don't change pause state - maintain whatever it was
            }));
          }}
          questionsCompleted={currentQuizIndex}
          totalQuestions={quizProblems.length}
          failFastOnTimeout={false}
          isPaused={gameState.isPaused}
        />
      )}
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    }>
      <PlayGame />
    </Suspense>
  );
}