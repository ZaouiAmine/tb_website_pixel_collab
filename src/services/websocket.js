// WebSocket service for real-time updates
import { apiService } from './api.js';

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = {
      pixelUpdate: [],
      userUpdate: [],
      chatMessage: [],
      canvasUpdate: [],
      connection: [],
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      // Get WebSocket URL from backend
      const wsPath = await apiService.getWebSocketURL();
      
      // Construct full WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/${wsPath}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      // Create WebSocket connection
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyListeners('connection', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyListeners('connection', { connected: false });
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.handleReconnect();
    }
  }

  handleMessage(data) {
    // Handle different types of messages
    if (data.type === 'pixelUpdate' || data.x !== undefined) {
      this.notifyListeners('pixelUpdate', data);
    } else if (data.type === 'userUpdate' || data.username !== undefined) {
      this.notifyListeners('userUpdate', data);
    } else if (data.type === 'chatMessage' || data.message !== undefined) {
      this.notifyListeners('chatMessage', data);
    } else if (data.type === 'canvasUpdate' || data.action !== undefined) {
      this.notifyListeners('canvasUpdate', data);
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Event listener management
  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback);
      if (index > -1) {
        this.listeners[event].splice(index, 1);
      }
    }
  }

  notifyListeners(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket listener:', error);
        }
      });
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
