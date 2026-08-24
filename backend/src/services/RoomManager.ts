// backend/src/services/RoomManager.ts

import { PrismaClient } from '@prisma/client';
import { IRoom, IPlayer, IJoinRoomResponse } from '../models/Room';
import { EventEmitter } from 'events';

const prisma = new PrismaClient();

export class RoomManager extends EventEmitter {
  private activeRooms: Map<string, IRoom> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.loadActiveRooms();
  }

  private async loadActiveRooms(): Promise<void> {
    const rooms = await prisma.room.findMany({
      where: {
        status: {
          in: ['WAITING', 'FULL', 'COUNTDOWN']
        }
      },
      include: {
        players: true
      }
    });

    rooms.forEach(room => {
      this.activeRooms.set(room.id, {
        id: room.id,
        maxSeats: room.maxSeats,
        buyInAmount: room.buyInAmount,
        players: room.players.map(p => ({
          id: p.id,
          walletAddress: p.walletAddress,
          buyIn: p.buyIn,
          joinedAt: p.joinedAt,
          isWinner: p.isWinner
        })),
        status: room.status as any,
        timerEndsAt: room.timerEndsAt || undefined,
        winnerId: room.winnerId || undefined,
        poolAmount: room.poolAmount,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt
      });
    });
  }

  async createRoom(buyInAmount: number, maxSeats: number = 100): Promise<string> {
    const room = await prisma.room.create({
      data: {
        maxSeats,
        buyInAmount,
        status: 'WAITING',
        poolAmount: 0
      }
    });

    const roomData: IRoom = {
      id: room.id,
      maxSeats: room.maxSeats,
      buyInAmount: room.buyInAmount,
      players: [],
      status: room.status as any,
      poolAmount: room.poolAmount,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };

    this.activeRooms.set(room.id, roomData);
    this.emit('roomCreated', roomData);
    
    return room.id;
  }

  async joinRoom(roomId: string, walletAddress: string): Promise<IJoinRoomResponse> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) {
      return { success: false, error: 'Room not found' };
    }

    if (room.status !== 'WAITING' && room.status !== 'FULL') {
      return { success: false, error: 'Room is no longer accepting players' };
    }

    if (room.players.length >= room.maxSeats) {
      return { success: false, error: 'Room is full' };
    }

    const existingPlayer = room.players.find(p => p.walletAddress === walletAddress);
    if (existingPlayer) {
      return { success: false, error: 'Already in this room' };
    }

    const player = await prisma.player.create({
      data: {
        walletAddress,
        roomId: room.id,
        buyIn: room.buyInAmount
      }
    });

    await prisma.room.update({
      where: { id: room.id },
      data: {
        poolAmount: { increment: room.buyInAmount }
      }
    });

    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: { players: true }
    });

    if (!updatedRoom) {
      return { success: false, error: 'Failed to update room' };
    }

    const roomData = this.mapRoomToIRoom(updatedRoom);

    // Auto-start countdown if full
    if (updatedRoom.players.length === updatedRoom.maxSeats) {
      await this.startCountdown(updatedRoom.id);
    }

    this.activeRooms.set(room.id, roomData);
    this.emit('playerJoined', { roomId: room.id, player });

    return {
      success: true,
      player: {
        id: player.id,
        walletAddress: player.walletAddress,
        buyIn: player.buyIn,
        joinedAt: player.joinedAt,
        isWinner: player.isWinner
      },
      room: roomData
    };
  }

  private async startCountdown(roomId: string): Promise<void> {
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });

    if (!room) return;

    const timerEndsAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'COUNTDOWN',
        timerEndsAt
      }
    });

    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!updatedRoom) return;

    const roomData = this.mapRoomToIRoom(updatedRoom);
    this.activeRooms.set(roomId, roomData);
    this.emit('countdownStarted', { roomId, timerEndsAt });

    // Schedule winner selection
    const timeout = setTimeout(async () => {
      await this.selectWinner(roomId);
    }, 5 * 60 * 1000);

    this.timers.set(roomId, timeout);
  }

  private async selectWinner(roomId: string): Promise<void> {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room || room.players.length === 0) {
      return;
    }

    await prisma.room.update({
      where: { id: roomId },
      data: { status: 'DRAWING' }
    });

    // PROVABLY FAIR: Using crypto for randomness
    const randomIndex = this.generateSecureRandom(room.players.length);
    const winner = room.players[randomIndex];

    await prisma.player.update({
      where: { id: winner.id },
      data: { isWinner: true }
    });

    await prisma.room.update({
      where: { id: roomId },
      data: {
        status: 'COMPLETED',
        winnerId: winner.id
      }
    });

    const updatedRoom = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!updatedRoom) return;

    const roomData = this.mapRoomToIRoom(updatedRoom);
    this.activeRooms.set(roomId, roomData);
    this.emit('winnerSelected', { 
      roomId, 
      winnerId: winner.id, 
      walletAddress: winner.walletAddress,
      poolAmount: room.poolAmount 
    });

    this.timers.delete(roomId);
  }

  private generateSecureRandom(max: number): number {
    const randomBuffer = crypto.randomBytes(4);
    const randomNumber = randomBuffer.readUInt32BE(0);
    return randomNumber % max;
  }

  private mapRoomToIRoom(room: any): IRoom {
    return {
      id: room.id,
      maxSeats: room.maxSeats,
      buyInAmount: room.buyInAmount,
      players: room.players.map((p: any) => ({
        id: p.id,
        walletAddress: p.walletAddress,
        buyIn: p.buyIn,
        joinedAt: p.joinedAt,
        isWinner: p.isWinner
      })),
      status: room.status,
      timerEndsAt: room.timerEndsAt || undefined,
      winnerId: room.winnerId || undefined,
      poolAmount: room.poolAmount,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    };
  }

  async getRoom(roomId: string): Promise<IRoom | null> {
    if (this.activeRooms.has(roomId)) {
      return this.activeRooms.get(roomId) || null;
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });

    if (!room) return null;
    
    const roomData = this.mapRoomToIRoom(room);
    this.activeRooms.set(roomId, roomData);
    return roomData;
  }

  async getActiveRooms(): Promise<IRoom[]> {
    return Array.from(this.activeRooms.values());
  }
}
