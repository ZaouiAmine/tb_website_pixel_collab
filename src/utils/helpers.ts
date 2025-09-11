import { GAME_CONFIG } from './constants';

// Color utilities
export const generateRandomColor = (): string => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

export const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Username utilities
export const generateUserId = (): string => {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const isValidUsername = (username: string): boolean => {
  const trimmed = username.trim();
  return trimmed.length >= GAME_CONFIG.MIN_USERNAME_LENGTH && 
         trimmed.length <= GAME_CONFIG.MAX_USERNAME_LENGTH &&
         /^[a-zA-Z0-9_-]+$/.test(trimmed);
};

export const sanitizeUsername = (username: string): string => {
  return username.trim().replace(/[^a-zA-Z0-9_-]/g, '').substring(0, GAME_CONFIG.MAX_USERNAME_LENGTH);
};

export const sanitizeMessage = (message: string): string => {
  // Basic XSS protection - remove script tags and dangerous characters
  let sanitized = message.trim();
  
  // Remove potential script tags
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Limit length
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 500);
  }
  
  return sanitized;
};

// Time utilities
export const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const getTimeRemaining = (endTime: number): number => {
  return Math.max(0, endTime - Date.now());
};

// Canvas utilities
export const getPixelIndex = (x: number, y: number, width: number): number => {
  return y * width + x;
};

export const getPixelCoordinates = (index: number, width: number): { x: number; y: number } => {
  return {
    x: index % width,
    y: Math.floor(index / width)
  };
};

export const isWithinCanvas = (x: number, y: number, width: number, height: number): boolean => {
  return x >= 0 && x < width && y >= 0 && y < height;
};

// Local storage utilities
export const saveToStorage = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return defaultValue;
  }
};

export const removeFromStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

// Debounce utility
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttle utility
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
};

// Array utilities
export const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

// Validation utilities
export const validateCanvasSize = (width: number, height: number): boolean => {
  return width >= GAME_CONFIG.MIN_CANVAS_WIDTH &&
         width <= GAME_CONFIG.MAX_CANVAS_WIDTH &&
         height >= GAME_CONFIG.MIN_CANVAS_HEIGHT &&
         height <= GAME_CONFIG.MAX_CANVAS_HEIGHT;
};

export const validatePixelSize = (size: number): boolean => {
  return size >= 1 && size <= 50;
};



// URL utilities
export const getServerUrl = (): string => {
  return GAME_CONFIG.TAUBYTE_ENDPOINTS.BASE_URL;
};

export const buildApiUrl = (endpoint: string): string => {
  return `${GAME_CONFIG.TAUBYTE_ENDPOINTS.BASE_URL}${endpoint}`;
};

// Error handling utilities
export const createError = (message: string, code?: string): Error => {
  const error = new Error(message);
  if (code) {
    (error as Error & { code?: string }).code = code;
  }
  return error;
};

export const handleApiError = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        if (typeof data.message === 'string') {
          return data.message;
        }
      }
    }
    if (typeof err.message === 'string') {
      return err.message;
    }
  }
  return 'An unexpected error occurred';
};
