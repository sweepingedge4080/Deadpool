// frontend/components/RoomCard.tsx

import React from 'react';

interface RoomCardProps {
  room: {
    id: string;
    players: number;
    maxSeats: number;
    buyInAmount: number;
    poolAmount: number;
    status: string;
    timerEndsAt?: Date;
  };
  onJoin: () => void;
  isWalletConnected: boolean;
}

export function RoomCard({ room, onJoin, isWalletConnected }: RoomCardProps) {
  const progress = (room.players / room.maxSeats) * 100;
  const isFull = room.players >= room.maxSeats;
  const isCountdown = room.status === 'COUNTDOWN';
  const isWaiting = room.status === 'WAITING';

  const getStatusBadge = () => {
    if (isCountdown) {
      return (
        <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm animate-pulse">
          ⏳ COUNTDOWN
        </span>
      );
    }
    if (isFull) {
      return (
        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">
          ✅ FULL
        </span>
      );
    }
    return (
      <span className="bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm">
        🎯 WAITING
      </span>
    );
  };

  const formatPrice = (cents: number) => {
    if (cents >= 100) {
      return `$${(cents / 100).toFixed(2)}`;
    }
    return `${cents}¢`;
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:bg-white/10 transition-all hover:border-purple-500/40">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-sm text-gray-400 font-mono mb-1">#{room.id}</div>
          <div className="text-2xl font-bold">{formatPrice(room.poolAmount)}</div>
          <div className="text-sm text-gray-400">Pool Prize</div>
        </div>
        {getStatusBadge()}
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-400">Players</span>
          <span className="font-bold">{room.players} / {room.maxSeats}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full h-2 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-sm text-gray-400 mb-4">
        <span>Buy-in: {formatPrice(room.buyInAmount)}</span>
        {isCountdown && room.timerEndsAt && (
          <span className="text-yellow-400">
            ⏱️ {Math.floor((new Date(room.timerEndsAt).getTime() - Date.now()) / 1000 / 60)}m
          </span>
        )}
      </div>

      <button
        onClick={onJoin}
        disabled={!isWalletConnected || isFull || isCountdown}
        className={`w-full py-3 rounded-full font-bold transition-all ${
          !isWalletConnected
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : isFull || isCountdown
            ? 'bg-gray-600/50 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50'
        }`}
      >
        {!isWalletConnected
          ? 'Connect Wallet to Join'
          : isFull
          ? 'Room Full'
          : isCountdown
          ? 'Room Locked'
          : '🎯 Join Room'}
      </button>
    </div>
  );
}
