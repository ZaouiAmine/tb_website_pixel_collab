import { useState, useCallback } from 'react';

export function useWebSocket(baseURL, currentUser) {
  const [websocket, setWebsocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const connectWebSocket = useCallback(async () => {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      return;
    }
    
    setConnectionStatus('connecting');
    
    try {
      const response = await fetch(`${baseURL}/api/getWebSocketURL?room=pixelupdates`);
      const wsPath = await response.text();
      let wsURL;
      if (baseURL.startsWith('https://')) {
        wsURL = baseURL.replace('https://', 'wss://') + '/' + wsPath;
      } else {
        wsURL = baseURL.replace('http://', 'ws://') + '/' + wsPath;
      }
      
      const ws = new WebSocket(wsURL);
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        console.log('WebSocket connected successfully');
        
        // Send user profile when connected
        if (currentUser.username) {
          const userData = {
            id: currentUser.id,
            username: currentUser.username,
            color: currentUser.color,
            online: true
          };
          ws.send(JSON.stringify(userData));
          console.log('Sent user profile:', userData);
        }
      };
      
      ws.onclose = (event) => {
        setConnectionStatus('disconnected');
        console.log('WebSocket closed:', event.code, event.reason);
        
        // Only attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000) {
          setTimeout(() => {
            setWebsocket(prev => {
              if (!prev || prev.readyState === WebSocket.CLOSED) {
                console.log('Attempting to reconnect...');
                connectWebSocket();
              }
              return prev;
            });
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        setConnectionStatus('error');
        console.error('WebSocket error:', error);
      };
      
      setWebsocket(ws);
      
    } catch (error) {
      setConnectionStatus('error');
      console.error('Connection error:', error);
    }
  }, [baseURL, currentUser.id, currentUser.username, currentUser.color]);

  return { websocket, connectionStatus, connectWebSocket };
}
