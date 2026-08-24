// frontend/components/SeatGrid.tsx

import React from 'react';

interface SeatGridProps {
  players: Array<{
    id: string;
    walletAddress: string;
    isWinner: boolean;
  }>;
  maxSeats: number;
  isCompleted: boolean;
  winnerId?: string;
}

export function SeatGrid({ players, maxSeats, isCompleted, winnerId }: SeatGridProps) {
  const seats = Array.from({ length: maxSeats }, (_, i) => {
    const player = players[i] || null;
    return { index: i, player };
  });

  const getSeatColor = (seat: any) => {
    if (!seat.player) return 'bg-white/5 border-white/10';
    if (seat.player.isWinner) return 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-yellow-500/50 shadow-lg shadow-yellow-500/20';
    return 'bg-purple-500/20 border-purple-500/30';
  };

  const getSeatIcon = (seat: any) => {
    if (!seat.player) return '○';
    if (seat.player.isWinner) return '👑';
    return '●';
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
      <h3 className="font-bold mb-4">Seats ({players.length}/{maxSeats})</h3>
      <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {seats.map((seat) => (
          <div
            key={seat.index}
            className={`aspect-square rounded-lg border-2 ${getSeatColor(seat)} flex flex-col items-center justify-center p-1 transition-all relative`}
          >
            <div className="text-lg">{getSeatIcon(seat)}</div>
            {seat.player && (
              <div className="text-[8px] text-gray-400 truncate w-full text-center">
                {seat.player.walletAddress.slice(0, 4)}...{seat.player.walletAddress.slice(-4)}
              </div>
            )}
            {isCompleted && seat.player?.isWinner && (
              <div className="absolute -top-2 -right-2 text-xs bg-yellow-500 rounded-full px-1.5 py-0.5 animate-bounce">
                🏆
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
