// backend/src/models/Room.ts

export interface IPlayer {
  id: string;
  walletAddress: string;
  buyIn: number;
  joinedAt: Date;
  isWinner: boolean;
}

export interface IRoom {
  id: string;
  maxSeats: number;
  buyInAmount: number;
  players: IPlayer[];
  status: 'WAITING' | 'FULL' | 'COUNTDOWN' | 'DRAWING' | 'COMPLETED' | 'EXPIRED';
  timerEndsAt?: Date;
  winnerId?: string;
  poolAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IRoomCreateInput {
  maxSeats?: number;
  buyInAmount: number;
}

export interface IJoinRoomInput {
  roomId: string;
  walletAddress: string;
}

export interface IJoinRoomResponse {
  success: boolean;
  error?: string;
  player?: IPlayer;
  room?: IRoom;
}
