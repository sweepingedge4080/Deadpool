// frontend/pages/room/[id].tsx

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '../../hooks/useWallet';
import { SeatGrid } from '../../components/SeatGrid';
import { Timer } from '../../components/Timer';
import { WinnerAnnouncement } from '../../components/WinnerAnnouncement';

interface RoomData {
  id: string;
  maxSeats: number;
  buyInAmount: number;
  players: Array<{
    id: string;
    walletAddress: string;
    isWinner: boolean;
  }>;
  status: 'WAITING' | 'FULL' | 'COUNTDOWN' | 'DRAWING' | 'COMPLETED';
  poolAmount: number;
  timerEndsAt?: Date;
  winnerId?: string;
}

export default function RoomPage() {
  const router = useRouter();
  const { id } = router.query;
  const { walletAddress, connectWallet } = useWallet();
  const [room, setRoom] = useState<RoomData | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (id && walletAddress) {
      fetchRoom();
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id, walletAddress]);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/rooms/${id}`);
      const data = await response.json();
      if (data.success) {
        setRoom(data.data);
        setHasJoined(data.data.players.some((p: any) => p.walletAddress === walletAddress));
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = () => {
    const ws = new WebSocket(`ws://localhost:3001`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      if (walletAddress && id) {
        ws.send(JSON.stringify({
          type: 'JOIN_ROOM',
          roomId: id,
          walletAddress
        }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'ROOM_STATE':
        setRoom(data.data);
        setHasJoined(data.data.players.some((p: any) => p.walletAddress === walletAddress));
        break;
      case 'PLAYER_JOINED':
        if (room) {
          setRoom({
            ...room,
            players: [...room.players, data.data.player],
            poolAmount: room.poolAmount + room.buyInAmount
          });
        }
        break;
      case 'PLAYER_LEFT':
        if (room) {
          setRoom({
            ...room,
            players: room.players.filter(p => p.walletAddress !== data.data.walletAddress)
          });
        }
        break;
      case 'COUNTDOWN_STARTED':
        if (room) {
          setRoom({
            ...room,
            status: 'COUNTDOWN',
            timerEndsAt: new Date(data.data.timerEndsAt)
          });
        }
        break;
      case 'WINNER_SELECTED':
        if (room) {
          setRoom({
            ...room,
            status: 'COMPLETED',
            winnerId: data.data.winnerId,
            players: room.players.map(p => ({
              ...p,
              isWinner: p.id === data.data.winnerId
            }))
          });
        }
        break;
    }
  };

  const handleJoinRoom = async () => {
    if (!walletAddress) {
      connectWallet();
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: id,
          walletAddress
        })
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.error);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-4">😕</p>
          <p className="text-xl text-gray-300">Room not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-purple-500 rounded-full hover:bg-purple-600 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const isFull = room.players.length >= room.maxSeats;
  const isCountdown = room.status === 'COUNTDOWN';
  const isCompleted = room.status === 'COMPLETED';
  const canJoin = !hasJoined && !isFull && !isCountdown && !isCompleted && room.status === 'WAITING';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Back
          </button>
          <div className="text-center">
            <div className="text-sm text-gray-400">Room</div>
            <div className="font-mono text-lg">#{room.id}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-400">Prize Pool</div>
              <div className="text-2xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                ${(room.poolAmount / 100).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Seats */}
          <div className="lg:col-span-2">
            <SeatGrid
              players={room.players}
              maxSeats={room.maxSeats}
              isCompleted={isCompleted}
              winnerId={room.winnerId}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
              <h3 className="font-bold mb-4">Room Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-bold ${
                    isCompleted ? 'text-green-400' :
                    isCountdown ? 'text-yellow-400 animate-pulse' :
                    isFull ? 'text-blue-400' :
                    'text-purple-400'
                  }`}>
                    {room.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Players</span>
                  <span>{room.players.length} / {room.maxSeats}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Buy-in</span>
                  <span>${(room.buyInAmount / 100).toFixed(2)}</span>
                </div>
                {isCountdown && room.timerEndsAt && (
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-gray-400">Time Remaining</span>
                    <Timer endTime={new Date(room.timerEndsAt)} />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6">
              {!walletAddress ? (
                <button
                  onClick={connectWallet}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold hover:shadow-lg transition-all"
                >
                  Connect Wallet to Join
                </button>
              ) : hasJoined ? (
                <div className="text-center text-green-400">
                  ✅ You're in the room!
                  <p className="text-sm text-gray-400 mt-1">Good luck!</p>
                </div>
              ) : isCompleted ? (
                <div className="text-center text-gray-400">
                  🏁 Room completed
                </div>
              ) : canJoin ? (
                <button
                  onClick={handleJoinRoom}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
                >
                  🎯 Join Room (${(room.buyInAmount / 100).toFixed(2)})
                </button>
              ) : isFull ? (
                <button
                  disabled
                  className="w-full py-3 bg-gray-600/50 rounded-full font-bold text-gray-400 cursor-not-allowed"
                >
                  Room Full
                </button>
              ) : isCountdown ? (
                <button
                  disabled
                  className="w-full py-3 bg-yellow-500/20 rounded-full font-bold text-yellow-400 cursor-not-allowed animate-pulse"
                >
                  ⏳ Room Locked - Starting Soon
                </button>
              ) : null}
            </div>

            {/* Winner */}
            {isCompleted && room.winnerId && (
              <WinnerAnnouncement
                winner={room.players.find(p => p.id === room.winnerId)}
                poolAmount={room.poolAmount}
                isCurrentUser={room.players.find(p => p.id === room.winnerId)?.walletAddress === walletAddress}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
