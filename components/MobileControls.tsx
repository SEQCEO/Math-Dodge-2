import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileControlsProps {
  onLeft: () => void;
  onRight: () => void;
  onLeftStart: () => void;
  onLeftEnd: () => void;
  onRightStart: () => void;
  onRightEnd: () => void;
}

export function MobileControls({
  onLeft,
  onRight,
  onLeftStart,
  onLeftEnd,
  onRightStart,
  onRightEnd
}: MobileControlsProps) {
  const [leftPressed, setLeftPressed] = useState(false);
  const [rightPressed, setRightPressed] = useState(false);

  const handleLeftStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setLeftPressed(true);
    onLeftStart();
  };

  const handleLeftEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setLeftPressed(false);
    onLeftEnd();
  };

  const handleRightStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setRightPressed(true);
    onRightStart();
  };

  const handleRightEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setRightPressed(false);
    onRightEnd();
  };

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 flex justify-between p-4 bg-gray-800 shadow-lg md:hidden"
      role="group"
      aria-label="Mobile movement controls"
    >
      <button
        className={`
          flex-1 mr-2 py-4 rounded-lg transition-all
          ${leftPressed 
            ? 'bg-blue-600 scale-95 shadow-inner' 
            : 'bg-blue-500 hover:bg-blue-600 shadow-md'
          }
          text-white font-bold text-lg
          focus:outline-none focus:ring-2 focus:ring-blue-400
        `}
        onMouseDown={handleLeftStart}
        onMouseUp={handleLeftEnd}
        onMouseLeave={handleLeftEnd}
        onTouchStart={handleLeftStart}
        onTouchEnd={handleLeftEnd}
        onClick={onLeft}
        aria-label="Move left"
      >
        <ChevronLeft size={32} className="mx-auto" aria-hidden="true" />
      </button>

      <button
        className={`
          flex-1 ml-2 py-4 rounded-lg transition-all
          ${rightPressed 
            ? 'bg-blue-600 scale-95 shadow-inner' 
            : 'bg-blue-500 hover:bg-blue-600 shadow-md'
          }
          text-white font-bold text-lg
          focus:outline-none focus:ring-2 focus:ring-blue-400
        `}
        onMouseDown={handleRightStart}
        onMouseUp={handleRightEnd}
        onMouseLeave={handleRightEnd}
        onTouchStart={handleRightStart}
        onTouchEnd={handleRightEnd}
        onClick={onRight}
        aria-label="Move right"
      >
        <ChevronRight size={32} className="mx-auto" aria-hidden="true" />
      </button>
    </div>
  );
}