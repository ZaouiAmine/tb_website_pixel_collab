// API service for Taubyte backend communication
import { API_CONFIG, getApiUrl } from '../config/api.js'

class ApiService {
  async request(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // Canvas operations
  async getCanvas() {
    return this.request(API_CONFIG.ENDPOINTS.GET_CANVAS);
  }

  async placePixel(pixelData) {
    return this.request(API_CONFIG.ENDPOINTS.PLACE_PIXEL, {
      method: 'POST',
      body: JSON.stringify(pixelData),
    });
  }

  async initCanvas() {
    return this.request(API_CONFIG.ENDPOINTS.INIT_CANVAS, {
      method: 'POST',
    });
  }

  // WebSocket operations
  async getWebSocketURL() {
    const url = getApiUrl(API_CONFIG.ENDPOINTS.GET_WEBSOCKET_URL);
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Return the WebSocket path as a string
      return await response.text();
    } catch (error) {
      console.error(`API Error (${API_CONFIG.ENDPOINTS.GET_WEBSOCKET_URL}):`, error);
      throw error;
    }
  }

  // User management
  async getUsers() {
    return this.request(API_CONFIG.ENDPOINTS.GET_USERS);
  }

  async joinGame(userData) {
    return this.request(API_CONFIG.ENDPOINTS.JOIN_GAME, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async leaveGame(userId) {
    return this.request(API_CONFIG.ENDPOINTS.LEAVE_GAME, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  // Chat operations
  async getMessages() {
    return this.request(API_CONFIG.ENDPOINTS.GET_MESSAGES);
  }

  async sendMessage(messageData) {
    return this.request(API_CONFIG.ENDPOINTS.SEND_MESSAGE, {
      method: 'POST',
      body: JSON.stringify(messageData),
    });
  }
}

export const apiService = new ApiService();
