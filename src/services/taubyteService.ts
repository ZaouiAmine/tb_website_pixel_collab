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
  POLLING_INTERVAL: 5000, // Reduced polling for fallback only
  MAX_RETRIES: 5,
  RETRY_DELAY: 1000,
  WEBSOCKET_RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  PIXEL_COOLDOWN: 100, // Reduced to 100ms for better UX
  MAX_PIXEL_QUEUE: 10
};

// ===== Types =====
type EventType = 'pixelUpdate' | 'userJoin' | 'userLeave' | 'chatMessage' | 'connect' | 'disconnect' | 'error' | 'canvasUpdate' | 'userUpdate';
type ConnectionMode = 'websocket' | 'polling';

interface WebSocketChannel {
  ws: WebSocket | null;
  url: string;
  connected: boolean;
  reconnectAttempts: number;
  lastHeartbeat: number;
}

interface PixelQueueItem {
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

// ===== TaubyteService Class =====
class TaubyteService {
  private gameStore = useGameStore.getState();
  private currentUser: User | null = null;
  private isConnected = false;
  private connectionMode: ConnectionMode = 'websocket';
  
  // WebSocket management
  private channels: Map<string, WebSocketChannel> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Event system
  private eventListeners: Map<EventType, Function[]> = new Map();
  
  // Rate limiting and queuing
  private lastPixelTime = 0;
  private pixelQueue: PixelQueueItem[] = [];
  private isProcessingPixelQueue = false;
  
  // Connection state
  private isReconnecting = false;

  constructor() {
    this.setupEventListeners();
    this.initializeChannels();
  }

  // ===== Event System =====
  private setupEventListeners(): void {
    const eventTypes: EventType[] = [
      'pixelUpdate', 'userJoin', 'userLeave', 'chatMessage', 
      'connect', 'disconnect', 'error', 'canvasUpdate', 'userUpdate'
    ];
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

  // ===== Channel Management =====
  private initializeChannels(): void {
    Object.values(CONFIG.WEBSOCKET_CHANNELS).forEach(channelName => {
      this.channels.set(channelName, {
        ws: null,
        url: '',
        connected: false,
        reconnectAttempts: 0,
        lastHeartbeat: 0
      });
    });
  }

  // ===== Connection Management =====
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('🔌 Connecting to Taubyte WebSocket channels...');
      
      // Get WebSocket URLs for all channels
      await this.getWebSocketURLs();
      
      // Connect to all channels
      await this.connectAllChannels();
      
      // Start heartbeat monitoring
      this.startHeartbeat();
      
      // Start fallback polling
      this.startPolling();
      
      this.isConnected = true;
      this.emit('connect');
      this.gameStore.setConnected(true);
      
      console.log('✅ Connected to all Taubyte channels');
    } catch (error) {
      console.error('❌ Failed to connect:', error);
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  private async getWebSocketURLs(): Promise<void> {
    const baseUrl = CONFIG.BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    
    for (const [channelName, channel] of this.channels) {
      try {
        const response = await this.makeRequest(`/api/getWebSocketURL?room=${channelName}`);
        const data = await response.json();
        channel.url = `${baseUrl}/${data.websocket_url}`;
        console.log(`📡 Got WebSocket URL for ${channelName}:`, channel.url);
      } catch (error) {
        console.error(`Failed to get WebSocket URL for ${channelName}:`, error);
        throw error;
      }
    }
  }

  private async connectAllChannels(): Promise<void> {
    const connectionPromises = Array.from(this.channels.entries()).map(([channelName, channel]) =>
      this.connectChannel(channelName, channel)
    );
    
    await Promise.all(connectionPromises);
  }

  private async connectChannel(channelName: string, channel: WebSocketChannel): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`🔗 Connecting to ${channelName}...`);
        
        const ws = new WebSocket(channel.url);
        channel.ws = ws;
        
        ws.onopen = () => {
          console.log(`✅ Connected to ${channelName}`);
          channel.connected = true;
          channel.reconnectAttempts = 0;
          channel.lastHeartbeat = Date.now();
          resolve();
        };

        ws.onmessage = (event) => {
          this.handleChannelMessage(channelName, event.data);
        };

        ws.onclose = (event) => {
          console.log(`🔌 Disconnected from ${channelName}:`, event.code, event.reason);
          channel.connected = false;
          this.handleChannelDisconnect(channelName, channel);
        };

