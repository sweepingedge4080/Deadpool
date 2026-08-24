// frontend/components/WinnerAnnouncement.tsx

import React, { useEffect, useState } from 'react';

interface WinnerAnnouncementProps {
  winner?: {
    id: string;
    walletAddress: string;
    isWinner: boolean;
  } | null;
  poolAmount: number;
  isCurrentUser: boolean;
}

export function WinnerAnnouncement({ winner, poolAmount, isCurrentUser }: WinnerAnnouncementProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (winner) {
      setShowCelebration(true);
      // Play confetti effect
      if (isCurrentUser) {
        // Trigger special celebration
      }
    }
  }, [winner, isCurrentUser]);

  if (!winner) return null;

  return (
    <div className={`bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-6 text-center ${
      showCelebration ? 'animate-pulse' : ''
    }`}>
      <div className="text-4xl mb-2">🏆</div>
      <h3 className="text-xl font-bold text-yellow-400 mb-2">
        {isCurrentUser ? '🎉 YOU WON! 🎉' : 'Winner Announced!'}
      </h3>
      <div className="text-sm text-gray-300 mb-1">
        {isCurrentUser ? 'Congratulations!' : `Winner: ${winner.walletAddress.slice(0, 6)}...${winner.walletAddress.slice(-4)}`}
      </div>
      <div className="text-3xl font-bold text-transparent bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text">
        ${(poolAmount / 100).toFixed(2)}
      </div>
      <div className="text-xs text-gray-400 mt-2">
        🎊 Prize pool collected 🎊
      </div>
      {isCurrentUser && (
        <button
          onClick={() => {
            // Handle claim
            alert('Claiming your prize! (Smart contract integration coming soon)');
          }}
          className="mt-4 px-8 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-bold hover:shadow-lg hover:shadow-yellow-500/50 transition-all"
        >
          Claim Prize
        </button>
      )}
    </div>
  );
}
