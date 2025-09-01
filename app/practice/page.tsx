'use client'

import { useState, useEffect } from 'react'
import { Play, Plus, Minus, X, Divide } from 'lucide-react'
import { QuizModal } from '@/components/QuizModal'
import { loadGameSettings, ExtendedGameSettings, operatorColors } from '@/lib/gameSettings'
import { Operator } from '@/lib/types'

// Map operator names to symbols
const operatorSymbols = {
  addition: { icon: Plus, symbol: '+', operator: 'add' as Operator },
  subtraction: { icon: Minus, symbol: '-', operator: 'sub' as Operator },
  multiplication: { icon: X, symbol: '×', operator: 'mul' as Operator },
  division: { icon: Divide, symbol: '÷', operator: 'div' as Operator }
}

export default function Practice() {
  const [settings, setSettings] = useState<ExtendedGameSettings | null>(null)
  const [selectedOperator, setSelectedOperator] = useState<keyof typeof operatorSymbols | null>(null)
  const [isQuizOpen, setIsQuizOpen] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState<{
    a: number
    b: number
    operator: '+' | '-' | '*' | '/'
    answer: number
  } | null>(null)
  const [questionsCompleted, setQuestionsCompleted] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  // Load settings on mount
  useEffect(() => {
    loadGameSettings().then(setSettings)
  }, [])

  // Generate a random question based on settings
  const generateQuestion = () => {
    if (!settings || !selectedOperator) return

    const opSettings = settings.operators[selectedOperator]
    const a = Math.floor(Math.random() * (opSettings.maxA - opSettings.minA + 1)) + opSettings.minA
    const b = Math.floor(Math.random() * (opSettings.maxB - opSettings.minB + 1)) + opSettings.minB
    
    let operator: '+' | '-' | '*' | '/'
    let answer: number
    let adjustedA = a
    let adjustedB = b

    switch (selectedOperator) {
      case 'addition':
        operator = '+'
        answer = a + b
        break
      case 'subtraction':
        operator = '-'
        // Ensure non-negative result if not allowed
        if (!opSettings.allowNegative && a < b) {
          adjustedA = b
          adjustedB = a
        }
        answer = adjustedA - adjustedB
        break
      case 'multiplication':
        operator = '*'
        answer = a * b
        break
      case 'division':
        operator = '/'
        // Ensure clean division
        adjustedA = a * b // Make dividend a multiple of divisor
        answer = a
        break
    }

    setCurrentQuestion({
      a: adjustedA,
      b: adjustedB,
      operator,
      answer
    })
  }

  // Start quiz with selected operator
  const startQuiz = () => {
    if (!selectedOperator || !settings) return
    
    setQuestionsCompleted(0)
    setCorrectAnswers(0)
    generateQuestion()
    setIsQuizOpen(true)
  }

  // Handle answer submission
  const handleAnswer = (userAnswer: number, isCorrect: boolean) => {
    if (isCorrect) {
      setCorrectAnswers(prev => prev + 1)
    }
    
    setQuestionsCompleted(prev => prev + 1)
    
    // Generate next question after a short delay
    setTimeout(() => {
      generateQuestion()
    }, 1000)
  }

  // Handle quiz close
  const handleQuizClose = () => {
    setIsQuizOpen(false)
    setCurrentQuestion(null)
    setQuestionsCompleted(0)
    setCorrectAnswers(0)
  }

  if (!settings) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center">
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  // Get enabled operators
  const enabledOperators = Object.entries(settings.operators)
    .filter(([_, config]) => config.enabled)
    .map(([op]) => op as keyof typeof operatorSymbols)

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Practice Mode</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select a math operator and practice your skills without the pressure of the game.
          Perfect for focused learning!
        </p>
      </div>

      {/* Operator Selection */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
          Choose an Operator
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {(Object.keys(operatorSymbols) as Array<keyof typeof operatorSymbols>).map(op => {
            const { icon: Icon, symbol } = operatorSymbols[op]
            const colors = operatorColors[op]
            const isEnabled = enabledOperators.includes(op)
            const isSelected = selectedOperator === op
            
            return (
              <button
                key={op}
                onClick={() => isEnabled && setSelectedOperator(op)}
                disabled={!isEnabled}
                className={`
                  relative p-8 rounded-lg border-2 transition-all
                  ${isEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
                  ${isSelected 
                    ? `border-${colors.bg.replace('bg-', '')} ${colors.light} shadow-lg scale-105` 
                    : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-md'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`p-3 rounded-full ${isSelected ? colors.bg : 'bg-gray-200'}`}>
                    <Icon className={`w-8 h-8 ${isSelected ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <span className="text-lg font-semibold capitalize text-gray-900">
                    {op}
                  </span>
                  <span className={`text-2xl font-bold ${isSelected ? colors.text : 'text-gray-500'}`}>
                    {symbol}
                  </span>
                </div>
                {!isEnabled && (
                  <div className="absolute inset-0 bg-gray-100 bg-opacity-50 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-gray-600 bg-white px-3 py-1 rounded-full shadow">
                      Disabled in settings
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* Start Quiz Button */}
      {selectedOperator && (
        <div className="text-center">
          <button
            onClick={startQuiz}
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors shadow-lg text-lg"
          >
            <Play className="w-6 h-6" />
            Start {selectedOperator.charAt(0).toUpperCase() + selectedOperator.slice(1)} Quiz
          </button>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>Range: {settings.operators[selectedOperator].minA}-{settings.operators[selectedOperator].maxA} {operatorSymbols[selectedOperator].symbol} {settings.operators[selectedOperator].minB}-{settings.operators[selectedOperator].maxB}</p>
            <p>Time limit: {settings.secondsPerQuestion} seconds per question</p>
          </div>
        </div>
      )}

      {/* Quiz Statistics */}
      {questionsCompleted > 0 && !isQuizOpen && (
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
            Practice Results
          </h3>
          <div className="space-y-2 text-center">
            <p className="text-lg">
              Questions Completed: <span className="font-bold">{questionsCompleted}</span>
            </p>
            <p className="text-lg">
              Correct Answers: <span className="font-bold text-green-600">{correctAnswers}</span>
            </p>
            <p className="text-lg">
              Accuracy: <span className="font-bold">
                {questionsCompleted > 0 ? Math.round((correctAnswers / questionsCompleted) * 100) : 0}%
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Quiz Modal */}
      {currentQuestion && (
        <QuizModal
          isOpen={isQuizOpen}
          question={currentQuestion}
          timeLimit={settings.secondsPerQuestion}
          onAnswer={handleAnswer}
          onTimeout={() => handleAnswer(0, false)}
          onClose={handleQuizClose}
          questionsCompleted={questionsCompleted}
          totalQuestions={99} // Unlimited in practice mode
          failFastOnTimeout={false}
          isPaused={false}
        />
      )}
    </div>
  )
}