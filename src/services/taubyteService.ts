import type { ChatMessage, User } from '../types/game';
import { useGameStore } from '../store/gameStore';

// ===== Constants =====
const CONFIG = {
  BASE_URL: import.meta.env.VITE_TAUBYTE_URL || window.location.origin,
  API_ENDPOINTS: {
    GET_CANVAS: '/api/getCanvas',
    GET_USERS: '/api/getUsers',
    GET_MESSAGES: '/api/getMessages',
    INIT_CANVAS: '/api/initCanvas'
  },
  WEBSOCKET_CHANNELS: {
    PIXEL_UPDATES: 'pixelupdates',
    USER_UPDATES: 'userupdates',
    CHAT_MESSAGES: 'chatmessages'
  },
  POLLING_INTERVAL: 2000, // Fallback polling for canvas/users/messages
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  CACHE_DURATION: 5000, // 5 seconds cache for canvas data
  MAX_MESSAGES_CACHE: 100,
  WEBSOCKET_RECONNECT_DELAY: 3000
};

// ===== Types =====
type EventType = 'pixelUpdate' | 'userJoin' | 'userLeave' | 'chatMessage' | 'connect' | 'disconnect' | 'error' | 'canvasUpdate' | 'userUpdate';
type ConnectionMode = 'websocket' | 'polling';

interface CachedData {
  canvas: any;
  users: User[];
  messages: ChatMessage[];
  lastUpdate: number;
}

// ===== TaubyteService Class =====
class TaubyteService {
  private gameStore = useGameStore.getState();
  private currentUser: User | null = null;
  private isConnected = false;
  private connectionMode: ConnectionMode = 'websocket';
  
  // Connection management
  private pollingInterval: NodeJS.Timeout | null = null;
  private websockets: Map<string, WebSocket> = new Map();
  
  // Event system
  private eventListeners: Map<EventType, Function[]> = new Map();
  
  // Caching system
  private cache: CachedData = {
    canvas: null,
    users: [],
    messages: [],
    lastUpdate: 0
  };
  
  
  // Rate limiting for pixel placement
  private lastPixelTime = 0;
  private pixelCooldown = 2000; // 2 seconds between pixels

  constructor() {
    this.setupEventListeners();
  }

  // ===== Event System =====
  private setupEventListeners(): void {
    // Initialize event listener arrays
    const eventTypes: EventType[] = ['pixelUpdate', 'userJoin', 'userLeave', 'chatMessage', 'connect', 'disconnect', 'error', 'canvasUpdate', 'userUpdate'];
    eventTypes.forEach(type => {
      this.eventListeners.set(type, []);
    });
  }

  on(event: EventType, callback: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: EventType, callback: Function): void {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    this.eventListeners.set(event, listeners);
  }

