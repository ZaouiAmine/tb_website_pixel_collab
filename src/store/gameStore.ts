import { create } from 'zustand';
import type { GameState, User, Pixel, Tool, ChatMessage } from '../types/game';

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
  setCooldownTime: (time: number) => void;
  setMaxPixelsPerUser: (max: number) => void;
  setCanvas: (canvas: Pixel[][]) => void;
  reset: () => void;
}

const defaultCanvasSize = { width: 100, height: 100 };
const defaultPixelSize = 8;
const defaultCooldownTime = 1000; // 1 second
const defaultMaxPixelsPerUser = 1000;

const createEmptyCanvas = (width: number, height: number): Pixel[][] => {
  return Array(height).fill(null).map(() => 
    Array(width).fill(null).map(() => ({
      x: 0,
      y: 0,
      color: '#ffffff',
      userId: '',
      timestamp: 0
    }))
  );
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  canvas: createEmptyCanvas(defaultCanvasSize.width, defaultCanvasSize.height),
  users: [],
  currentUser: null,
  selectedColor: '#ff0000',
  selectedTool: 'pencil',
  isConnected: false,
  canvasSize: defaultCanvasSize,
  pixelSize: defaultPixelSize,
  cooldownTime: defaultCooldownTime,
  maxPixelsPerUser: defaultMaxPixelsPerUser,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  
  setSelectedColor: (color) => set({ selectedColor: color }),
  
  setSelectedTool: (tool) => set({ selectedTool: tool }),
  
  setConnected: (connected) => set({ isConnected: connected }),
  
  updatePixel: (x, y, color, userId) => {
    const { canvas } = get();
    if (x >= 0 && x < canvas[0].length && y >= 0 && y < canvas.length) {
      // Use Immer-like immutable update for better performance
      const newCanvas = canvas.map((row, rowIndex) => 
        rowIndex === y 
          ? row.map((pixel, colIndex) => 
              colIndex === x 
                ? { x, y, color, userId, timestamp: Date.now() }
                : pixel
            )
          : row
      );
      set({ canvas: newCanvas });
    }
  },
  
  addUser: (user) => {
    const { users } = get();
    const existingUserIndex = users.findIndex(u => u.id === user.id);
    if (existingUserIndex >= 0) {
      const newUsers = [...users];
      newUsers[existingUserIndex] = user;
      set({ users: newUsers });
    } else {
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
  
  addChatMessage: (message) => {
    // This would be handled by a separate chat store in a real implementation
    // For now, we'll just log it
    console.log('Chat message:', message);
  },
  
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
    for (let y = 0; y < Math.min(height, canvas.length); y++) {
      for (let x = 0; x < Math.min(width, canvas[y].length); x++) {
        if (canvas[y][x].userId) {
          newCanvas[y][x] = { ...canvas[y][x], x, y };
        }
      }
    }
    
    set({ 
      canvas: newCanvas,
      canvasSize: { width, height }
    });
  },
  
  setPixelSize: (size) => set({ pixelSize: size }),
  
  setCooldownTime: (time) => set({ cooldownTime: time }),
  
  setMaxPixelsPerUser: (max) => set({ maxPixelsPerUser: max }),
  
  setCanvas: (canvas) => set({ canvas }),
  
  reset: () => set({
    canvas: createEmptyCanvas(defaultCanvasSize.width, defaultCanvasSize.height),
    users: [],
    currentUser: null,
    selectedColor: '#ff0000',
    selectedTool: 'pencil',
    isConnected: false,
    canvasSize: defaultCanvasSize,
    pixelSize: defaultPixelSize,
    cooldownTime: defaultCooldownTime,
    maxPixelsPerUser: defaultMaxPixelsPerUser,
  })
}));
