import type { ChatMessage, User } from '../types/game';
import { useGameStore } from '../store/gameStore';

// ===== Constants =====
const CONFIG = {
  BASE_URL: import.meta.env.VITE_TAUBYTE_URL || window.location.origin,
  API_ENDPOINTS: {
    PLACE_PIXEL: '/api/placePixel',
    JOIN_GAME: '/api/joinGame',
    LEAVE_GAME: '/api/leaveGame',
    GET_CANVAS: '/api/getCanvas',
    GET_USERS: '/api/getUsers',
    SEND_MESSAGE: '/api/sendMessage',
    GET_MESSAGES: '/api/getMessages',
    GET_WEBSOCKET_URL: '/api/getWebSocketURL',
    INIT_CANVAS: '/api/initCanvas'
  },
  POLLING_INTERVAL: 2000, // Increased to 2 seconds for better performance
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000,
  CACHE_DURATION: 5000, // 5 seconds cache for canvas data
  MAX_MESSAGES_CACHE: 100
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
  private connectionMode: ConnectionMode = 'polling';
  
  // Connection management
  private pollingInterval: NodeJS.Timeout | null = null;
  private websocket: WebSocket | null = null;
  private retryCount = 0;
  private websocketAttempted = false;
  
  // Event system
  private eventListeners: Map<EventType, Function[]> = new Map();
  
  // Caching system
  private cache: CachedData = {
    canvas: null,
    users: [],
    messages: [],
    lastUpdate: 0
  };
  
  // Performance optimization
  private lastMessageTimestamp = 0;
  private pingInterval: NodeJS.Timeout | null = null;
  private requestQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;
  
  // Smart rate limiting for pixel placement
  private pixelCooldown = 100; // Start with 100ms
  private maxCooldown = 2000;  // Max 2 seconds
  private minCooldown = 50;    // Min 50ms
  private lastPixelTime = 0;
  private consecutiveErrors = 0;
  private maxConsecutiveErrors = 3;
  private pixelQueue: Array<{x: number, y: number, color: string}> = [];
  private isProcessingPixelQueue = false;

  constructor() {
    this.initializeEventListeners();
  }

  // ===== Event System =====
  private initializeEventListeners(): void {
    const events: EventType[] = ['pixelUpdate', 'userJoin', 'userLeave', 'chatMessage', 'connect', 'disconnect', 'error', 'canvasUpdate', 'userUpdate'];
    events.forEach(event => {
      this.eventListeners.set(event, []);
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

  // ===== HTTP Request Management =====
  private async makeRequest(endpoint: string, options: RequestInit = {}, retries = CONFIG.MAX_RETRIES): Promise<Response> {
    const url = `${CONFIG.BASE_URL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.currentUser) {
      defaultHeaders['X-User-ID'] = this.currentUser.id;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...defaultHeaders,
            ...options.headers,
          },
        });

        if (!response.ok) {
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          if (attempt === retries) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          await this.delay(1000 * attempt);
          continue;
        }

        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        await this.delay(1000 * attempt);
      }
    }

    throw new Error('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== Request Queue Management =====
  private async processRequestQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Error processing queued request:', error);
        }
      }
    }
    
    this.isProcessingQueue = false;
  }

  private queueRequest(request: () => Promise<void>): void {
    this.requestQueue.push(request);
    this.processRequestQueue();
  }

  // ===== Connection Management =====
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.isConnected = true;
      this.emit('connect');
      this.gameStore.setConnected(true);
      
      if (this.connectionMode === 'websocket') {
        await this.connectWebSocket();
      } else {
        this.startPolling();
      }
      
      this.retryCount = 0;
    } catch (error) {
      this.isConnected = false;
      this.emit('error', error);
      throw error;
    }
  }

  disconnect(): void {
    this.isConnected = false;
    this.stopPolling();
    this.disconnectWebSocket();
    this.emit('disconnect');
    this.gameStore.setConnected(false);
  }

  // ===== Polling System =====
  private startPolling(): void {
    this.stopPolling();
    
    this.pollingInterval = setInterval(async () => {
      if (!this.isConnected) return;

      try {
        // Use request queue to prevent overwhelming the server
        this.queueRequest(async () => {
          await Promise.all([
            this.pollUsers(),
            this.pollMessages(),
            this.pollCanvas(),
          ]);
        });
      } catch (error) {
        console.error('Polling error:', error);
        this.handleConnectionError();
      }
    }, CONFIG.POLLING_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  // ===== Data Polling with Caching =====
  private async pollUsers(): Promise<void> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_USERS);
      const data = await response.json();
      
      const newUsers = data.users || [];
      const currentUsers = this.gameStore.users;

      // Only process if users have changed
      if (this.hasUsersChanged(currentUsers, newUsers)) {
        this.cache.users = newUsers;
        this.processUserChanges(currentUsers, newUsers);
      }
    } catch (error) {
      console.error('Error polling users:', error);
    }
  }

  private async pollMessages(): Promise<void> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_MESSAGES);
      const data = await response.json();
      
      const messages = data.messages || [];
      const newMessages = messages.filter((message: ChatMessage) => 
        message.timestamp > this.lastMessageTimestamp
      );
      
      if (newMessages.length > 0) {
        this.cache.messages = messages.slice(-CONFIG.MAX_MESSAGES_CACHE);
        newMessages.forEach((message: ChatMessage) => {
          this.emit('chatMessage', message);
          this.gameStore.addChatMessage(message);
          
          if (message.timestamp > this.lastMessageTimestamp) {
            this.lastMessageTimestamp = message.timestamp;
          }
        });
      }
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }

  private async pollCanvas(): Promise<void> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.cache.canvas && (now - this.cache.lastUpdate) < CONFIG.CACHE_DURATION) {
        return;
      }

      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_CANVAS);
      const data = await response.json();
      
      if (data.canvas && data.width && data.height) {
        this.cache.canvas = data;
        this.cache.lastUpdate = now;
        
        // Convert canvas data efficiently
        const canvas = this.convertCanvasData(data.canvas);
        
        this.gameStore.initializeCanvas(data.width, data.height);
        this.gameStore.setCanvas(canvas);
        
        this.emit('canvasUpdate', { canvas, width: data.width, height: data.height });
      }
    } catch (error) {
      console.error('Error polling canvas:', error);
    }
  }

  // ===== Helper Methods =====
  private hasUsersChanged(currentUsers: User[], newUsers: User[]): boolean {
    if (currentUsers.length !== newUsers.length) return true;
    
    for (let i = 0; i < currentUsers.length; i++) {
      const current = currentUsers[i];
      const updated = newUsers.find(u => u.id === current.id);
      if (!updated || current.isOnline !== updated.isOnline) {
        return true;
      }
    }
    
    return false;
  }

  private processUserChanges(currentUsers: User[], newUsers: User[]): void {
    // Find new users or users that came back online
    newUsers.forEach((newUser: User) => {
      const existingUser = currentUsers.find(u => u.id === newUser.id);
      if (!existingUser) {
        this.emit('userJoin', { user: newUser, timestamp: Date.now() });
        this.gameStore.addUser(newUser);
      } else if (existingUser.isOnline !== newUser.isOnline) {
        this.gameStore.updateUser(newUser.id, { isOnline: newUser.isOnline });
        if (newUser.isOnline) {
          this.emit('userJoin', { user: newUser, timestamp: Date.now() });
        } else {
          this.emit('userLeave', { userId: newUser.id, timestamp: Date.now() });
        }
      }
    });

    // Find users that are no longer in the list
    currentUsers.forEach(currentUser => {
      const stillExists = newUsers.find((u: User) => u.id === currentUser.id);
      if (!stillExists && currentUser.isOnline) {
        this.emit('userLeave', { userId: currentUser.id, timestamp: Date.now() });
        this.gameStore.removeUser(currentUser.id);
      }
    });
  }

  private convertCanvasData(canvasData: any[][]): any[][] {
    return canvasData.map((row: any[], y: number) => 
      row.map((pixel: any, x: number) => ({
        x,
        y,
        color: pixel.color || '#ffffff',
        userId: pixel.userId || '',
        timestamp: pixel.timestamp || 0
      }))
    );
  }

  // ===== Error Handling =====
  private handleConnectionError(): void {
    this.retryCount++;
    
    if (this.retryCount >= CONFIG.MAX_RETRIES) {
      this.disconnect();
      this.emit('error', new Error('Max retry attempts reached'));
      return;
    }

    const delay = CONFIG.RETRY_DELAY * Math.pow(2, this.retryCount - 1);
    
    setTimeout(() => {
      if (this.currentUser) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // ===== Game Actions =====
  async placePixel(x: number, y: number, color: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    // Update UI immediately for responsive experience
    this.gameStore.updatePixel(x, y, color, this.currentUser.id);
    this.emit('pixelUpdate', {
      x, y, color, userId: this.currentUser.id, timestamp: Date.now()
    });

    // Add to queue for server sync
    this.pixelQueue.push({ x, y, color });
    
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
      const pixel = this.pixelQueue.shift()!;
      
      try {
        // Wait for cooldown
        await this.waitForPixelCooldown();
        
        // Send to server
        await this.sendPixelUpdate(pixel.x, pixel.y, pixel.color);
        
        // Success: reduce cooldown and reset error count
        this.consecutiveErrors = 0;
        this.pixelCooldown = Math.max(this.minCooldown, this.pixelCooldown * 0.9);
        
        console.log(`Pixel placed successfully: (${pixel.x},${pixel.y}) - cooldown: ${this.pixelCooldown}ms`);
        
      } catch (error) {
        console.error('Error placing pixel:', error);
        
        // Error: increase cooldown and error count
        this.consecutiveErrors++;
        this.pixelCooldown = Math.min(this.maxCooldown, this.pixelCooldown * 1.5);
        
        // If too many errors, pause processing
        if (this.consecutiveErrors >= this.maxConsecutiveErrors) {
          console.log(`Too many errors (${this.consecutiveErrors}), pausing pixel processing for 5s`);
          this.pixelCooldown = 5000;
          this.consecutiveErrors = 0;
        }
        
        // Re-queue the pixel for retry
        this.pixelQueue.unshift(pixel);
        break; // Exit loop to wait for cooldown
      }
    }

    this.isProcessingPixelQueue = false;
  }

  private async waitForPixelCooldown(): Promise<void> {
    const now = Date.now();
    const timeSinceLastPixel = now - this.lastPixelTime;
    
    if (timeSinceLastPixel < this.pixelCooldown) {
      const waitTime = this.pixelCooldown - timeSinceLastPixel;
      console.log(`Waiting ${waitTime}ms before next pixel`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastPixelTime = Date.now();
  }

  async joinGame(username: string, userId: string): Promise<User> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.JOIN_GAME, {
        method: 'POST',
        body: JSON.stringify({ username, userId }),
      });

      const user = await response.json();
      this.currentUser = user;
      
      await this.connect();
      
      return user;
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  }

  async restoreUserAuthentication(user: User): Promise<User> {
    try {
      this.currentUser = user;
      
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.JOIN_GAME, {
        method: 'POST',
        body: JSON.stringify({ username: user.username, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to re-register user: ${response.statusText}`);
      }

      const updatedUser = await response.json();
      this.currentUser = updatedUser;
      
      await this.connect();
      
      console.log('User authentication restored successfully');
      return updatedUser;
    } catch (error) {
      console.error('Error restoring user authentication:', error);
      this.currentUser = null;
      throw error;
    }
  }

  async leaveGame(): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    try {
      await this.makeRequest(CONFIG.API_ENDPOINTS.LEAVE_GAME, {
        method: 'POST',
      });

      this.disconnect();
      this.currentUser = null;
    } catch (error) {
      console.error('Error leaving game:', error);
      this.disconnect();
      this.currentUser = null;
    }
  }

  async sendChatMessage(message: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    await this.makeRequest(CONFIG.API_ENDPOINTS.SEND_MESSAGE, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async sendPixelUpdate(x: number, y: number, color: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('User not logged in');
    }

    await this.makeRequest(CONFIG.API_ENDPOINTS.PLACE_PIXEL, {
      method: 'POST',
      body: JSON.stringify({ x, y, color }),
    });
  }

  async initializeCanvas(): Promise<void> {
    try {
      await this.makeRequest(CONFIG.API_ENDPOINTS.INIT_CANVAS, {
        method: 'POST',
      });
      console.log('Canvas initialized successfully');
    } catch (error) {
      console.error('Error initializing canvas:', error);
      throw error;
    }
  }

  async requestCanvasState(): Promise<void> {
    try {
      const response = await this.makeRequest(CONFIG.API_ENDPOINTS.GET_CANVAS);
      const data = await response.json();
      
      this.gameStore.initializeCanvas(data.width, data.height);
      
      const canvas = this.convertCanvasData(data.canvas);
      this.gameStore.setCanvas(canvas);
    } catch (error) {
      console.error('Error requesting canvas state:', error);
      throw error;
    }
  }

  // ===== WebSocket Management =====
  private async connectWebSocket(): Promise<void> {
    if (this.websocketAttempted) {
      throw new Error('WebSocket already attempted, using polling');
    }
    
    this.websocketAttempted = true;
    
    try {
      const response = await this.makeRequest(`${CONFIG.API_ENDPOINTS.GET_WEBSOCKET_URL}?room=pixelcollab`);
      const data = await response.json();
      
      if (!data.websocket_url) {
        throw new Error('No WebSocket URL received from server');
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const fullWebSocketURL = `${protocol}//${host}/${data.websocket_url}`;

      console.log('Connecting to Taubyte WebSocket:', fullWebSocketURL);
      
      this.websocket = new WebSocket(fullWebSocketURL);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.emit('connect');
        
        const subscribeMsg = {
          type: 'subscribe',
          channels: data.channels || ['pixelupdates', 'userupdates', 'chatmessages']
        };
        this.websocket?.send(JSON.stringify(subscribeMsg));
        
        this.startPingInterval();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.emit('disconnect');
        
        if (this.isConnected && !this.websocketAttempted) {
          setTimeout(() => this.connectWebSocket(), 3000);
        } else {
          console.log('WebSocket not available, switching to polling mode');
          this.connectionMode = 'polling';
          this.startPolling();
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.log('WebSocket not available, using polling mode:', error);
      this.connectionMode = 'polling';
      this.startPolling();
      this.emit('connect');
    }
  }

  private disconnectWebSocket(): void {
    this.stopPingInterval();
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'connection':
        console.log('WebSocket connection established:', data.message);
        break;
        
      case 'pixelUpdate':
        this.emit('pixelUpdate', data.payload);
        this.gameStore.updatePixel(data.payload.x, data.payload.y, data.payload.color, data.payload.userId);
        break;
        
      case 'userUpdate':
        this.emit('userUpdate', data.payload);
        if (data.payload.isOnline) {
          this.gameStore.addUser(data.payload);
        } else {
          this.gameStore.removeUser(data.payload.id);
        }
        break;
        
      case 'chatMessage':
        this.emit('chatMessage', data.payload);
        this.gameStore.addChatMessage(data.payload);
        break;
        
      case 'pong':
        console.log('WebSocket pong received');
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type, data);
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingInterval = setInterval(() => {
      this.sendPing();
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private sendPing(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const pingMsg = {
        type: 'ping',
        timestamp: Date.now()
      };
      this.websocket.send(JSON.stringify(pingMsg));
    }
  }

  // ===== Public Methods =====
  enableWebSocket(): void {
    if (this.connectionMode === 'websocket') return;
    
    this.connectionMode = 'websocket';
    this.websocketAttempted = false;
    this.stopPolling();
    
    if (this.isConnected) {
      this.connectWebSocket();
    }
  }

  disableWebSocket(): void {
    if (this.connectionMode === 'polling') return;
    
    this.connectionMode = 'polling';
    this.disconnectWebSocket();
    
    if (this.isConnected) {
      this.startPolling();
    }
  }

  getConnectionStatus(): { connected: boolean; mode: ConnectionMode; websocketState?: number } {
    return {
      connected: this.isConnected,
      mode: this.connectionMode,
      websocketState: this.websocket?.readyState
    };
  }

  getPixelRateLimitStatus(): { 
    cooldown: number; 
    queueLength: number; 
    consecutiveErrors: number; 
    isProcessing: boolean 
  } {
    return {
      cooldown: this.pixelCooldown,
      queueLength: this.pixelQueue.length,
      consecutiveErrors: this.consecutiveErrors,
      isProcessing: this.isProcessingPixelQueue
    };
  }

  resetMessageTimestamp(): void {
    this.lastMessageTimestamp = 0;
  }

  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // ===== Cleanup =====
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.requestQueue = [];
    this.cache = {
      canvas: null,
      users: [],
      messages: [],
      lastUpdate: 0
    };
  }
}

export const taubyteService = new TaubyteService();