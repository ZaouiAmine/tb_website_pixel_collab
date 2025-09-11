import type { ChatMessage, User, Pixel } from '../types/game';

// ===== CONFIG =====
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
  }
};

// ===== TYPES =====
interface WebSocketChannel {
  ws: WebSocket | null;
  url: string;
  connected: boolean;
  reconnectAttempts: number;
}

// ===== SERVICE CLASS =====
class TaubyteService {
  private channels: Map<string, WebSocketChannel> = new Map();
  private currentUser: User | null = null;
  private gameStore: any = null;
  private isConnecting = false;

  constructor() {
    this.initializeChannels();
  }

  private initializeChannels(): void {
    Object.values(CONFIG.WEBSOCKET_CHANNELS).forEach(channelName => {
      this.channels.set(channelName, {
        ws: null,
        url: '',
        connected: false,
        reconnectAttempts: 0
      });
    });
  }

  setGameStore(store: any): void {
    this.gameStore = store;
  }

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  // ===== CONNECTION MANAGEMENT =====
  async connect(): Promise<void> {
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      console.log('🔌 Connecting to Taubyte...');
      
      // Get WebSocket URLs
      await this.getWebSocketURLs();
      
      // Connect to channels
      await this.connectToChannels();
      
      // Load initial state
      await this.loadInitialState();
      
      console.log('✅ Connected successfully');
    } catch (error) {
      console.error('❌ Connection failed:', error);
    } finally {
      this.isConnecting = false;
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting...');
    this.channels.forEach((channel) => {
      if (channel.ws) {
        channel.ws.close();
        channel.ws = null;
        channel.connected = false;
      }
    });
  }

  private async getWebSocketURLs(): Promise<void> {
    const promises = Object.entries(CONFIG.WEBSOCKET_CHANNELS).map(async ([, channelName]) => {
      try {
        const response = await fetch(`${CONFIG.BASE_URL}/api/getWebSocketURL?room=${channelName}`);
        if (response.ok) {
          const data = await response.json();
          const channel = this.channels.get(channelName);
          if (channel) {
            channel.url = data.websocket_url;
            console.log(`📡 Got WebSocket URL for ${channelName}`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to get WebSocket URL for ${channelName}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  private async connectToChannels(): Promise<void> {
    const promises = Object.entries(CONFIG.WEBSOCKET_CHANNELS).map(async ([, channelName]) => {
      const channel = this.channels.get(channelName);
      if (!channel || !channel.url) return;

      return new Promise<void>((resolve) => {
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
          channel.connected = false;
          resolve();
        };

        ws.onerror = () => {
          resolve();
        };
      });
    });

    await Promise.allSettled(promises);
  }

  private handleMessage(channelName: string, data: string): void {
    try {
      const message = JSON.parse(data);
      
      switch (channelName) {
        case CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES:
          if (this.gameStore) {
            this.gameStore.getState().updatePixel(message);
          }
          break;
          
        case CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES:
          if (this.gameStore) {
            this.gameStore.getState().setUsers([message]);
          }
          break;
          
        case CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES:
          if (this.gameStore) {
            this.gameStore.getState().addMessage(message);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${channelName}:`, error);
    }
  }

  private async loadInitialState(): Promise<void> {
    try {
      console.log('📥 Loading initial state...');
      
      const [canvas, users, messages] = await Promise.all([
        this.getCanvas(),
        this.getUsers(),
        this.getMessages()
      ]);

      if (this.gameStore) {
        this.gameStore.getState().setCanvas(canvas);
        this.gameStore.getState().setUsers(users);
        this.gameStore.getState().setMessages(messages);
      }
      
      console.log('✅ Initial state loaded');
    } catch (error) {
      console.error('❌ Failed to load initial state:', error);
    }
  }

  // ===== API METHODS =====
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<unknown> {
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
    return this.makeRequest(CONFIG.API_ENDPOINTS.GET_CANVAS) as Promise<Pixel[][]>;
  }

  async getUsers(): Promise<User[]> {
    return this.makeRequest(CONFIG.API_ENDPOINTS.GET_USERS) as Promise<User[]>;
  }

  async getMessages(): Promise<ChatMessage[]> {
    return this.makeRequest(CONFIG.API_ENDPOINTS.GET_MESSAGES) as Promise<ChatMessage[]>;
  }

  async initializeCanvas(): Promise<void> {
    await this.makeRequest(CONFIG.API_ENDPOINTS.INIT_CANVAS, { method: 'POST' });
  }

  async resetCanvas(): Promise<void> {
    await this.makeRequest(CONFIG.API_ENDPOINTS.RESET_CANVAS, { method: 'POST' });
  }

  // ===== GAME ACTIONS =====
  placePixel(x: number, y: number, color: string): void {
    if (!this.currentUser) return;
    
    const pixel: Pixel = {
      x,
      y,
      color,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      timestamp: Date.now()
    };
    
    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify(pixel));
    }
  }

  joinGame(user: User): void {
    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify(user));
    }
  }

  leaveGame(userId: string): void {
    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify({ id: userId, online: false }));
    }
  }

  sendMessage(message: string): void {
    if (!this.currentUser || !message.trim()) return;

    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      userId: this.currentUser.id,
      username: this.currentUser.username,
      message: message.trim(),
      timestamp: Date.now()
    };

    const channel = this.channels.get(CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES);
    if (channel && channel.connected && channel.ws) {
      channel.ws.send(JSON.stringify(chatMessage));
    }
  }
}

// ===== EXPORT =====
export const taubyteService = new TaubyteService();
export default taubyteService;