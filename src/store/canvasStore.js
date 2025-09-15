import { create } from 'zustand'
import { apiService } from '../services/api.js'

const CANVAS_SIZE = 32
const PIXEL_SIZE = 20

// Generate unique user ID for this session
const generateUserId = () => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useCanvasStore = create((set, get) => ({
  // Canvas dimensions
  canvasSize: CANVAS_SIZE,
  pixelSize: PIXEL_SIZE,
  
  // Pixel data - 2D array representing colors
  pixels: Array(CANVAS_SIZE).fill(null).map(() => 
    Array(CANVAS_SIZE).fill('#ffffff')
  ),
  
  // Current drawing color
  currentColor: '#000000',
  
  // Drawing state
  isDrawing: false,
  
  // User management
  currentUser: {
    id: generateUserId(),
    username: `User${Math.floor(Math.random() * 1000)}`,
    color: '#000000',
    online: false
  },
  
  // Online users
  onlineUsers: [],
  
  // Chat messages
  chatMessages: [],
  
  // Connection state
  isConnected: false,
  isLoading: false,
  error: null,
  
  // Actions
  setPixel: async (x, y, color) => {
    const { pixels, currentUser } = get()
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      // Update local state immediately for responsiveness
      const newPixels = [...pixels]
      newPixels[y] = [...newPixels[y]]
      newPixels[y][x] = color
      set({ pixels: newPixels })
      
      // Send to backend
      try {
        await apiService.placePixel({
          x,
          y,
          color,
          userId: currentUser.id,
          username: currentUser.username
        })
      } catch (error) {
        console.error('Failed to place pixel:', error)
        set({ error: 'Failed to place pixel' })
      }
    }
  },
  
  setCurrentColor: (color) => set({ currentColor: color }),
  
  setIsDrawing: (isDrawing) => set({ isDrawing }),
  
  clearCanvas: async () => {
    set({ isLoading: true })
    try {
      await apiService.initCanvas()
      // Clear local state
      set({ 
        pixels: Array(CANVAS_SIZE).fill(null).map(() => 
          Array(CANVAS_SIZE).fill('#ffffff')
        ),
        isLoading: false 
      })
    } catch (error) {
      console.error('Failed to clear canvas:', error)
      set({ error: 'Failed to clear canvas', isLoading: false })
    }
  },
  
  // Backend integration
  loadCanvas: async () => {
    set({ isLoading: true })
    try {
      const canvasData = await apiService.getCanvas()
      set({ pixels: canvasData, isLoading: false })
    } catch (error) {
      console.error('Failed to load canvas:', error)
      set({ error: 'Failed to load canvas', isLoading: false })
    }
  },
  
  loadPixels: (pixelData) => set({ pixels: pixelData }),
  
  // User management
  joinGame: async (username, color) => {
    const { currentUser } = get()
    const userData = {
      ...currentUser,
      username: username || currentUser.username,
      color: color || currentUser.color,
      online: true
    }
    
    set({ currentUser: userData, isLoading: true })
    
    try {
      await apiService.joinGame(userData)
      set({ isLoading: false })
    } catch (error) {
      console.error('Failed to join game:', error)
      set({ error: 'Failed to join game', isLoading: false })
    }
  },
  
  leaveGame: async () => {
    const { currentUser } = get()
    try {
      await apiService.leaveGame(currentUser.id)
      set({ 
        currentUser: { ...currentUser, online: false },
        isConnected: false 
      })
    } catch (error) {
      console.error('Failed to leave game:', error)
    }
  },
  
  loadUsers: async () => {
    try {
      const users = await apiService.getUsers()
      set({ onlineUsers: users })
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  },
  
  // Chat functionality
  loadMessages: async () => {
    try {
      const messages = await apiService.getMessages()
      set({ chatMessages: messages })
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  },
  
  sendMessage: async (message) => {
    const { currentUser } = get()
    const messageData = {
      userId: currentUser.id,
      username: currentUser.username,
      message: message
    }
    
    try {
      await apiService.sendMessage(messageData)
      // Message will be added via WebSocket
    } catch (error) {
      console.error('Failed to send message:', error)
      set({ error: 'Failed to send message' })
    }
  },
  
  addChatMessage: (message) => {
    const { chatMessages } = get()
    set({ chatMessages: [...chatMessages, message] })
  },
  
  // WebSocket handlers
  handlePixelUpdate: (pixelData) => {
    const { pixels } = get()
    if (pixelData.x >= 0 && pixelData.x < CANVAS_SIZE && 
        pixelData.y >= 0 && pixelData.y < CANVAS_SIZE) {
      const newPixels = [...pixels]
      newPixels[pixelData.y] = [...newPixels[pixelData.y]]
      newPixels[pixelData.y][pixelData.x] = pixelData.color
      set({ pixels: newPixels })
    }
  },
  
  handleUserUpdate: (userData) => {
    const { onlineUsers } = get()
    const updatedUsers = onlineUsers.filter(u => u.id !== userData.id)
    if (userData.online) {
      updatedUsers.push(userData)
    }
    set({ onlineUsers: updatedUsers })
  },
  
  handleChatMessage: (message) => {
    const { chatMessages } = get()
    set({ chatMessages: [...chatMessages, message] })
  },
  
  handleCanvasUpdate: (updateData) => {
    if (updateData.action === 'clear') {
      set({ 
        pixels: Array(CANVAS_SIZE).fill(null).map(() => 
          Array(CANVAS_SIZE).fill('#ffffff')
        )
      })
    }
  },
  
  // Connection management
  setConnected: (connected) => set({ isConnected: connected }),
  
  clearError: () => set({ error: null }),
  
  // Get pixel color at position
  getPixelColor: (x, y) => {
    const { pixels } = get()
    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      return pixels[y][x]
    }
    return '#ffffff'
  }
}))
