import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { taubyteService } from '../services/taubyteService';
import { GAME_CONFIG } from '../utils/constants';
import { generateUserId, isValidUsername } from '../utils/helpers';

export const useGameConnection = () => {
  const { 
    currentUser, 
    isConnected, 
    setConnected, 
    setCurrentUser
  } = useGameStore();
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(async (username: string) => {
    if (!isValidUsername(username)) {
      throw new Error('Invalid username');
    }

    try {
      const userId = generateUserId();
      
      // Join game through Taubyte service
      const user = await taubyteService.joinGame(username.trim(), userId);
      
      setCurrentUser(user);
      setConnected(true);
      
      // Reset reconnect attempts on successful connection
      reconnectAttempts.current = 0;
      
      return user;
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }, [setCurrentUser, setConnected]);

  const disconnect = useCallback(() => {
    if (currentUser) {
      taubyteService.leaveGame();
    }
    taubyteService.disconnect();
    setConnected(false);
    setCurrentUser(null);
    
    // Clear any pending reconnection attempts
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
  }, [currentUser, setConnected, setCurrentUser]);

  const reconnect = useCallback(() => {
    if (reconnectAttempts.current >= GAME_CONFIG.SOCKET_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    console.log(`Reconnection attempt ${reconnectAttempts.current}/${GAME_CONFIG.SOCKET_RECONNECT_ATTEMPTS}`);

    reconnectTimeout.current = setTimeout(async () => {
      if (currentUser) {
        try {
          await taubyteService.joinGame(currentUser.username, currentUser.id);
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }
    }, GAME_CONFIG.SOCKET_RECONNECT_DELAY * reconnectAttempts.current);
  }, [currentUser]);

  // Handle connection events
  useEffect(() => {
    const handleConnect = () => {
      setConnected(true);
      reconnectAttempts.current = 0;
      console.log('Connected to game server');
    };

    const handleDisconnect = () => {
      setConnected(false);
      console.log('Disconnected from game server');
      
      // Attempt to reconnect if we had a user
      if (currentUser) {
        reconnect();
      }
    };

    const handleError = (error: any) => {
      console.error('Taubyte service error:', error);
      setConnected(false);
    };

    // Set up event listeners
    taubyteService.on('connect', handleConnect);
    taubyteService.on('disconnect', handleDisconnect);
    taubyteService.on('error', handleError);

    return () => {
      taubyteService.off('connect', handleConnect);
      taubyteService.off('disconnect', handleDisconnect);
      taubyteService.off('error', handleError);
    };
  }, [setConnected, currentUser, reconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, []);

  return {
    connect,
    disconnect,
    reconnect,
    isConnected,
    currentUser
  };
};
