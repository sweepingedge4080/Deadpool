// frontend/components/CreateRoomModal.tsx

import React, { useState } from 'react';

interface CreateRoomModalProps {
  onClose: () => void;
  onCreated: (roomId: string) => void;
  walletAddress: string | null;
}

const BUY_IN_OPTIONS = [
  { label: '10¢', value: 10 },
  { label: '$1', value: 100 },
  { label: '$10', value: 1000 },
  { label: '$100', value: 10000 },
  { label: '$1,000', value: 100000 },
];

const SEAT_OPTIONS = [10, 25, 50, 100, 200];

export function CreateRoomModal({ onClose, onCreated, walletAddress }: CreateRoomModalProps) {
  const [buyInAmount, setBuyInAmount] = useState(100); // $1 default
  const [maxSeats, setMaxSeats] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          buyInAmount,
          maxSeats,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create room');
      }

      onCreated(data.data.roomId);
    } catch (error: any) {
      console.error('Error creating room:', error);
      setError(error.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (cents >= 100) {
      return `$${(cents / 100).toFixed(2)}`;
    }
    return `${cents}¢`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-b from-purple-900/90 to-black/90 border border-purple-500/30 rounded-2xl p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold">Create Room</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Buy-in Amount */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">
              Buy-in Amount
            </label>
            <div className="grid grid-cols-3 gap-2">
              {BUY_IN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBuyInAmount(option.value)}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    buyInAmount === option.value
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Max Seats */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">
              Max Seats
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SEAT_OPTIONS.map((seats) => (
                <button
                  key={seats}
                  onClick={() => setMaxSeats(seats)}
                  className={`py-2 rounded-lg font-bold transition-all ${
                    maxSeats === seats
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {seats}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Room size:</span>
              <span className="font-bold">{maxSeats} players</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Buy-in:</span>
              <span className="font-bold">{formatPrice(buyInAmount)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
              <span className="text-gray-400">Max Prize Pool:</span>
              <span className="font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                {formatPrice(buyInAmount * maxSeats)}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-purple-500/50 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '🚀 Creating...' : '🚀 Launch Room'}
          </button>
        </div>
      </div>
    </div>
  );
}
