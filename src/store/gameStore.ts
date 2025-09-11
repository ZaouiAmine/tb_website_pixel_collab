import { create } from 'zustand';
import type { Pixel, User, ChatMessage } from '../types/game';

// ===== CONSTANTS =====
const CANVAS_WIDTH = 100;
const CANVAS_HEIGHT = 100;

// ===== TYPES =====
interface GameStore {
  // State
  canvas: Pixel[][];
  users: User[];
  messages: ChatMessage[];
  currentUser: User | null;
  selectedColor: string;
  selectedTool: string;
  isConnected: boolean;
  canvasSize: { width: number; height: number };
  pixelSize: number;

  // Actions
  setCanvas: (canvas: Pixel[][]) => void;
  setUsers: (users: User[]) => void;
  setMessages: (messages: ChatMessage[]) => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedColor: (color: string) => void;
  setSelectedTool: (tool: string) => void;
  setConnected: (connected: boolean) => void;
  
  // Game actions
  updatePixel: (pixel: Pixel) => void;
  addMessage: (message: ChatMessage) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  clearCanvas: () => void;
  reset: () => void;
}

// ===== UTILITIES =====
const createEmptyCanvas = (): Pixel[][] => {
  const canvas: Pixel[][] = [];
  for (let y = 0; y < CANVAS_HEIGHT; y++) {
    const row: Pixel[] = [];
    for (let x = 0; x < CANVAS_WIDTH; x++) {
      row.push({
        x,
        y,
        color: '#ffffff',
        userId: '',
        username: '',
        timestamp: 0
      });
    }
    canvas.push(row);
  }
  return canvas;
};

// ===== STORE =====
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  canvas: createEmptyCanvas(),
  users: [],
  messages: [],
  currentUser: null,
  selectedColor: '#ff0000',
  selectedTool: 'pencil',
  isConnected: false,
  canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
  pixelSize: 8,

  // ===== SETTERS =====
  setCanvas: (canvas) => set({ canvas }),
  
  setUsers: (users) => set({ users }),
  
  setMessages: (messages) => set({ messages }),
  
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setSelectedColor: (color) => set({ selectedColor: color }),
  
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  
  setConnected: (connected) => set({ isConnected: connected }),

  // ===== GAME ACTIONS =====
  updatePixel: (pixel) => {
    const { canvas } = get();
    if (pixel.x >= 0 && pixel.x < CANVAS_WIDTH && pixel.y >= 0 && pixel.y < CANVAS_HEIGHT) {
      const newCanvas = canvas.map((row, y) => 
        row.map((p, x) => 
          (x === pixel.x && y === pixel.y) ? { ...pixel, timestamp: Date.now() } : p
        )
      );
      set({ canvas: newCanvas });
    }
  },

  addMessage: (message) => {
    const { messages } = get();
    set({ messages: [...messages, message] });
  },

  addUser: (user) => {
    const { users } = get();
    const existingIndex = users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      const newUsers = [...users];
      newUsers[existingIndex] = user;
      set({ users: newUsers });
    } else {
      set({ users: [...users, user] });
    }
  },

  removeUser: (userId) => {
    const { users } = get();
    set({ users: users.filter(u => u.id !== userId) });
  },

  clearCanvas: () => {
    set({ canvas: createEmptyCanvas() });
  },

  reset: () => {
    set({
      canvas: createEmptyCanvas(),
      users: [],
      messages: [],
      currentUser: null,
      selectedColor: '#ff0000',
      selectedTool: 'pencil',
      isConnected: false,
      canvasSize: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT },
      pixelSize: 8
    });
  }
}));