import React, { useState } from 'react';
import { Delete } from 'lucide-react';

interface NumericKeypadProps {
  onPress: (digit: string) => void;
  onBackspace: () => void;
  onEnter: () => void;
  disabled?: boolean;
}

export function NumericKeypad({
  onPress,
  onBackspace,
  onEnter,
  disabled = false
}: NumericKeypadProps) {
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  const handlePress = (key: string) => {
    if (disabled) return;
    
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);
    
    if (key === 'backspace') {
      onBackspace();
    } else if (key === 'enter') {
      onEnter();
    } else {
      onPress(key);
    }
  };

  const buttonClass = (key: string) => `
    relative overflow-hidden
    ${pressedKey === key ? 'scale-95 bg-gray-700' : 'bg-gray-600 hover:bg-gray-700'}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    text-white font-bold text-xl
    rounded-lg transition-all duration-75
    focus:outline-none focus:ring-2 focus:ring-blue-500
    shadow-md active:shadow-inner
  `;

  return (
    <div 
      className="grid grid-cols-3 gap-2 p-4 bg-gray-800 rounded-lg"
      role="group"
      aria-label="Numeric keypad"
    >
      {/* First three rows: 1-9 */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <button
          key={digit}
          className={buttonClass(digit.toString())}
          onClick={() => handlePress(digit.toString())}
          disabled={disabled}
          aria-label={`Digit ${digit}`}
        >
          <div className="py-4">{digit}</div>
        </button>
      ))}

      {/* Bottom row: backspace, 0, enter */}
      <button
        className={buttonClass('backspace')}
        onClick={() => handlePress('backspace')}
        disabled={disabled}
        aria-label="Backspace"
      >
        <div className="py-4">
          <Delete size={24} className="mx-auto" aria-hidden="true" />
        </div>
      </button>

      <button
        className={buttonClass('0')}
        onClick={() => handlePress('0')}
        disabled={disabled}
        aria-label="Digit 0"
      >
        <div className="py-4">0</div>
      </button>

      <button
        className={`${buttonClass('enter')} bg-green-600 hover:bg-green-700`}
        onClick={() => handlePress('enter')}
        disabled={disabled}
        aria-label="Enter"
      >
        <div className="py-4 text-sm">Enter</div>
      </button>
    </div>
  );
}