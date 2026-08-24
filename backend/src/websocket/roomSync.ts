// backend/src/websocket/roomSync.ts

import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { RoomManager } from '../services/RoomManager';

interface WebSocketClient extends WebSocket {
  roomId?: string;
  walletAddress?: string;
  isAlive: boolean;
}

export class RoomWebSocketServer {
  private wss: WebSocketServer;
  private roomManager: RoomManager;
  private clients: Map<string, Set<WebSocketClient>> = new Map();

  constructor(server: Server, roomManager: RoomManager) {
    this.wss = new WebSocketServer({ server });
    this.roomManager = roomManager;
    this.setupWebSocket();
    this.setupRoomEvents();
    this.setupHeartbeat();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocketClient) => {
      ws.isAlive = true;

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('pong', () => {
        ws.isAlive = true;
      });
    });
  }

  private handleMessage(ws: WebSocketClient, data: any): void {
    switch (data.type) {
      case 'JOIN_ROOM':
        this.handleJoinRoom(ws, data.roomId, data.walletAddress);
        break;
      case 'LEAVE_ROOM':
        this.handleLeaveRoom(ws);
        break;
      case 'GET_ROOM_STATE':
        this.handleGetRoomState(ws, data.roomId);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'ERROR',
          message: 'Unknown message type'
        }));
    }
  }

  private async handleJoinRoom(ws: WebSocketClient, roomId: string, walletAddress: string): Promise<void> {
    // Validate wallet address
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: 'Invalid wallet address'
      }));
      return;
    }

    // Check if already in a room
    if (ws.roomId) {
      this.removeFromRoom(ws);
    }

    // Join the room in backend
    const result = await this.roomManager.joinRoom(roomId, walletAddress);
    
    if (!result.success) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        message: result.error
      }));
      return;
    }

    ws.roomId = roomId;
    ws.walletAddress = walletAddress;

    // Add to room clients
    if (!this.clients.has(roomId)) {
      this.clients.set(roomId, new Set());
    }
    this.clients.get(roomId)?.add(ws);

    // Send current room state
    const room = await this.roomManager.getRoom(roomId);
    ws.send(JSON.stringify({
      type: 'ROOM_STATE',
      data: room
    }));

    // Broadcast to all clients in room
    this.broadcastToRoom(roomId, {
      type: 'PLAYER_JOINED',
      data: {
        player: result.player,
        totalPlayers: room?.players.length || 0
      }
    });
  }

  private handleLeaveRoom(ws: WebSocketClient): void {
    if (ws.roomId) {
      this.removeFromRoom(ws);
      ws.send(JSON.stringify({
        type: 'LEFT_ROOM',
        message: 'Successfully left room'
      }));
    }
  }

  private async handleGetRoomState(ws: WebSocketClient, roomId: string): Promise<void> {
    const room = await this.roomManager.getRoom(roomId);
    ws.send(JSON.stringify({
      type: 'ROOM_STATE',
      data: room
    }));
  }

  private removeFromRoom(ws: WebSocketClient): void {
    if (!ws.roomId) return;

    const roomClients = this.clients.get(ws.roomId);
    if (roomClients) {
      roomClients.delete(ws);
      if (roomClients.size === 0) {
        this.clients.delete(ws.roomId);
      }
    }

    // Notify other players
    this.broadcastToRoom(ws.roomId, {
      type: 'PLAYER_LEFT',
      data: {
        walletAddress: ws.walletAddress
      }
    });

    ws.roomId = undefined;
    ws.walletAddress = undefined;
  }

  private handleDisconnect(ws: WebSocketClient): void {
    this.removeFromRoom(ws);
  }

  private broadcastToRoom(roomId: string, message: any): void {
    const roomClients = this.clients.get(roomId);
    if (!roomClients) return;

    const payload = JSON.stringify(message);
    roomClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  private setupRoomEvents(): void {
    this.roomManager.on('playerJoined', (data: any) => {
      this.broadcastToRoom(data.roomId, {
        type: 'PLAYER_JOINED',
        data: data
      });
    });

    this.roomManager.on('countdownStarted', (data: any) => {
      this.broadcastToRoom(data.roomId, {
        type: 'COUNTDOWN_STARTED',
        data: {
          timerEndsAt: data.timerEndsAt
        }
      });
    });

    this.roomManager.on('winnerSelected', (data: any) => {
      this.broadcastToRoom(data.roomId, {
        type: 'WINNER_SELECTED',
        data: {
          winnerId: data.winnerId,
          walletAddress: data.walletAddress,
          poolAmount: data.poolAmount
        }
      });
    });

    this.roomManager.on('roomCreated', (data: any) => {
      // Could broadcast to global channel for lobby
      console.log('Room created:', data.id);
    });
  }

  private setupHeartbeat(): void {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }
}
