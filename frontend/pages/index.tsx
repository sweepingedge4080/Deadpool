// frontend/pages/index.tsx

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '../hooks/useWallet';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { RoomCard } from '../components/RoomCard';

interface Room {
  id: string;
  players: number;
  maxSeats: number;
  buyInAmount: number;
  poolAmount: number;
  status: string;
  timerEndsAt?: Date;
}

export default function Home() {
  const router = useRouter();
  const { walletAddress, connectWallet } = useWallet();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveRooms();
    const interval = setInterval(fetchActiveRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchActiveRooms = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rooms/active');
      const data = await response.json();
      if (data.success) {
        setRooms(data.data);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = () => {
    if (!walletAddress) {
      connectWallet();
      return;
    }
    setShowCreateModal(true);
  };

  const handleJoinRoom = (roomId: string) => {
    if (!walletAddress) {
      connectWallet();
      return;
    }
    router.push(`/room/${roomId}`);
  };

  return (
    <>
      <Head>
        <title>Pool Party - Anonymous Crypto Lottery</title>
        <meta name="description" content="Fast, anonymous crypto lottery with real odds" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900">
        {/* Header */}
        <header className="border-b border-purple-500/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                🎰 POOL PARTY
              </span>
              <span className="text-xs text-purple-400 font-mono">BETA</span>
            </div>
            
            <button
              onClick={walletAddress ? undefined : connectWallet}
              className={`px-6 py-2 rounded-full font-bold transition-all ${
                walletAddress
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50'
              }`}
            >
              {walletAddress 
                ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` 
                : 'Connect Wallet'}
            </button>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
              Real Odds. Real Wins.
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Put 10¢ to $1000 in a room with ~100 players. Timer starts. One winner takes it all.
            <span className="block text-sm text-purple-400 mt-2">⚡ Results in 5 minutes ⚡</span>
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={handleCreateRoom}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-purple-500/50 transition-all transform hover:scale-105"
            >
              🚀 Create Room
            </button>
            {walletAddress && (
              <button
                onClick={() => router.push('/my-rooms')}
                className="px-8 py-4 border border-purple-500 rounded-full font-bold text-lg hover:bg-purple-500/20 transition-all"
              >
                My Rooms
              </button>
            )}
          </div>
        </section>

        {/* Active Rooms */}
        <section className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <span>🔥 Active Rooms</span>
            <span className="text-sm text-gray-400 font-normal">
              ({rooms.length} open)
            </span>
          </h2>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white/5 rounded-xl h-48" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-4">🤷</p>
              <p>No active rooms yet</p>
              <p className="text-sm">Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={() => handleJoinRoom(room.id)}
                  isWalletConnected={!!walletAddress}
                />
              ))}
            </div>
          )}
        </section>

        {/* Create Room Modal */}
        {showCreateModal && (
          <CreateRoomModal
            onClose={() => setShowCreateModal(false)}
            onCreated={(roomId) => {
              setShowCreateModal(false);
              router.push(`/room/${roomId}`);
            }}
            walletAddress={walletAddress}
          />
        )}
      </div>
    </>
  );
}
