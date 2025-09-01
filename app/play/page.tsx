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
const PLAYER_SPEED = 300; // pixels per second
const MAX_BUBBLES = 6;
const SPEED_INCREASE_INTERVAL = 20; // seconds
const SPEED_INCREASE_RATE = 0.02; // 2%
const MAX_SPEED_MULTIPLIER = 1.5;
const MAX_DT = 33; // milliseconds

function PlayGame() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === '1';
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const elapsedTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const debugSpawnIndexRef = useRef<number>(0);
  
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

  // Handle collision
  const handleCollision = useCallback((bubble: Bubble) => {
    playSound('collision');
    
    // Track which operator was hit
    setCurrentOperator(bubble.operator);
    
    // Generate quiz problems for the specific operator that was hit
    const problems: Problem[] = [];
    for (let i = 0; i < settings.questionsPerCollision; i++) {
      problems.push(generateProblem({
        difficulty: settings.difficulty,
        operators: [bubble.operator] // Only generate problems for the hit operator
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
      if (quizScore === quizProblems.length - 1 && isCorrect) {
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
    spawnTimerRef.current += dt;

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
    if (!gameState.isGameOver && !gameState.showQuiz && !gameState.isPaused) {
      if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
        playerX -= PLAYER_SPEED * dt;
      }
      if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
        playerX += PLAYER_SPEED * dt;
      }
      playerX = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, playerX));
      
      // Update state if position changed
      if (playerX !== gameState.playerX) {
        setGameState(prev => ({ ...prev, playerX }));
      }
    }

    // Update and draw player
    const playerRect = {
      x: playerX - PLAYER_SIZE / 2,
      y: gameState.playerY - PLAYER_SIZE / 2,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE
    };

    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(playerRect.x, playerRect.y, playerRect.width, playerRect.height);

    // Update bubbles
    const updatedBubbles: Bubble[] = [];
    let collisionDetected = false;

    for (const bubble of gameState.bubbles) {
      // Update position
      bubble.y += bubble.speed * speedMultiplier * dt;

      // Check collision with player
      if (!collisionDetected && circleIntersectsRect(
        { x: bubble.x, y: bubble.y, radius: BUBBLE_RADIUS },
        playerRect
      )) {
        collisionDetected = true;
        handleCollision(bubble);
        break; // Stop processing bubbles since we'll clear them all
      }

      // Keep bubble if still on screen
      if (bubble.y < CANVAS_HEIGHT + BUBBLE_RADIUS) {
        updatedBubbles.push(bubble);
      }
    }

    // Draw bubbles
    for (const bubble of updatedBubbles) {
      // Bubble background
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, BUBBLE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = bubble.color;
      ctx.fill();

      // Bubble text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(bubble.operator, bubble.x, bubble.y);
    }

    // Spawn new bubbles
    const spawnRate = isDebug ? 2 : settings.bubbleSpawnRate;
    if (spawnTimerRef.current >= 1 / spawnRate && updatedBubbles.length < MAX_BUBBLES) {
      spawnTimerRef.current = 0;

      let operator: string;
      if (isDebug) {
        // Cycle through operators in debug mode
        const operators = settings.enabledOperators;
        operator = operators[debugSpawnIndexRef.current % operators.length];
        debugSpawnIndexRef.current++;
      } else {
        // Random operator
        const operators = settings.enabledOperators;
        operator = operators[Math.floor(Math.random() * operators.length)];
      }

      const bubble: Bubble = {
        id: Date.now() + Math.random(),
        x: BUBBLE_RADIUS + Math.random() * (CANVAS_WIDTH - 2 * BUBBLE_RADIUS),
        y: -BUBBLE_RADIUS,
        speed: 100 + Math.random() * 50,
        operator,
        color: operator === '+' ? '#4ade80' : 
               operator === '-' ? '#f87171' :
               operator === '×' ? '#60a5fa' : '#fbbf24'
      };

      updatedBubbles.push(bubble);
    }

    // Update state
    if (!collisionDetected) {
      setGameState(prev => ({ ...prev, bubbles: updatedBubbles }));
      setDebugInfo(prev => ({ ...prev, entities: updatedBubbles.length }));
    }

    // Continue loop
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, settings, isDebug, handleCollision]);

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
      const x = (e.clientX - rect.left) * scaleX;

      setGameState(prev => ({
        ...prev,
        playerX: Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, x))
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
          <div className="mt-4 flex justify-center gap-4">
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