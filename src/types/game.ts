export interface Pixel {
  x: number;
  y: number;
  color: string;
  userId: string;
  timestamp: number;
}

export interface User {
  id: string;
  username: string;
  color: string;
  isOnline: boolean;
  lastSeen: number;
  pixelsPlaced: number;
}

export interface GameState {
  canvas: Pixel[][];
  users: User[];
  currentUser: User | null;
  selectedColor: string;
  selectedTool: Tool;
  isConnected: boolean;
  canvasSize: { width: number; height: number };
  pixelSize: number;
  maxPixelsPerUser: number;
}

export type Tool = 'pencil' | 'eraser' | 'eyedropper' | 'bucket';

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  type: 'user' | 'system';
}

export interface GameSettings {
  canvasWidth: number;
  canvasHeight: number;
  pixelSize: number;
  maxPixelsPerUser: number;
  maxUsers: number;
}

export interface PixelUpdate {
  x: number;
  y: number;
  color: string;
  userId: string;
  timestamp: number;
}

export interface UserJoin {
  user: User;
  timestamp: number;
}

export interface UserLeave {
  userId: string;
  timestamp: number;
}
