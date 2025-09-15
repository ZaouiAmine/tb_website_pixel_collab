import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import UserPanel from './components/UserPanel';
import ConnectionStatus from './components/ConnectionStatus';
import UsersList from './components/UsersList';
import Canvas from './components/Canvas';
import Chat from './components/Chat';
import ErrorBoundary from './components/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';
import { useCanvas } from './hooks/useCanvas';

function App() {
  const [currentUser, setCurrentUser] = useState({
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    username: 'Player',
    color: '#ff0000'
  });
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const baseURL = window.location.origin;
  
  const { websocket, connectionStatus, connectWebSocket } = useWebSocket(baseURL, currentUser);
  const { canvas, ctx, initializeCanvas, loadCanvas, clearCanvas } = useCanvas();

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    if (data.x !== undefined && data.y !== undefined && data.color) {
      // Pixel update
      console.log('Handling pixel update:', data);
      if (ctx) {
        ctx.fillStyle = data.color;
        ctx.fillRect(data.x * 5, data.y * 5, 5, 5);
        console.log(`Drew pixel at (${data.x}, ${data.y}) with color ${data.color}`);
      } else {
        console.error('Canvas context not available for pixel update');
      }
    } else if (data.id && data.username && !data.message) {
      // User update
      console.log('Handling user update:', data);
      loadUsers();
    } else if (data.message && data.username) {
      // Chat message
      console.log('Handling chat message:', data);
      const timestamp = data.timestamp ? new Date(data.timestamp * 1000) : new Date();
      addMessage(data.username, data.message, timestamp);
    } else {
      console.log('Unknown message type:', data);
    }
  }, [ctx, loadUsers, addMessage]);

  useEffect(() => {
    if (websocket) {
      const handleMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.log('Non-JSON message:', event.data);
        }
      };

      websocket.addEventListener('message', handleMessage);
      return () => {
        websocket.removeEventListener('message', handleMessage);
      };
    }
  }, [websocket, handleWebSocketMessage]);

  // Initialize on component mount
  useEffect(() => {
    initializeCanvas();
    loadInitialState();
    connectWebSocket();
  }, []);

  // Load initial state from backend
  const loadInitialState = async () => {
    try {
      await Promise.all([
        loadCanvas(),
        loadUsers(),
        loadMessages()
      ]);
      addMessage('System', 'Welcome to the pixel collaboration game!');
      console.log('Initial state loaded successfully');
    } catch (error) {
      console.error('Error loading initial state:', error);
      addMessage('System', 'Error loading initial data. Please refresh the page.');
    }
  };

  // Load users from backend
  const loadUsers = useCallback(async () => {
    try {
      const response = await fetch(`${baseURL}/api/getUsers`);
      
      if (!response.ok) {
        console.error('Failed to load users:', response.status);
        return;
      }
      
      const responseText = await response.text();
      console.log('Users response:', responseText);
      
      if (!responseText || responseText.trim() === '') {
        setUsers([]);
        return;
      }
      
      const usersData = JSON.parse(responseText);
      setUsers(usersData || []);
      
    } catch (error) {
      console.error('Error loading users:', error);
    }
  }, [baseURL]);

  // Load messages from backend
  const loadMessages = async () => {
    try {
      const response = await fetch(`${baseURL}/api/getMessages`);
      
      if (!response.ok) {
        console.error('Failed to load messages:', response.status);
        return;
      }
      
      const responseText = await response.text();
      console.log('Messages response:', responseText);
      
      if (!responseText || responseText.trim() === '') {
        return;
      }
      
      const messagesData = JSON.parse(responseText);
      
      if (messagesData && Array.isArray(messagesData) && messagesData.length > 0) {
        messagesData.forEach(message => {
          const timestamp = message.timestamp ? new Date(message.timestamp * 1000) : new Date();
          addMessage(message.username, message.message, timestamp);
        });
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // Add message to chat
  const addMessage = useCallback((username, message, timestamp = new Date()) => {
    console.log(`addMessage called: ${username} - ${message}`);
    const newMessage = {
      id: Date.now() + Math.random(),
      username,
      message,
      timestamp
    };
    setMessages(prev => [...prev, newMessage]);
    console.log(`Message added: ${username} - ${message}`);
  }, []);

  // Send chat message
  const sendMessage = (message) => {
    if (message && websocket && websocket.readyState === WebSocket.OPEN) {
      const chatMessage = {
        userId: currentUser.id,
        username: currentUser.username,
        message: message,
        timestamp: Math.floor(Date.now() / 1000)
      };
      
      websocket.send(JSON.stringify(chatMessage));
      console.log('Sent chat message:', chatMessage);
    } else if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      console.log('WebSocket not connected, cannot send message');
      addMessage('System', 'Not connected to server. Please wait for connection.');
    }
  };

  // Update user profile
  const updateUserProfile = (username, color) => {
    if (username) {
      const updatedUser = {
        ...currentUser,
        username,
        color
      };
      setCurrentUser(updatedUser);
      
      // Send user update via WebSocket
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        const userData = {
          id: updatedUser.id,
          username: updatedUser.username,
          color: updatedUser.color,
          online: true
        };
        websocket.send(JSON.stringify(userData));
        console.log('Sent user update:', userData);
      } else {
        console.log('WebSocket not connected, cannot send user update');
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <div className="header">
          <h1>🎨 Pixel Collaboration Game</h1>
          <p>Draw together in real-time with friends!</p>
        </div>

        <div className="main-container">
          <div className="left-panel">
            <div className="panel">
              <h3>👤 Your Profile</h3>
              <UserPanel 
                currentUser={currentUser}
                onUpdateProfile={updateUserProfile}
              />
            </div>

            <div className="panel">
              <h3>🔌 Connection</h3>
              <ConnectionStatus 
                status={connectionStatus}
                onConnect={connectWebSocket}
              />
            </div>

            <div className="panel">
              <h3>👥 Online Users</h3>
              <UsersList users={users} />
            </div>
          </div>

          <div className="right-panel">
            <div className="panel">
              <h3>🎨 Collaborative Canvas</h3>
              <Canvas 
                canvas={canvas}
                ctx={ctx}
                currentUser={currentUser}
                websocket={websocket}
                onClearCanvas={clearCanvas}
                onRefreshCanvas={loadCanvas}
              />
            </div>

            <div className="panel">
              <h3>💬 Chat</h3>
              <Chat 
                messages={messages}
                onSendMessage={sendMessage}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;