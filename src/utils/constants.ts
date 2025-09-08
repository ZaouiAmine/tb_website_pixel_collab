// Game configuration constants
export const GAME_CONFIG = {
  // Canvas settings
  DEFAULT_CANVAS_WIDTH: 100,
  DEFAULT_CANVAS_HEIGHT: 100,
  DEFAULT_PIXEL_SIZE: 8,
  MAX_CANVAS_WIDTH: 500,
  MAX_CANVAS_HEIGHT: 500,
  MIN_CANVAS_WIDTH: 20,
  MIN_CANVAS_HEIGHT: 20,
  
  // User settings
  DEFAULT_COOLDOWN_TIME: 1000, // 1 second
  DEFAULT_MAX_PIXELS_PER_USER: 1000,
  MAX_USERNAME_LENGTH: 20,
  MIN_USERNAME_LENGTH: 2,
  
  // Chat settings
  MAX_CHAT_MESSAGE_LENGTH: 200,
  MAX_CHAT_HISTORY: 100,
  
  // Connection settings
  SOCKET_RECONNECT_ATTEMPTS: 5,
  SOCKET_RECONNECT_DELAY: 2000,
  SOCKET_TIMEOUT: 20000,
  
  // UI settings
  ANIMATION_DURATION: 200,
  DEBOUNCE_DELAY: 300,
  
  // Colors
  DEFAULT_COLORS: [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff',
    '#0080ff', '#80ff00', '#ff0080', '#808080', '#c0c0c0',
    '#800000', '#008000', '#000080', '#808000', '#800080',
    '#008080', '#ffa500', '#ffc0cb', '#a52a2a', '#00ff80',
    '#ff8080', '#80ff80', '#8080ff', '#ffff80', '#ff80ff',
    '#80ffff', '#dda0dd', '#98fb98', '#f0e68c', '#ffb6c1'
  ],
  
  // Taubyte endpoints
  TAUBYTE_ENDPOINTS: {
    BASE_URL: import.meta.env.VITE_TAUBYTE_URL || window.location.origin,
    PLACE_PIXEL: '/api/placePixel',
    JOIN_GAME: '/api/joinGame',
    LEAVE_GAME: '/api/leaveGame',
    GET_CANVAS: '/api/getCanvas',
    GET_USERS: '/api/getUsers',
    SEND_MESSAGE: '/api/sendMessage',
    GET_MESSAGES: '/api/getMessages'
  }
};

// Local storage keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'pixel_collab_user_prefs',
  GAME_SETTINGS: 'pixel_collab_game_settings',
  CHAT_HISTORY: 'pixel_collab_chat_history',
  CANVAS_STATE: 'pixel_collab_canvas_state'
};

// Event types for Taubyte service communication
export const TAUBYTE_EVENTS = {
  // Client to server
  JOIN_GAME: 'joinGame',
  LEAVE_GAME: 'leaveGame',
  PLACE_PIXEL: 'placePixel',
  CHAT_MESSAGE: 'chatMessage',
  REQUEST_CANVAS_STATE: 'requestCanvasState',
  UPDATE_USER_SETTINGS: 'updateUserSettings',
  
  // Server to client
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  PIXEL_UPDATE: 'pixelUpdate',
  USER_JOIN: 'userJoin',
  USER_LEAVE: 'userLeave',
  CHAT_MESSAGE_RECEIVED: 'chatMessage',
  CANVAS_STATE: 'canvasState',
  GAME_STATE: 'gameState',
  ERROR: 'error',
  USER_UPDATE: 'userUpdate'
};

// Error messages
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: 'Failed to connect to server',
  USERNAME_TAKEN: 'Username is already taken',
  INVALID_USERNAME: 'Invalid username',
  PIXEL_LIMIT_REACHED: 'Pixel limit reached',
  COOLDOWN_ACTIVE: 'Cooldown is still active',
  CANVAS_FULL: 'Canvas is full',
  UNAUTHORIZED: 'Unauthorized access',
  SERVER_ERROR: 'Server error occurred',
  NETWORK_ERROR: 'Network connection error'
};

// Success messages
export const SUCCESS_MESSAGES = {
  CONNECTED: 'Connected to server',
  USER_JOINED: 'User joined the game',
  USER_LEFT: 'User left the game',
  PIXEL_PLACED: 'Pixel placed successfully',
  MESSAGE_SENT: 'Message sent',
  SETTINGS_UPDATED: 'Settings updated'
};