  private emit(event: EventType, data?: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in event listener for ${event}:`, error);
      }
    });
  }



  // ===== Connection Management =====
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Connect to all WebSocket channels
      await this.connectWebSockets();
      
      // Start fallback polling for canvas/users/messages
      this.startPolling();
      
      this.isConnected = true;
      this.emit('connect');
      this.gameStore.setConnected(true);
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  private async connectWebSockets(): Promise<void> {
    const baseUrl = CONFIG.BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    
    // Get proper WebSocket URLs from backend for each channel
    const pixelUpdatesUrl = await this.getWebSocketURL(CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES);
    const userUpdatesUrl = await this.getWebSocketURL(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES);
    const chatMessagesUrl = await this.getWebSocketURL(CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES);
    
    // Connect to pixel updates channel
    await this.connectWebSocketChannel(
      CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES,
      `${baseUrl}/${pixelUpdatesUrl}`,
      this.handlePixelUpdate.bind(this)
    );

    // Connect to user updates channel
    await this.connectWebSocketChannel(
      CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES,
      `${baseUrl}/${userUpdatesUrl}`,
      this.handleUserUpdate.bind(this)
    );

    // Connect to chat messages channel
    await this.connectWebSocketChannel(
      CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES,
      `${baseUrl}/${chatMessagesUrl}`,
      this.handleChatMessage.bind(this)
    );
  }

  private async getWebSocketURL(room: string): Promise<string> {
    try {
      const response = await this.makeRequest(`/api/getWebSocketURL?room=${room}`);
      const data = await response.json();
      return data.websocket_url;
    } catch (error) {
      console.error(`Error getting WebSocket URL for ${room}:`, error);
      throw error;
    }
  }

  private async connectWebSocketChannel(
    channelName: string, 
    url: string, 
    messageHandler: (data: any) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          console.log(`Connected to ${channelName} channel`);
          this.websockets.set(channelName, ws);
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            messageHandler(data);
          } catch (error) {
            console.error(`Error parsing message from ${channelName}:`, error);
          }
        };

        ws.onclose = () => {
          console.log(`Disconnected from ${channelName} channel`);
          this.websockets.delete(channelName);
          // Attempt to reconnect after delay
          setTimeout(() => {
            if (this.isConnected) {
              this.connectWebSocketChannel(channelName, url, messageHandler);
            }
          }, CONFIG.WEBSOCKET_RECONNECT_DELAY);
        };

        ws.onerror = (error) => {
          console.error(`WebSocket error for ${channelName}:`, error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.isConnected = false;
    this.stopPolling();
    this.disconnectWebSockets();
    this.emit('disconnect');
    this.gameStore.setConnected(false);
  }

  private disconnectWebSockets(): void {
    this.websockets.forEach((ws, channelName) => {
      console.log(`Disconnecting from ${channelName} channel`);
      ws.close();
    });
    this.websockets.clear();
  }

  // ===== WebSocket Message Handlers =====
  private handlePixelUpdate(pixel: any): void {
    console.log('Received pixel update:', pixel);
    this.gameStore.updatePixel(pixel.X, pixel.Y, pixel.Color, pixel.UserID);
    this.emit('pixelUpdate', {
      x: pixel.X,
      y: pixel.Y,
      color: pixel.Color,
      userId: pixel.UserID,
      timestamp: pixel.Timestamp
    });
  }

  private handleUserUpdate(user: any): void {
    console.log('Received user update:', user);
    if (user.IsOnline) {
      this.gameStore.addUser(user);
      this.emit('userJoin', user);
    } else {
      this.gameStore.removeUser(user.ID);
      this.emit('userLeave', user);
    }
  }

  private handleChatMessage(message: any): void {
    console.log('Received chat message:', message);
    this.gameStore.addChatMessage(message);
    this.emit('chatMessage', message);
  }

  // ===== WebSocket Publishing =====
  private async publishToChannel(channelName: string, data: any): Promise<void> {
    const ws = this.websockets.get(channelName);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`WebSocket channel ${channelName} is not connected`);
    }

    try {
      ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`Error publishing to ${channelName}:`, error);
      throw error;
    }
  }

  // ===== Polling System =====
  private startPolling(): void {
    this.stopPolling();
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollCanvas();
        await this.pollUsers();
        await this.pollMessages();
      } catch (error) {
        console.error('Polling error:', error);
        this.emit('error', error);
      }
    }, CONFIG.POLLING_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // ===== Game Actions =====
  async placePixel(x: number, y: number, color: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    // Check cooldown to prevent spam
    const now = Date.now();
    const timeSinceLastPixel = now - this.lastPixelTime;
    
    if (timeSinceLastPixel < this.pixelCooldown) {
      const waitTime = this.pixelCooldown - timeSinceLastPixel;
      console.log(`Rate limiting: waiting ${waitTime}ms before next pixel`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      // Publish directly to WebSocket channel
      await this.publishToChannel(CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES, {
        X: x,
        Y: y,
        Color: color,
        UserID: this.currentUser.id,
        Timestamp: Date.now()
      });
      
      // Update local state immediately for responsive UI
      this.gameStore.updatePixel(x, y, color, this.currentUser.id);
      
      this.emit('pixelUpdate', {
        x, y, color, userId: this.currentUser.id, timestamp: Date.now()
      });
      
      // Update last pixel time
      this.lastPixelTime = Date.now();
      
    } catch (error) {
      console.error('Error placing pixel:', error);
      throw error;
    }
  }

  async joinGame(username: string, userId: string): Promise<User> {
    try {
      // Create user object
      const user: User = {
        id: userId,
        username: username,
        color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
        isOnline: true,
        lastSeen: Date.now(),
        pixelsPlaced: 0
      };

      // Connect to WebSocket channels first
      await this.connect();

      // Publish directly to WebSocket channel
      await this.publishToChannel(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES, {
        ID: user.id,
        Username: user.username,
        Color: user.color,
        IsOnline: user.isOnline,
        LastSeen: user.lastSeen,
        PixelsPlaced: user.pixelsPlaced
      });

      this.currentUser = user;
      this.gameStore.setCurrentUser(user);
      return user;
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  }

  async restoreUserAuthentication(user: User): Promise<User> {
    try {
      this.currentUser = user;
      this.gameStore.setCurrentUser(user);
      await this.connect();
      return user;
    } catch (error) {
      console.error('Error restoring user authentication:', error);
      throw error;
    }
  }

  async leaveGame(): Promise<void> {
    if (this.currentUser) {
      // Publish user offline status
      await this.publishToChannel(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES, {
        ID: this.currentUser.id,
        Username: this.currentUser.username,
        Color: this.currentUser.color,
        IsOnline: false,
        LastSeen: Date.now(),
        PixelsPlaced: this.currentUser.pixelsPlaced
      });
      
      this.disconnect();
      this.currentUser = null;
    }
  }

  async sendChatMessage(message: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    // Create chat message object
    const chatMessage = {
      ID: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      UserID: this.currentUser.id,
      Username: this.currentUser.username,
      Message: message,
      Timestamp: Date.now(),
      Type: "user"
    };

    // Publish directly to WebSocket channel
    await this.publishToChannel(CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES, chatMessage);
  }

  // ===== Data Fetching (HTTP fallback) =====
  async initializeCanvas(): Promise<void> {
    try {
      await this.makeRequest(CONFIG.API_ENDPOINTS.INIT_CANVAS, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error initializing canvas:', error);
      throw error;
    }
  }

  async getCanvas(): Promise<any> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_CANVAS);
      return await response.json();
    } catch (error) {
      console.error('Error fetching canvas:', error);
      throw error;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_USERS);
      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getMessages(): Promise<ChatMessage[]> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_MESSAGES);
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  // ===== Polling Methods =====
  private async pollCanvas(): Promise<void> {
    try {
      const canvas = await this.getCanvas();
      if (canvas) {
        this.cache.canvas = canvas;
        this.cache.lastUpdate = Date.now();
        this.emit('canvasUpdate', canvas);
      }
    } catch (error) {
      console.error('Error polling canvas:', error);
    }
  }

  private async pollUsers(): Promise<void> {
    try {
      const users = await this.getUsers();
      if (users) {
        this.cache.users = users;
        this.emit('userUpdate', users);
      }
    } catch (error) {
      console.error('Error polling users:', error);
    }
  }

  private async pollMessages(): Promise<void> {
    try {
      const messages = await this.getMessages();
      if (messages) {
        this.cache.messages = messages;
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }

  // ===== HTTP Request Helper =====
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.currentUser) {
      (headers as any)['X-User-ID'] = this.currentUser.id;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  // ===== Utility Methods =====
  getPixelCooldownStatus(): { 
    timeUntilNextPixel: number; 
    cooldown: number; 
    canPlacePixel: boolean 
  } {
    const now = Date.now();
    const timeSinceLastPixel = now - this.lastPixelTime;
    const timeUntilNextPixel = Math.max(0, this.pixelCooldown - timeSinceLastPixel);
    
    return {
      timeUntilNextPixel,
      cooldown: this.pixelCooldown,
      canPlacePixel: timeUntilNextPixel === 0
    };
  }

  getConnectionStatus(): {
    isConnected: boolean;
    connectionMode: ConnectionMode;
    websocketChannels: string[];
  } {
    return {
      isConnected: this.isConnected,
      connectionMode: this.connectionMode,
      websocketChannels: Array.from(this.websockets.keys())
    };
  }
}

// ===== Singleton Instance =====
export const taubyteService = new TaubyteService();
export default taubyteService;