        ws.onerror = (error) => {
          console.error(`❌ WebSocket error for ${channelName}:`, error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleChannelMessage(channelName: string, data: string): void {
    try {
      // Handle different message types
      if (data === 'ping' || data === 'pong') {
        // Heartbeat messages
        const channel = this.channels.get(channelName);
        if (channel) {
          channel.lastHeartbeat = Date.now();
        }
        return;
      }

      // Try to parse as JSON
      let messageData;
      try {
        messageData = JSON.parse(data);
      } catch (parseError) {
        console.log(`📨 Non-JSON message from ${channelName}:`, data);
        return;
      }

      // Route message to appropriate handler
      switch (channelName) {
        case CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES:
          this.handlePixelUpdate(messageData);
          break;
        case CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES:
          this.handleUserUpdate(messageData);
          break;
        case CONFIG.WEBSOCKET_CHANNELS.CHAT_MESSAGES:
          this.handleChatMessage(messageData);
          break;
        default:
          console.log(`📨 Unknown channel message from ${channelName}:`, messageData);
      }
    } catch (error) {
      console.error(`Error handling message from ${channelName}:`, error);
    }
  }

  private handleChannelDisconnect(channelName: string, channel: WebSocketChannel): void {
    if (this.isConnected && !this.isReconnecting) {
      channel.reconnectAttempts++;
      
      if (channel.reconnectAttempts <= CONFIG.MAX_RETRIES) {
        console.log(`🔄 Reconnecting to ${channelName} (attempt ${channel.reconnectAttempts})...`);
        setTimeout(() => {
          this.connectChannel(channelName, channel).catch(error => {
            console.error(`Failed to reconnect to ${channelName}:`, error);
          });
        }, CONFIG.WEBSOCKET_RECONNECT_DELAY * channel.reconnectAttempts);
      } else {
        console.error(`❌ Max reconnection attempts reached for ${channelName}`);
        this.emit('error', new Error(`Failed to reconnect to ${channelName}`));
      }
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, CONFIG.HEARTBEAT_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private checkHeartbeats(): void {
    const now = Date.now();
    for (const [channelName, channel] of this.channels) {
      if (channel.connected && (now - channel.lastHeartbeat) > CONFIG.HEARTBEAT_INTERVAL * 2) {
        console.warn(`⚠️ No heartbeat from ${channelName}, reconnecting...`);
        this.handleChannelDisconnect(channelName, channel);
      }
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting from all channels...');
    this.isConnected = false;
    this.isReconnecting = true;
    
    this.stopPolling();
    this.stopHeartbeat();
    
    // Close all WebSocket connections
    for (const [channelName, channel] of this.channels) {
      if (channel.ws) {
        console.log(`🔌 Closing ${channelName} connection`);
        channel.ws.close();
        channel.ws = null;
        channel.connected = false;
      }
    }
    
    this.emit('disconnect');
    this.gameStore.setConnected(false);
    this.isReconnecting = false;
  }

  // ===== Message Handlers =====
  private handlePixelUpdate(pixel: any): void {
    console.log('🎨 Received pixel update:', pixel);
    this.gameStore.updatePixel(pixel.x, pixel.y, pixel.color, pixel.userId);
    this.emit('pixelUpdate', {
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      userId: pixel.userId,
      username: pixel.username,
      timestamp: pixel.timestamp
    });
  }

  private handleUserUpdate(user: any): void {
    console.log('👤 Received user update:', user);
    if (user.isOnline) {
      this.gameStore.addUser(user);
      this.emit('userJoin', user);
    } else {
      this.gameStore.removeUser(user.id);
      this.emit('userLeave', user);
    }
  }

  private handleChatMessage(message: any): void {
    console.log('💬 Received chat message:', message);
    this.gameStore.addChatMessage(message);
    this.emit('chatMessage', message);
  }

  // ===== Publishing =====
  private async publishToChannel(channelName: string, data: any): Promise<void> {
    const channel = this.channels.get(channelName);
    if (!channel || !channel.ws || !channel.connected) {
      throw new Error(`WebSocket channel ${channelName} is not connected`);
    }

    try {
      channel.ws.send(JSON.stringify(data));
    } catch (error) {
      console.error(`Error publishing to ${channelName}:`, error);
      throw error;
    }
  }

  // ===== Game Actions =====
  async placePixel(x: number, y: number, color: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    // Add to queue for rate limiting
    const pixelItem: PixelQueueItem = {
      x, y, color, timestamp: Date.now()
    };

    this.pixelQueue.push(pixelItem);
    
    // Process queue if not already processing
    if (!this.isProcessingPixelQueue) {
      this.processPixelQueue();
    }
  }

  private async processPixelQueue(): Promise<void> {
    if (this.isProcessingPixelQueue || this.pixelQueue.length === 0) {
      return;
    }

    this.isProcessingPixelQueue = true;

    while (this.pixelQueue.length > 0) {
      const pixelItem = this.pixelQueue.shift();
      if (!pixelItem) continue;

      // Check cooldown
      const now = Date.now();
      const timeSinceLastPixel = now - this.lastPixelTime;
      
      if (timeSinceLastPixel < CONFIG.PIXEL_COOLDOWN) {
        const waitTime = CONFIG.PIXEL_COOLDOWN - timeSinceLastPixel;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      try {
        // Publish pixel update
        await this.publishToChannel(CONFIG.WEBSOCKET_CHANNELS.PIXEL_UPDATES, {
          x: pixelItem.x,
          y: pixelItem.y,
          color: pixelItem.color,
          userId: this.currentUser!.id,
          username: this.currentUser!.username,
          timestamp: Date.now()
        });
        
        // Update local state immediately for responsive UI
        this.gameStore.updatePixel(pixelItem.x, pixelItem.y, pixelItem.color, this.currentUser!.id);
        
        this.emit('pixelUpdate', {
          x: pixelItem.x,
          y: pixelItem.y,
          color: pixelItem.color,
          userId: this.currentUser!.id,
          timestamp: Date.now()
        });
        
        this.lastPixelTime = Date.now();
        
      } catch (error) {
        console.error('Error placing pixel:', error);
        // Re-queue the pixel for retry
        this.pixelQueue.unshift(pixelItem);
        break;
      }
    }

    this.isProcessingPixelQueue = false;
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

      // Publish user join
      await this.publishToChannel(CONFIG.WEBSOCKET_CHANNELS.USER_UPDATES, {
        id: user.id,
        username: user.username,
        color: user.color,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        pixelsPlaced: user.pixelsPlaced
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
        id: this.currentUser.id,
        username: this.currentUser.username,
        color: this.currentUser.color,
        isOnline: false,
        lastSeen: Date.now(),
        pixelsPlaced: this.currentUser.pixelsPlaced
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
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: this.currentUser.id,
      username: this.currentUser.username,
      message: message,
      timestamp: Date.now(),
      type: "user"
    };

    // Publish chat message
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

  // ===== Polling System (Fallback) =====
  private startPolling(): void {
    this.stopPolling();
    
    this.pollingInterval = setInterval(async () => {
      try {
        // Only poll if WebSocket connections are not healthy
        const healthyChannels = Array.from(this.channels.values()).filter(ch => ch.connected).length;
        if (healthyChannels < Object.keys(CONFIG.WEBSOCKET_CHANNELS).length) {
          console.log('📡 Fallback polling active...');
          await this.pollCanvas();
          await this.pollUsers();
          await this.pollMessages();
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, CONFIG.POLLING_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollCanvas(): Promise<void> {
    try {
      const canvas = await this.getCanvas();
      if (canvas) {
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
        // Handle messages if needed
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
    canPlacePixel: boolean;
    queueLength: number;
  } {
    const now = Date.now();
    const timeSinceLastPixel = now - this.lastPixelTime;
    const timeUntilNextPixel = Math.max(0, CONFIG.PIXEL_COOLDOWN - timeSinceLastPixel);
    
    return {
      timeUntilNextPixel,
      cooldown: CONFIG.PIXEL_COOLDOWN,
      canPlacePixel: timeUntilNextPixel === 0,
      queueLength: this.pixelQueue.length
    };
  }

  getConnectionStatus(): {
    isConnected: boolean;
    connectionMode: ConnectionMode;
    channels: { [key: string]: { connected: boolean; reconnectAttempts: number } };
  } {
    const channels: { [key: string]: { connected: boolean; reconnectAttempts: number } } = {};
    
    for (const [channelName, channel] of this.channels) {
      channels[channelName] = {
        connected: channel.connected,
        reconnectAttempts: channel.reconnectAttempts
      };
    }

    return {
      isConnected: this.isConnected,
      connectionMode: this.connectionMode,
      channels
    };
  }
}

// ===== Singleton Instance =====
export const taubyteService = new TaubyteService();
export default taubyteService;