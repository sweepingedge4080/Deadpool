// backend/src/routes/rooms.ts

import express, { Request, Response, Router } from 'express';
import { RoomManager } from '../services/RoomManager';
import { z } from 'zod';

const router = Router();
const roomManager = new RoomManager();

// Validation schemas
const CreateRoomSchema = z.object({
  buyInAmount: z.number().int().min(10).max(100000), // 10 cents to $1000
  maxSeats: z.number().int().min(2).max(200).optional()
});

const JoinRoomSchema = z.object({
  roomId: z.string().min(1),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/)
});

// GET all active rooms
router.get('/active', async (req: Request, res: Response) => {
  try {
    const rooms = await roomManager.getActiveRooms();
    res.json({
      success: true,
      data: rooms.map(room => ({
        id: room.id,
        players: room.players.length,
        maxSeats: room.maxSeats,
        buyInAmount: room.buyInAmount,
        poolAmount: room.poolAmount,
        status: room.status,
        timerEndsAt: room.timerEndsAt
      }))
    });
  } catch (error) {
    console.error('Error fetching active rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active rooms'
    });
  }
});

// GET room by ID
router.get('/:roomId', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const room = await roomManager.getRoom(roomId);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room'
    });
  }
});

// POST create room
router.post('/create', async (req: Request, res: Response) => {
  try {
    const validation = CreateRoomSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.issues
      });
    }

    const { buyInAmount, maxSeats = 100 } = validation.data;
    
    const roomId = await roomManager.createRoom(buyInAmount, maxSeats);
    
    res.status(201).json({
      success: true,
      data: {
        roomId,
        joinUrl: `/room/${roomId}`
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
});

// POST join room
router.post('/join', async (req: Request, res: Response) => {
  try {
    const validation = JoinRoomSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: validation.error.issues
      });
    }

    const { roomId, walletAddress } = validation.data;
    
    const result = await roomManager.joinRoom(roomId, walletAddress);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join room'
    });
  }
});

export default router;
