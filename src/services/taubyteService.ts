import type { ChatMessage, User } from '../types/game';
import { useGameStore } from '../store/gameStore';

// Taubyte service configuration
const TAUBYTE_CONFIG = {
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
  POLLING_INTERVAL: 1000, // 1 second
  MAX_RETRIES: 3,
  RETRY_DELAY: 2000
};

class TaubyteService {
  private gameStore = useGameStore.getState();
  private currentUser: User | null = null;
  private isConnected = false;
  private pollingInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private eventListeners: Map<string, Function[]> = new Map();
  private websocket: WebSocket | null = null;
  private useWebSocket = true; // Toggle between polling and WebSocket
  private lastMessageTimestamp = 0; // Track last message timestamp to avoid duplicates
  private pingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  // Event listener management
  private setupEventListeners() {
    this.eventListeners.set('pixelUpdate', []);
    this.eventListeners.set('userJoin', []);
    this.eventListeners.set('userLeave', []);
    this.eventListeners.set('chatMessage', []);
    this.eventListeners.set('connect', []);
    this.eventListeners.set('disconnect', []);
    this.eventListeners.set('error', []);
  }

  on(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
  }

  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event) || [];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
    this.eventListeners.set(event, listeners);
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(callback => callback(data));
  }

  // HTTP request helper with retry logic
  private async makeRequest(endpoint: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    const url = `${TAUBYTE_CONFIG.BASE_URL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Always include user ID if available
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
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Retry on server errors (5xx) or network issues
          if (attempt === retries) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        return response;
      } catch (error) {
        if (attempt === retries) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    throw new Error('Max retries exceeded');
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.isConnected = true;
      this.emit('connect');
      this.gameStore.setConnected(true);
      
      if (this.useWebSocket) {
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

  // Polling for real-time updates
  private startPolling(): void {
    this.stopPolling();
    
    this.pollingInterval = setInterval(async () => {
      if (!this.isConnected) return;

      try {
        await Promise.all([
          this.pollUsers(),
          this.pollMessages(),
          this.pollCanvas(),
        ]);
      } catch (error) {
        console.error('Polling error:', error);
        this.handleConnectionError();
      }
    }, TAUBYTE_CONFIG.POLLING_INTERVAL);
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private async pollUsers(): Promise<void> {
    try {
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.GET_USERS);
      const data = await response.json();
      
      // Compare with current users and emit events for changes
      const currentUsers = this.gameStore.users;
      const newUsers = data.users || [];

      // Find new users or users that came back online
      newUsers.forEach((newUser: User) => {
        const existingUser = currentUsers.find(u => u.id === newUser.id);
        if (!existingUser) {
          this.emit('userJoin', { user: newUser, timestamp: Date.now() });
          this.gameStore.addUser(newUser);
        } else if (existingUser.isOnline !== newUser.isOnline) {
          // User status changed
          this.gameStore.updateUser(newUser.id, { isOnline: newUser.isOnline });
          if (newUser.isOnline) {
            this.emit('userJoin', { user: newUser, timestamp: Date.now() });
          } else {
            this.emit('userLeave', { userId: newUser.id, timestamp: Date.now() });
          }
        }
      });

      // Find users that are no longer in the list (completely gone)
      currentUsers.forEach(currentUser => {
        const stillExists = newUsers.find((u: User) => u.id === currentUser.id);
        if (!stillExists && currentUser.isOnline) {
          this.emit('userLeave', { userId: currentUser.id, timestamp: Date.now() });
          this.gameStore.removeUser(currentUser.id);
        }
      });
    } catch (error) {
      console.error('Error polling users:', error);
    }
  }

  private async pollMessages(): Promise<void> {
    try {
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.GET_MESSAGES);
      const data = await response.json();
      
      // Only process new messages to avoid duplicates
      const messages = data.messages || [];
      const newMessages = messages.filter((message: ChatMessage) => 
        message.timestamp > this.lastMessageTimestamp
      );
      
      newMessages.forEach((message: ChatMessage) => {
        this.emit('chatMessage', message);
        this.gameStore.addChatMessage(message);
        
        // Update last message timestamp
        if (message.timestamp > this.lastMessageTimestamp) {
          this.lastMessageTimestamp = message.timestamp;
        }
      });
    } catch (error) {
      console.error('Error polling messages:', error);
    }
  }

  private async pollCanvas(): Promise<void> {
    try {
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.GET_CANVAS);
      const data = await response.json();
      
      // Update canvas in the store
      if (data.canvas && data.width && data.height) {
        // Convert the canvas data to the format expected by the store
        const canvas = data.canvas.map((row: any[], y: number) => 
          row.map((pixel: any, x: number) => ({
            x,
            y,
            color: pixel.color || '#ffffff',
            userId: pixel.userId || '',
            timestamp: pixel.timestamp || 0
          }))
        );
        
        // Update the store with the new canvas
        this.gameStore.initializeCanvas(data.width, data.height);
        this.gameStore.setCanvas(canvas);
        
        // Emit canvas update event
        this.emit('canvasUpdate', { canvas, width: data.width, height: data.height });
      }
    } catch (error) {
      console.error('Error polling canvas:', error);
    }
  }

  private handleConnectionError(): void {
    this.retryCount++;
    
    if (this.retryCount >= TAUBYTE_CONFIG.MAX_RETRIES) {
      this.disconnect();
      this.emit('error', new Error('Max retry attempts reached'));
      return;
    }

    // Exponential backoff
    const delay = TAUBYTE_CONFIG.RETRY_DELAY * Math.pow(2, this.retryCount - 1);
    
    setTimeout(() => {
      if (this.currentUser) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  // Game actions
  async placePixel(x: number, y: number, color: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    try {
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.PLACE_PIXEL, {
        method: 'POST',
        body: JSON.stringify({ x, y, color }),
      });

      // Only update local state if server request succeeded
      if (response.ok) {
        this.gameStore.updatePixel(x, y, color, this.currentUser.id);
        
        // Emit pixel update event
        this.emit('pixelUpdate', {
          x, y, color, userId: this.currentUser.id, timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('Error placing pixel:', error);
      throw error;
    }
  }

  async joinGame(username: string, userId: string): Promise<User> {
    try {
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.JOIN_GAME, {
        method: 'POST',
        body: JSON.stringify({ username, userId }),
      });

      const user = await response.json();
      this.currentUser = user;
      
      // Connect after joining
      await this.connect();
      
      return user;
    } catch (error) {
      console.error('Error joining game:', error);
      throw error;
    }
  }

  // Method to restore user authentication after page refresh
  async restoreUserAuthentication(user: User): Promise<User> {
    try {
      // Temporarily set the current user for the request
      this.currentUser = user;
      
      // Re-register the user with the backend to ensure they're marked as online
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.JOIN_GAME, {
        method: 'POST',
        body: JSON.stringify({ username: user.username, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`Failed to re-register user: ${response.statusText}`);
      }

      // Update the current user with any changes from the backend
      const updatedUser = await response.json();
      this.currentUser = updatedUser;
      
      // Connect to the service
      await this.connect();
      
      console.log('User authentication restored successfully');
      return updatedUser;
    } catch (error) {
      console.error('Error restoring user authentication:', error);
      // Clear the current user if authentication failed
      this.currentUser = null;
      throw error;
    }
  }

  async leaveGame(): Promise<void> {
    if (!this.currentUser) {
      return;
    }

    try {
      await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.LEAVE_GAME, {
        method: 'POST',
      });

      this.disconnect();
      this.currentUser = null;
    } catch (error) {
      console.error('Error leaving game:', error);
      // Still disconnect locally even if server request fails
      this.disconnect();
      this.currentUser = null;
    }
  }

  async sendChatMessage(message: string): Promise<void> {
    if (!this.isConnected || !this.currentUser) {
      throw new Error('Not connected or user not logged in');
    }

    try {
      await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.SEND_MESSAGE, {
        method: 'POST',
        body: JSON.stringify({ message }),
      });
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  async initializeCanvas(): Promise<void> {
    try {
      await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.INIT_CANVAS, {
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
      const response = await this.makeRequest(TAUBYTE_CONFIG.API_ENDPOINTS.GET_CANVAS);
      const data = await response.json();
      
      // Initialize canvas with server state
      this.gameStore.initializeCanvas(data.width, data.height);
      
      // Apply all pixels from server
      data.canvas.forEach((row: any[], y: number) => {
        row.forEach((pixel: any, x: number) => {
          if (pixel && pixel.userId) {
            this.gameStore.updatePixel(x, y, pixel.color, pixel.userId);
          }
        });
      });
    } catch (error) {
      console.error('Error requesting canvas state:', error);
      throw error;
    }
  }

  // Utility methods
  isConnectedToServer(): boolean {
    return this.isConnected;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  // WebSocket connection methods
  private async connectWebSocket(): Promise<void> {
    try {
      // Get WebSocket URL from backend
      const response = await this.makeRequest(`${TAUBYTE_CONFIG.API_ENDPOINTS.GET_WEBSOCKET_URL}?room=pixelcollab`);
      const data = await response.json();
      
      if (!data.websocket_url) {
        throw new Error('No WebSocket URL received from server');
      }

      console.log('Connecting to WebSocket:', data.websocket_url);
      
      // Connect to WebSocket using the Taubyte-provided URL
      this.websocket = new WebSocket(data.websocket_url);
      
      this.websocket.onopen = () => {
        console.log('WebSocket connected successfully');
        this.emit('connect');
        
        // Subscribe to channels
        const subscribeMsg = {
          type: 'subscribe',
          channels: data.channels || ['pixelupdates', 'userupdates', 'chatmessages']
        };
        this.websocket?.send(JSON.stringify(subscribeMsg));
        
        // Start ping interval to keep connection alive
        this.startPingInterval();
      };

      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.emit('disconnect');
        // Attempt to reconnect after a delay
        if (this.isConnected) {
          console.log('Attempting to reconnect WebSocket in 3 seconds...');
          setTimeout(() => this.connectWebSocket(), 3000);
        }
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      // Fallback to polling if WebSocket fails
      console.log('Falling back to polling mode');
      this.useWebSocket = false;
      this.startPolling();
      // Still emit connect event since we're connected via polling
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

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 30 seconds to keep connection alive
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

  private handleWebSocketMessage(data: any): void {
    // Handle different types of real-time updates
    switch (data.type) {
      case 'connection':
        console.log('WebSocket connection established:', data.message);
        break;
        
      case 'pixelUpdate':
        console.log('Pixel update received via WebSocket:', data.payload);
        this.emit('pixelUpdate', data.payload);
        this.gameStore.updatePixel(data.payload.x, data.payload.y, data.payload.color, data.payload.userId);
        break;
        
      case 'userUpdate':
        console.log('User update received via WebSocket:', data.payload);
        this.emit('userUpdate', data.payload);
        if (data.payload.isOnline) {
          this.gameStore.addUser(data.payload);
        } else {
          this.gameStore.removeUser(data.payload.id);
        }
        break;
        
      case 'chatMessage':
        console.log('Chat message received via WebSocket:', data.payload);
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

  // Method to enable WebSocket mode
  enableWebSocket(): void {
    if (this.useWebSocket) return;
    
    this.useWebSocket = true;
    this.stopPolling();
    
    if (this.isConnected) {
      this.connectWebSocket();
    }
  }

  // Method to disable WebSocket mode (use polling)
  disableWebSocket(): void {
    if (!this.useWebSocket) return;
    
    this.useWebSocket = false;
    this.disconnectWebSocket();
    
    if (this.isConnected) {
      this.startPolling();
    }
  }

  // Method to get connection status
  getConnectionStatus(): { connected: boolean; mode: 'websocket' | 'polling'; websocketState?: number } {
    return {
      connected: this.isConnected,
      mode: this.useWebSocket ? 'websocket' : 'polling',
      websocketState: this.websocket?.readyState
    };
  }

  // Method to reset message timestamp (useful for reconnections)
  resetMessageTimestamp(): void {
    this.lastMessageTimestamp = 0;
  }

  // Method to send ping to WebSocket (keep connection alive)
  private sendPing(): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      const pingMsg = {
        type: 'ping',
        timestamp: Date.now()
      };
      this.websocket.send(JSON.stringify(pingMsg));
    }
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
  }
}

export const taubyteService = new TaubyteService();
