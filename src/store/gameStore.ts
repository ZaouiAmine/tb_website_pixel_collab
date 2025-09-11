import { create } from 'zustand';
import type { Pixel, User, ChatMessage } from '../types/game';

// ===== Store Interface =====
interface GameStore {
  // Canvas state
  canvas: Pixel[][];
  setCanvas: (canvas: Pixel[][]) => void;
  updatePixel: (pixel: Pixel) => void;

  // User state
  users: User[];
  setUsers: (users: User[]) => void;
  updateUser: (user: User) => void;
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;

  // Chat state
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;

  // UI state
  activePanel: 'canvas' | 'chat' | 'users';
  setActivePanel: (panel: 'canvas' | 'chat' | 'users') => void;
  
  // Connection state
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
}

// ===== Store Implementation =====
export const useGameStore = create<GameStore>((set) => ({
  // Canvas state
  canvas: [],
  setCanvas: (canvas) => set({ canvas }),
  
  updatePixel: (pixel) => set((state) => {
    const newCanvas = state.canvas.map(row => [...row]);
    
    if (pixel.y >= 0 && pixel.y < newCanvas.length && 
        pixel.x >= 0 && pixel.x < newCanvas[pixel.y].length) {
      newCanvas[pixel.y][pixel.x] = pixel;
    }
    
    return { canvas: newCanvas };
  }),

  // User state
  users: [],
  setUsers: (users) => set({ users }),
  
  updateUser: (user) => set((state) => {
    const existingIndex = state.users.findIndex(u => u.id === user.id);
    if (existingIndex >= 0) {
      const newUsers = [...state.users];
      newUsers[existingIndex] = user;
      return { users: newUsers };
    } else {
      return { users: [...state.users, user] };
    }
  }),
  
  addUser: (user) => set((state) => {
    const exists = state.users.some(u => u.id === user.id);
    if (!exists) {
      return { users: [...state.users, user] };
    }
    return state;
  }),
  
  removeUser: (userId) => set((state) => ({
    users: state.users.filter(u => u.id !== userId)
  })),

  // Chat state
  messages: [],
  setMessages: (messages) => set({ messages }),
  
  addMessage: (message) => set((state) => {
    const exists = state.messages.some(m => m.id === message.id);
    if (!exists) {
      const newMessages = [...state.messages, message];
      // Keep only the latest 100 messages
      if (newMessages.length > 100) {
        newMessages.splice(0, newMessages.length - 100);
      }
      return { messages: newMessages };
    }
    return state;
  }),

  // UI state
  activePanel: 'canvas',
  setActivePanel: (panel) => set({ activePanel: panel }),

  // Connection state
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
}));