import { create } from 'zustand';
import type { GameState, User, Pixel, Tool, ChatMessage } from '../types/game';

// ===== Constants =====
const DEFAULT_CANVAS_SIZE = { width: 100, height: 100 };
const DEFAULT_PIXEL_SIZE = 8;
const DEFAULT_MAX_PIXELS_PER_USER = 1000;
// const MAX_CHAT_MESSAGES = 100; // Reserved for future chat implementation

// ===== Types =====
interface GameStore extends GameState {
  // Actions
  setCurrentUser: (user: User | null) => void;
  setSelectedColor: (color: string) => void;
  setSelectedTool: (tool: Tool) => void;
  setConnected: (connected: boolean) => void;
  updatePixel: (x: number, y: number, color: string, userId: string) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearCanvas: () => void;
  initializeCanvas: (width: number, height: number) => void;
  setCanvasSize: (width: number, height: number) => void;
  setPixelSize: (size: number) => void;
  setMaxPixelsPerUser: (max: number) => void;
  setCanvas: (canvas: Pixel[][]) => void;
  reset: () => void;
}

// ===== Utility Functions =====
const createEmptyCanvas = (width: number, height: number): Pixel[][] => {
  const canvas: Pixel[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Pixel[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        x,
        y,
        color: '#ffffff',
        userId: '',
        timestamp: 0
      });
    }
    canvas.push(row);
  }
  return canvas;
};

// ===== Store Implementation =====
export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  canvas: createEmptyCanvas(DEFAULT_CANVAS_SIZE.width, DEFAULT_CANVAS_SIZE.height),
  users: [],
  messages: [],
  currentUser: null,
  selectedColor: '#ff0000',
  selectedTool: 'pencil',
  isConnected: false,
  canvasSize: DEFAULT_CANVAS_SIZE,
  pixelSize: DEFAULT_PIXEL_SIZE,
  maxPixelsPerUser: DEFAULT_MAX_PIXELS_PER_USER,

  // ===== User Management =====
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setSelectedColor: (color) => set({ selectedColor: color }),
  
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  
  setConnected: (connected) => set({ isConnected: connected }),

  // ===== Canvas Management =====
  updatePixel: (x, y, color, userId) => {
    const { canvas } = get();
    if (x >= 0 && x < canvas[0]?.length && y >= 0 && y < canvas.length) {
      // Create new canvas with updated pixel (immutable update)
      const newCanvas = canvas.map((row, rowIndex) => {
        if (rowIndex === y) {
          return row.map((pixel, colIndex) => {
            if (colIndex === x) {
              return { x, y, color, userId, timestamp: Date.now() };
            }
            return pixel;
          });
        }
        return row;
      });
      set({ canvas: newCanvas });
    }
  },

  setCanvas: (canvas) => set({ canvas }),

  clearCanvas: () => {
    const { canvasSize } = get();
    set({ canvas: createEmptyCanvas(canvasSize.width, canvasSize.height) });
  },

  initializeCanvas: (width, height) => {
    set({ 
      canvas: createEmptyCanvas(width, height),
      canvasSize: { width, height }
    });
  },

  setCanvasSize: (width, height) => {
    const { canvas } = get();
    const newCanvas = createEmptyCanvas(width, height);
    
    // Copy existing pixels that fit in the new size
    const maxY = Math.min(height, canvas.length);
    const maxX = Math.min(width, canvas[0]?.length || 0);
    
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < maxX; x++) {
        if (canvas[y]?.[x]?.userId) {
          newCanvas[y][x] = { ...canvas[y][x], x, y };
        }
      }
    }
    
    set({ 
      canvas: newCanvas,
      canvasSize: { width, height }
    });
  },

  // ===== User Management =====
  addUser: (user) => {
    const { users } = get();
    const existingUserIndex = users.findIndex(u => u.id === user.id);
    
    if (existingUserIndex >= 0) {
      // Update existing user
      const newUsers = [...users];
      newUsers[existingUserIndex] = user;
      set({ users: newUsers });
    } else {
      // Add new user
      set({ users: [...users, user] });
    }
  },
  
  removeUser: (userId) => {
    const { users } = get();
    set({ users: users.filter(u => u.id !== userId) });
  },
  
  updateUser: (userId, updates) => {
    const { users } = get();
    const newUsers = users.map(user => 
      user.id === userId ? { ...user, ...updates } : user
    );
    set({ users: newUsers });
  },

  // ===== Chat Management =====
  addChatMessage: (message) => {
    const { messages } = get();
    const newMessages = [...messages, message];
    
    // Limit to 100 messages
    if (newMessages.length > 100) {
      newMessages.shift(); // Remove oldest message
    }
    
    set({ messages: newMessages });
  },

  // ===== Settings Management =====
  setPixelSize: (size) => set({ pixelSize: size }),
  
  setMaxPixelsPerUser: (max) => set({ maxPixelsPerUser: max }),

  // ===== Reset =====
  reset: () => set({
    canvas: createEmptyCanvas(DEFAULT_CANVAS_SIZE.width, DEFAULT_CANVAS_SIZE.height),
    users: [],
    messages: [],
    currentUser: null,
    selectedColor: '#ff0000',
    selectedTool: 'pencil',
    isConnected: false,
    canvasSize: DEFAULT_CANVAS_SIZE,
    pixelSize: DEFAULT_PIXEL_SIZE,
    maxPixelsPerUser: DEFAULT_MAX_PIXELS_PER_USER,
  })
}));