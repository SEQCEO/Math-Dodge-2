'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Player, Obstacle, PowerUp, GameState } from '@/lib/types/game'
import { generateMathQuestion } from '@/lib/utils/math-generator'
import { isOutOfBounds } from '@/lib/utils/collision'

const INITIAL_PLAYER: Player = {
  position: { x: 400, y: 500 },
  size: 30,
  speed: 5,
  lives: 3
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export function useGameLoop() {
  const [gameState, setGameState] = useState<GameState>({
    status: 'menu',
    score: 0,
    level: 1,
    highScore: parseInt(localStorage.getItem('mathDodgeHighScore') || '0'),
    currentQuestion: null
  })

  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER)
  const [obstacles, setObstacles] = useState<Obstacle[]>([])
  const [powerUps, setPowerUps] = useState<PowerUp[]>([])
  const [keys, setKeys] = useState<Set<string>>(new Set())
  
  const lastObstacleSpawn = useRef(0)
  const lastPowerUpSpawn = useRef(0)
  const questionInterval = useRef(0)

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set(prev).add(e.key.toLowerCase()))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev)
        newKeys.delete(e.key.toLowerCase())
        return newKeys
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Update player position
  useEffect(() => {
    if (gameState.status !== 'playing') return

    const updatePlayer = () => {
      setPlayer(prev => {
        let newX = prev.position.x
        let newY = prev.position.y

        if (keys.has('arrowleft') || keys.has('a')) newX -= prev.speed
        if (keys.has('arrowright') || keys.has('d')) newX += prev.speed
        if (keys.has('arrowup') || keys.has('w')) newY -= prev.speed
        if (keys.has('arrowdown') || keys.has('s')) newY += prev.speed

        // Keep player in bounds
        newX = Math.max(prev.size / 2, Math.min(CANVAS_WIDTH - prev.size / 2, newX))
        newY = Math.max(prev.size / 2, Math.min(CANVAS_HEIGHT - prev.size / 2, newY))

        return { ...prev, position: { x: newX, y: newY } }
      })
    }

    const interval = setInterval(updatePlayer, 1000 / 60) // 60 FPS
    return () => clearInterval(interval)
  }, [keys, gameState.status])

  // Spawn obstacles
  useEffect(() => {
    if (gameState.status !== 'playing') return

    const spawnObstacle = () => {
      const now = Date.now()
      const spawnDelay = Math.max(1000 - gameState.level * 50, 300)

      if (now - lastObstacleSpawn.current > spawnDelay) {
        lastObstacleSpawn.current = now

        const types: Array<'normal' | 'fast' | 'large'> = ['normal', 'normal', 'normal', 'fast', 'large']
        const type = types[Math.floor(Math.random() * types.length)]

        const newObstacle: Obstacle = {
          id: Math.random().toString(36).substr(2, 9),
          position: {
            x: Math.random() * (CANVAS_WIDTH - 40) + 20,
            y: -30
          },
          size: type === 'large' ? 50 : 30,
          speed: type === 'fast' ? 4 + gameState.level : 2 + gameState.level * 0.5,
          type
        }

        setObstacles(prev => [...prev, newObstacle])
      }
    }

    const interval = setInterval(spawnObstacle, 100)
    return () => clearInterval(interval)
  }, [gameState.status, gameState.level])

  // Update obstacles
  useEffect(() => {
    if (gameState.status !== 'playing') return

    const updateObstacles = () => {
      setObstacles(prev => 
        prev
          .map(obstacle => ({
            ...obstacle,
            position: { ...obstacle.position, y: obstacle.position.y + obstacle.speed }
          }))
          .filter(obstacle => obstacle.position.y < CANVAS_HEIGHT + obstacle.size)
      )
    }

    const interval = setInterval(updateObstacles, 1000 / 60)
    return () => clearInterval(interval)
  }, [gameState.status])

  // Spawn power-ups
  useEffect(() => {
    if (gameState.status !== 'playing') return

    const spawnPowerUp = () => {
      const now = Date.now()
      if (now - lastPowerUpSpawn.current > 10000) { // Every 10 seconds
        lastPowerUpSpawn.current = now

        const types: Array<'shield' | 'slowTime' | 'doublePoints'> = ['shield', 'slowTime', 'doublePoints']
        const type = types[Math.floor(Math.random() * types.length)]

        const newPowerUp: PowerUp = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          position: {
            x: Math.random() * (CANVAS_WIDTH - 40) + 20,
            y: -30
          },
          duration: 5000
        }

        setPowerUps(prev => [...prev, newPowerUp])
      }
    }

    const interval = setInterval(spawnPowerUp, 1000)
    return () => clearInterval(interval)
  }, [gameState.status])

  // Update power-ups
  useEffect(() => {
    if (gameState.status !== 'playing') return

    const updatePowerUps = () => {
      setPowerUps(prev => 
        prev
          .map(powerUp => ({
            ...powerUp,
            position: { ...powerUp.position, y: powerUp.position.y + 2 }
          }))
          .filter(powerUp => powerUp.position.y < CANVAS_HEIGHT + 30)
      )
    }

    const interval = setInterval(updatePowerUps, 1000 / 60)
    return () => clearInterval(interval)
  }, [gameState.status])

  // Score system
  useEffect(() => {
    if (gameState.status !== 'playing') return

    const interval = setInterval(() => {
      setGameState(prev => ({ ...prev, score: prev.score + 1 }))
    }, 100)

    return () => clearInterval(interval)
  }, [gameState.status])

  // Level progression and math questions
  useEffect(() => {
    if (gameState.status !== 'playing') return

    questionInterval.current += 1

    if (questionInterval.current >= 150) { // Every 15 seconds
      questionInterval.current = 0
      const difficulty = gameState.level < 3 ? 'easy' : gameState.level < 6 ? 'medium' : 'hard'
      const question = generateMathQuestion(gameState.level, difficulty)
      setGameState(prev => ({ ...prev, status: 'question', currentQuestion: question }))
    }
  }, [gameState.score, gameState.level])

  // Game methods
  const startGame = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      status: 'playing',
      score: 0,
      level: 1,
      currentQuestion: null
    }))
    setPlayer(INITIAL_PLAYER)
    setObstacles([])
    setPowerUps([])
    questionInterval.current = 0
  }, [])

  const handleCollision = useCallback(() => {
    setPlayer(prev => {
      const newLives = prev.lives - 1
      if (newLives <= 0) {
        const newHighScore = Math.max(gameState.score, gameState.highScore)
        localStorage.setItem('mathDodgeHighScore', newHighScore.toString())
        setGameState(prev => ({ ...prev, status: 'gameOver', highScore: newHighScore }))
      }
      return { ...prev, lives: newLives }
    })
  }, [gameState.score, gameState.highScore])

  const handlePowerUpCollect = useCallback((powerUp: PowerUp) => {
    setPowerUps(prev => prev.filter(p => p.id !== powerUp.id))
    
    // Apply power-up effect
    if (powerUp.type === 'doublePoints') {
      setGameState(prev => ({ ...prev, score: prev.score + 100 }))
    }
    // Add more power-up effects here
  }, [])

  const handleQuestionAnswer = useCallback((correct: boolean) => {
    if (correct) {
      setGameState(prev => ({
        ...prev,
        score: prev.score + 50 * prev.level,
        level: prev.level + 1,
        status: 'playing',
        currentQuestion: null
      }))
    } else {
      handleCollision()
      setGameState(prev => ({
        ...prev,
        status: 'playing',
        currentQuestion: null
      }))
    }
  }, [handleCollision])

  const goToMainMenu = useCallback(() => {
    setGameState(prev => ({ ...prev, status: 'menu' }))
  }, [])

  return {
    gameState,
    player,
    obstacles,
    powerUps,
    startGame,
    handleCollision,
    handlePowerUpCollect,
    handleQuestionAnswer,
    goToMainMenu
  }
}