// frontend/components/Timer.tsx

import React, { useState, useEffect } from 'react';

interface TimerProps {
  endTime: Date;
}

export function Timer({ endTime }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance <= 0) {
        setTimeLeft('00:00');
        return;
      }

      const minutes = Math.floor(distance / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <span className="font-mono text-lg font-bold text-yellow-400 animate-pulse">
      ⏱️ {timeLeft}
    </span>
  );
}
