// API Configuration
// Replace this with your actual Taubyte domain
export const API_CONFIG = {
  BASE_URL: window.location.origin, // Update this with your actual Taubyte domain
  
  // Alternative: Use environment variables
  // BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  
  ENDPOINTS: {
    GET_CANVAS: '/api/getCanvas',
    PLACE_PIXEL: '/api/placePixel',
    INIT_CANVAS: '/api/initCanvas',
    GET_WEBSOCKET_URL: '/api/ws?room=pixelupdates',
    GET_USERS: '/api/getUsers',
    JOIN_GAME: '/api/joinGame',
    LEAVE_GAME: '/api/leaveGame',
    GET_MESSAGES: '/api/getMessages',
    SEND_MESSAGE: '/api/sendMessage'
  },
  
  // WebSocket configuration
  WEBSOCKET: {
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000, // Base delay in ms
    HEARTBEAT_INTERVAL: 30000 // 30 seconds
  }
}

// Helper function to get full URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`
}
