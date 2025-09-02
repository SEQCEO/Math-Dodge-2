import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { NumericKeypad } from '@/components/NumericKeypad';

interface QuizModalProps {
  isOpen: boolean;
  question: {
    a: number;
    b: number;
    operator: '+' | '-' | '*' | '/';
    answer: number;
  };
  timeLimit: number;
  onAnswer: (answer: number, isCorrect: boolean) => void;
  onTimeout: () => void;
  onClose: () => void;
  questionsCompleted: number;
  totalQuestions: number;
  failFastOnTimeout: boolean;
  isPaused: boolean;
}

const operatorColors: Record<string, string> = {
  '+': 'bg-green-600',
  '-': 'bg-blue-600',
  '*': 'bg-purple-600',
  '/': 'bg-orange-600',
  '×': 'bg-purple-600',
  '÷': 'bg-orange-600'
};

const operatorDisplay: Record<string, string> = {
  '+': '+',
  '-': '-',
  '*': '×',
  '/': '÷'
};

export function QuizModal({
  isOpen,
  question,
  timeLimit,
  onAnswer,
  onTimeout,
  onClose,
  questionsCompleted,
  totalQuestions,
  failFastOnTimeout,
  isPaused
}: QuizModalProps) {
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens or question changes
  useEffect(() => {
    if (isOpen) {
      setUserAnswer('');
      setShowResult(false);
      setTimeRemaining(timeLimit);
      // Focus the modal for accessibility and ensure keyboard events work
      setTimeout(() => {
        modalRef.current?.focus();
        // Also focus the window to ensure keyboard events are captured
        window.focus();
      }, 100);
    }
  }, [isOpen, question, timeLimit]);

  // Timer effect
  useEffect(() => {
    if (!isOpen || isPaused || showResult) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 0) {
          if (failFastOnTimeout) {
            handleTimeout();
          } else {
            handleSubmit();
          }
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, showResult, failFastOnTimeout]);

  const handleTimeout = () => {
    setShowResult(true);
    setIsCorrect(false);
    onTimeout();
  };

  const handleSubmit = useCallback(() => {
    const answer = parseInt(userAnswer, 10);
    const correct = answer === question.answer;
    setIsCorrect(correct);
    setShowResult(true);
    
    // Show result for a moment before calling onAnswer
    setTimeout(() => {
      onAnswer(answer, correct);
    }, correct ? 1000 : 2000);
  }, [userAnswer, question.answer, onAnswer]);

  const handleKeyPress = useCallback((digit: string) => {
    if (showResult) return;
    
    // Handle negative sign
    if (digit === '-') {
      if (userAnswer === '') {
        setUserAnswer('-');
      } else if (userAnswer === '-') {
        setUserAnswer('');
      }
      return;
    }
    
    // Prevent leading zeros (except after negative sign)
    if (userAnswer === '0' && digit === '0') return;
    if (userAnswer === '0' && digit !== '0') {
      setUserAnswer(digit);
      return;
    }
    
    // Limit answer length
    if (userAnswer.length >= 6) return;
    
    setUserAnswer(userAnswer + digit);
  }, [userAnswer, showResult]);

  const handleBackspace = useCallback(() => {
    if (showResult) return;
    setUserAnswer(userAnswer.slice(0, -1));
  }, [userAnswer, showResult]);

  const handleEnter = useCallback(() => {
    if (showResult || !userAnswer) return;
    handleSubmit();
  }, [showResult, userAnswer, handleSubmit]);

  // Global keyboard listener
  useEffect(() => {
    if (!isOpen || showResult) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Debug logging to see what's happening
      console.log('Key event:', {
        key: e.key,
        code: e.code,
        keyCode: e.keyCode,
        which: e.which,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      });
      
      // Handle all number inputs - from main keyboard, numpad, or any other source
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        console.log('Number key pressed:', e.key);
        handleKeyPress(e.key);
        return;
      }
      
      // Also check keyCode for numpad (96-105 are numpad 0-9)
      if (e.keyCode >= 96 && e.keyCode <= 105) {
        e.preventDefault();
        const digit = String(e.keyCode - 96);
        console.log('Numpad digit via keyCode:', digit);
        handleKeyPress(digit);
        return;
      }
      
      // Handle minus/negative sign
      if (e.key === '-' || e.keyCode === 109 || e.keyCode === 189) {
        e.preventDefault();
        handleKeyPress('-');
      } else if (e.key === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault();
        handleEnter();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showResult, handleKeyPress, handleEnter, handleBackspace, onClose]);

  if (!isOpen) return null;

  const progressPercentage = (timeRemaining / timeLimit) * 100;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-title"
      aria-describedby="quiz-description"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-gray-900 rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className={`px-3 py-1 rounded ${operatorColors[question.operator]} text-white font-bold`}>
            {operatorDisplay[question.operator] || question.operator}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
            aria-label="Close quiz"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span id="quiz-description">Question {questionsCompleted + 1} of {totalQuestions}</span>
            <span>{Math.ceil(timeRemaining)}s</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-100"
              style={{ width: `${(questionsCompleted / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Timer visual */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <svg className="transform -rotate-90 w-24 h-24">
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-gray-800"
            />
            <circle
              cx="48"
              cy="48"
              r="45"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className={`${
                progressPercentage > 20 ? 'text-blue-500' : 'text-red-500'
              } transition-colors`}
              style={{
                strokeDasharray: circumference,
                strokeDashoffset: strokeDashoffset,
                transition: 'stroke-dashoffset 0.1s linear'
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {Math.ceil(timeRemaining)}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="text-center mb-6">
          <h2 id="quiz-title" className="text-3xl font-bold text-white">
            {question.a} {operatorDisplay[question.operator] || question.operator} {question.b} = ?
          </h2>
        </div>

        {/* Answer input */}
        <div className="mb-6">
          <input
            ref={inputRef}
            type="text"
            value={userAnswer}
            readOnly
            className={`
              w-full text-center text-2xl font-bold p-3 rounded-lg
              ${showResult 
                ? isCorrect 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
                : 'bg-gray-800 text-white'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500
            `}
            placeholder="Your answer"
            aria-label="Your answer"
          />
          {showResult && !isCorrect && (
            <p className="text-center mt-2 text-gray-400">
              Correct answer: <span className="font-bold text-white">{question.answer}</span>
            </p>
          )}
          {/* Debug info */}
          <p className="text-center mt-2 text-xs text-gray-500">
            Press any key to test input (check console)
          </p>
        </div>

        {/* Keypad */}
        <NumericKeypad
          onPress={handleKeyPress}
          onBackspace={handleBackspace}
          onEnter={handleEnter}
          disabled={showResult}
        />

        {/* Pause indicator */}
        {isPaused && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg">
            <p className="text-2xl font-bold text-white">PAUSED</p>
          </div>
        )}
      </div>
    </div>
  );
}