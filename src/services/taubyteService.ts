import type { ChatMessage, User, Pixel } from '../types/game';
import { useGameStore } from '../store/gameStore';

// ===== Configuration =====
const CONFIG = {
  BASE_URL: import.meta.env.VITE_TAUBYTE_URL || window.location.origin,
  API_ENDPOINTS: {
    GET_CANVAS: '/api/getCanvas',
    GET_USERS: '/api/getUsers',
    GET_MESSAGES: '/api/getMessages',
    INIT_CANVAS: '/api/initCanvas',
    RESET_CANVAS: '/api/resetCanvas'
  },
  WEBSOCKET_CHANNELS: {
    PIXEL_UPDATES: 'pixelupdates',
    USER_UPDATES: 'userupdates',
    CHAT_MESSAGES: 'chatmessages'
  },
  RECONNECT_DELAY: 2000,
  MAX_RETRIES: 5
};

// ===== Types =====
interface WebSocketChannel {
  ws: WebSocket | null;
  url: string;
  connected: boolean;
  reconnectAttempts: number;
}

// ===== TaubyteService Class =====
class TaubyteService {
  private gameStore = useGameStore.getState();
  private currentUser: User | null = null;
  private channels: Map<string, WebSocketChannel> = new Map();
  private isConnecting = false;
  private pixelQueue: Pixel[] = [];
  private pixelDebounceTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeChannels();
  }

  private initializeChannels() {
    Object.values(CONFIG.WEBSOCKET_CHANNELS).forEach(channelName => {
      this.channels.set(channelName, {
        ws: null,
        url: '',
        connected: false,
        reconnectAttempts: 0
      });
    });
  }

  // ===== Connection Management =====
  async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      console.log('🔌 Connecting to Taubyte WebSocket channels...');
      
      // Get WebSocket URLs for all channels
      await this.getWebSocketURLs();
      
      // Connect to all channels
      await this.connectToChannels();
      
      // Load initial state
      await this.loadInitialState();
      
      console.log('✅ Successfully connected to all channels');
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      throw error;
    } finally {
      this.isConnecting = false;
    }
  }

  private async getWebSocketURLs(): Promise<void> {
    const promises = Object.entries(CONFIG.WEBSOCKET_CHANNELS).map(async ([, channelName]) => {
      try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/getWebSocketURL?room=${channelName}`);
        if (!response.ok) {
          console.error(`❌ Failed to get WebSocket URL for ${channelName}: ${response.status}`);
          return; // Continue with other channels
        }
        
        const data = await response.json();
        const channel = this.channels.get(channelName);
        if (channel) {
          channel.url = data.websocket_url;
          console.log(`📡 Got WebSocket URL for ${channelName}:`, data.websocket_url);
        }
      } catch (error) {
        console.error(`❌ Error getting WebSocket URL for ${channelName}:`, error);
        // Continue with other channels instead of throwing
      }
    });

    await Promise.allSettled(promises);
  }

  private async connectToChannels(): Promise<void> {
    const promises = Object.entries(CONFIG.WEBSOCKET_CHANNELS).map(async ([, channelName]) => {
      const channel = this.channels.get(channelName);
      if (!channel || !channel.url) {
        console.warn(`⚠️ No WebSocket URL for channel ${channelName}, skipping`);
        return;
      }

      return new Promise<void>((resolve) => {
        console.log(`🔗 Connecting to ${channelName}...`);
        
        const ws = new WebSocket(channel.url);
        channel.ws = ws;

        ws.onopen = () => {
          console.log(`✅ Connected to ${channelName}`);
          channel.connected = true;
          channel.reconnectAttempts = 0;
          resolve();
        };

        ws.onmessage = (event) => {
          this.handleMessage(channelName, event.data);
        };

        ws.onclose = () => {
          console.log(`🔌 Disconnected from ${channelName}`);
          channel.connected = false;
          this.handleReconnect(channelName);
          resolve(); // Resolve even on close to not block other channels
        };

        ws.onerror = (error) => {
          console.error(`❌ WebSocket error for ${channelName}:`, error);
          resolve(); // Resolve even on error to not block other channels
        };
      });
    });

    await Promise.allSettled(promises);
  }

  private handleReconnect(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (!channel || channel.reconnectAttempts >= CONFIG.MAX_RETRIES) {
      console.error(`❌ Max reconnection attempts reached for ${channelName}`);
      return;
    }

    channel.reconnectAttempts++;
    console.log(`🔄 Reconnecting to ${channelName} (attempt ${channel.reconnectAttempts})...`);
    
    setTimeout(() => {
      this.connectToChannel(channelName);
    }, CONFIG.RECONNECT_DELAY);
  }

  private async connectToChannel(channelName: string): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel) return;

    try {
      const response = await fetch(`${CONFIG.BASE_URL}/api/getWebSocketURL?room=${channelName}`);
      const data = await response.json();
      channel.url = data.websocket_url;

      const ws = new WebSocket(channel.url);
      channel.ws = ws;

      ws.onopen = () => {
        console.log(`✅ Reconnected to ${channelName}`);
        channel.connected = true;
        channel.reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        this.handleMessage(channelName, event.data);
      };

      ws.onclose = () => {
        channel.connected = false;
        this.handleReconnect(channelName);
      };

      ws.onerror = (error) => {
        console.error(`❌ WebSocket error for ${channelName}:`, error);
        this.handleReconnect(channelName);
      };
    } catch (error) {
      console.error(`❌ Failed to reconnect to ${channelName}:`, error);
      this.handleReconnect(channelName);
    }
  }

  private handleMessage(channelName: string, data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (channelName) {
        case CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES:
          this.gameStore.updatePixel(message);
          break;
        case CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES:
          this.gameStore.updateUser(message);
          break;
        case CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES:
          this.gameStore.addMessage(message);
          break;
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${channelName}:`, error);
    }
  }

  // ===== Initial State Loading =====
  private async loadInitialState(): Promise<void> {
    try {
      console.log('📥 Loading initial state from server...');
      
      const [canvas, users, messages] = await Promise.all([
        this.getCanvas(),
        this.getUsers(),
        this.getMessages()
      ]);

      this.gameStore.setCanvas(canvas);
      this.gameStore.setUsers(users);
      this.gameStore.setMessages(messages);
      
      console.log('✅ Initial state loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load initial state:', error);
      throw error;
    }
  }

  // ===== API Methods =====
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async getCanvas(): Promise<Pixel[][]> {
    return this.makeRequest(CONFIG.API_ENDPOINTS.GET_CANVAS);
  }

  async getUsers(): Promise<User[]> {
    return this.makeRequest(CONFIG.API_ENDPOINTS.GET_USERS);
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.makeRequest(CONFIG.API_ENDPOINTS.GET_MESSAGES);
  }

  async initializeCanvas(): Promise<void> {
    await this.makeRequest(CONFIG.API_ENDPOINTS.INIT_CANVAS, { method: 'POST' });
  }

  async resetCanvas(): Promise<void> {
    await this.makeRequest(CONFIG.API_ENDPOINTS.RESET_CANVAS, { method: 'POST' });
  }

  // ===== User Management =====
  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // ===== Pixel Management =====
  placePixel(x: number, y: number, color: string): void {
    if (!this.currentUser) {
      console.warn('No current user set');
      return;
    }

    const pixel: Pixel = {
      x,
      y,
      color,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      timestamp: Date.now()
    };

    // Add to queue for debouncing
    this.pixelQueue.push(pixel);
    
    // Clear existing timeout
    if (this.pixelDebounceTimeout) {
      clearTimeout(this.pixelDebounceTimeout);
    }

    // Set new timeout
    this.pixelDebounceTimeout = setTimeout(() => {
      this.processPixelQueue();
    }, 50);
  }

  private processPixelQueue(): void {
    if (this.pixelQueue.length === 0) return;

    const pixels = [...this.pixelQueue];
    this.pixelQueue = [];

    pixels.forEach(pixel => {
      this.publishPixelUpdate(pixel);
    });
  }

  private publishPixelUpdate(pixel: Pixel): void {
    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify(pixel));
    }
  }

  // ===== User Updates =====
  updateUserStatus(isOnline: boolean): void {
    if (!this.currentUser) return;

    const updatedUser: User = {
      ...this.currentUser,
      isOnline,
      lastSeen: Date.now()
    };

    this.currentUser = updatedUser;
    this.gameStore.updateUser(updatedUser);
    this.publishUserUpdate(updatedUser);
  }

  private publishUserUpdate(user: User): void {
    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify(user));
    }
  }

  // ===== Chat Management =====
  sendMessage(message: string): void {
    if (!this.currentUser || !message.trim()) return;

    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      message: message.trim(),
      timestamp: Date.now()
    };

    this.publishChatMessage(chatMessage);
  }

  private publishChatMessage(message: ChatMessage): void {
    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify(message));
    }
  }

  // ===== Disconnection =====
  disconnect(): void {
    console.log('🔌 Disconnecting from all channels...');
    
    this.channels.forEach((channel, channelName) => {
      if (channel.ws) {
        console.log(`🔌 Closing ${channelName} connection`);
        channel.ws.close();
        channel.ws = null;
        channel.connected = false;
      }
    });

    if (this.pixelDebounceTimeout) {
      clearTimeout(this.pixelDebounceTimeout);
      this.pixelDebounceTimeout = null;
    }
  }
}

// ===== Export =====
export const taubyteService = new TaubyteService();
export default taubyteService;