// Global variables
let websocket = null;
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentUser = {
    id: 'user_' + Math.random().toString(36).substr(2, 9),
    username: 'Player',
    color: '#ff0000'
};
let baseURL = window.location.origin;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeCanvas();
    updateColorPreview();
    
    // Load initial state first, then connect WebSocket
    setTimeout(async () => {
        await loadInitialState();
        connectWebSocket();
    }, 100);
});

// Load initial state from backend
async function loadInitialState() {
    try {
        // Load canvas, users, and messages in parallel
        await Promise.all([
            loadCanvas(),
            loadUsers(),
            loadMessages()
        ]);
        
        // Add welcome message
        addChatMessage('System', 'Welcome to the pixel collaboration game!');
        console.log('Initial state loaded successfully');
    } catch (error) {
        console.error('Error loading initial state:', error);
        addChatMessage('System', 'Error loading initial data. Please refresh the page.');
    }
}

// Canvas initialization
function initializeCanvas() {
    canvas = document.getElementById('pixelCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context');
        return;
    }
    
    console.log('Canvas initialized successfully:', canvas.width, 'x', canvas.height);
    
    // Set up canvas event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

// Drawing functions
function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    // Scale down coordinates to match backend (100x100 grid)
    const backendX = Math.floor(x / 5); // 500px canvas / 100 backend pixels = 5px per pixel
    const backendY = Math.floor(y / 5);
    
    // Ensure coordinates are within bounds
    if (backendX >= 0 && backendX < 100 && backendY >= 0 && backendY < 100) {
        // Draw pixel (5x5 for visibility)
        ctx.fillStyle = currentUser.color;
        ctx.fillRect(backendX * 5, backendY * 5, 5, 5);
        
        // Send pixel update via WebSocket
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            const pixel = {
                x: backendX,
                y: backendY,
                color: currentUser.color,
                userId: currentUser.id,
                username: currentUser.username
            };
            
            websocket.send(JSON.stringify(pixel));
            console.log('Sent pixel update:', pixel);
        } else {
            console.log('WebSocket not connected, cannot send pixel update');
        }
    }
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// WebSocket functions
async function connectWebSocket() {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        return;
    }
    
    updateStatus('connecting', 'Connecting...');
    
    try {
        // Get WebSocket URL from backend
        const response = await fetch(`${baseURL}/api/getWebSocketURL?room=pixelupdates`);
        const wsPath = await response.text();
        let wsURL;
        if (baseURL.startsWith('https://')) {
            wsURL = baseURL.replace('https://', 'wss://') + '/' + wsPath;
        } else {
            wsURL = baseURL.replace('http://', 'ws://') + '/' + wsPath;
        }
        
        websocket = new WebSocket(wsURL);
        
        websocket.onopen = function() {
            updateStatus('connected', 'Connected');
            console.log('WebSocket connected successfully');
            
            // Send user profile to backend when connected
            if (currentUser.username) {
                const userData = {
                    id: currentUser.id,
                    username: currentUser.username,
                    color: currentUser.color,
                    online: true
                };
                websocket.send(JSON.stringify(userData));
                console.log('Sent user profile:', userData);
            }
        };
        
        websocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('Received WebSocket message:', data);
                handleWebSocketMessage(data);
            } catch (e) {
                console.log('Non-JSON message:', event.data);
            }
        };
        
        websocket.onclose = function(event) {
            updateStatus('disconnected', 'Disconnected');
            console.log('WebSocket closed:', event.code, event.reason);
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (!websocket || websocket.readyState === WebSocket.CLOSED) {
                    console.log('Attempting to reconnect...');
                    connectWebSocket();
                }
            }, 3000);
        };
        
        websocket.onerror = function(error) {
            updateStatus('error', 'Connection Error');
            console.error('WebSocket error:', error);
        };
        
    } catch (error) {
        updateStatus('error', 'Failed to connect');
        console.error('Connection error:', error);
    }
}

function disconnectWebSocket() {
    if (websocket) {
        websocket.close();
        websocket = null;
    }
    updateStatus('disconnected', 'Disconnected');
}

function handleWebSocketMessage(data) {
    // Handle different types of messages based on data structure
    if (data.x !== undefined && data.y !== undefined && data.color) {
        // This is a pixel update
        console.log('Handling pixel update:', data);
        
        // Ensure canvas context is available
        if (!ctx) {
            console.error('Canvas context not available for pixel update');
            return;
        }
        
        // Draw the pixel
        ctx.fillStyle = data.color;
        ctx.fillRect(data.x * 5, data.y * 5, 5, 5);
        console.log(`Drew pixel at (${data.x}, ${data.y}) with color ${data.color}`);
        
    } else if (data.id && data.username && !data.message) {
        // This is a user update (has id, username, but no message)
        console.log('Handling user update:', data);
        loadUsers(); // Refresh the users list
        
    } else if (data.message && data.username) {
        // This is a chat message
        console.log('Handling chat message:', data);
        const timestamp = data.timestamp ? new Date(data.timestamp * 1000) : new Date();
        
        // Ensure chat container exists
        const chatMessages = document.getElementById('chatMessages');
        if (!chatMessages) {
            console.error('Chat messages container not found');
            return;
        }
        
        addChatMessage(data.username, data.message, timestamp);
        console.log(`Added chat message from ${data.username}: ${data.message}`);
        
    } else {
        console.log('Unknown message type:', data);
    }
}

// API functions
async function loadCanvas() {
    try {
        const response = await fetch(`${baseURL}/api/getCanvas`);
        
        if (!response.ok) {
            console.error('Failed to load canvas:', response.status);
            return;
        }
        
        const canvasData = await response.json();
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw canvas data
        if (canvasData && Array.isArray(canvasData)) {
            canvasData.forEach((row, y) => {
                if (Array.isArray(row)) {
                    row.forEach((pixel, x) => {
                        if (pixel && pixel.color && pixel.color !== '#ffffff') {
                            ctx.fillStyle = pixel.color;
                            ctx.fillRect(x * 5, y * 5, 5, 5);
                        }
                    });
                }
            });
        }
        
    } catch (error) {
        console.error('Error loading canvas:', error);
    }
}

async function clearCanvas() {
    try {
        await fetch(`${baseURL}/api/initCanvas`);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    } catch (error) {
        console.error('Error clearing canvas:', error);
    }
}

function refreshCanvas() {
    loadCanvas();
}

async function loadUsers() {
    try {
        const response = await fetch(`${baseURL}/api/getUsers`);
        
        if (!response.ok) {
            console.error('Failed to load users:', response.status);
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '<div class="user-item">Error loading users</div>';
            return;
        }
        
        const responseText = await response.text();
        console.log('Users response:', responseText);
        
        if (!responseText || responseText.trim() === '') {
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '<div class="user-item">No users online</div>';
            return;
        }
        
        const users = JSON.parse(responseText);
        
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        if (users && Array.isArray(users) && users.length > 0) {
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-item';
                userDiv.innerHTML = `
                    <div class="user-color" style="background-color: ${user.color || '#999'}"></div>
                    <span class="user-name">${user.username || 'Unknown'}</span>
                    <span class="user-status">${user.online ? 'Online' : 'Offline'}</span>
                `;
                usersList.appendChild(userDiv);
            });
        } else {
            usersList.innerHTML = '<div class="user-item">No users online</div>';
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '<div class="user-item">Error loading users</div>';
    }
}

async function loadMessages() {
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
        
        const messages = JSON.parse(responseText);
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (messages && Array.isArray(messages) && messages.length > 0) {
            messages.forEach(message => {
                const timestamp = message.timestamp ? new Date(message.timestamp * 1000) : new Date();
                addChatMessage(message.username, message.message, timestamp);
            });
        }
        
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (message && websocket && websocket.readyState === WebSocket.OPEN) {
        const chatMessage = {
            userId: currentUser.id,
            username: currentUser.username,
            message: message,
            timestamp: Math.floor(Date.now() / 1000)
        };
        
        websocket.send(JSON.stringify(chatMessage));
        console.log('Sent chat message:', chatMessage);
        
        // Don't add the message locally - wait for it to come back via WebSocket
        // This prevents duplicate messages
        chatInput.value = '';
    } else if (!websocket || websocket.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not connected, cannot send message');
        addChatMessage('System', 'Not connected to server. Please wait for connection.');
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function addChatMessage(username, message, timestamp = new Date()) {
    console.log(`addChatMessage called: ${username} - ${message}`);
    
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        console.error('Chat messages container not found in addChatMessage');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <div class="message-header">${username}</div>
        <div class="message-content">${message}</div>
        <div class="message-time">${timestamp.toLocaleTimeString()}</div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    console.log(`Chat message added to DOM: ${username} - ${message}`);
}

// User management
function updateUserProfile() {
    const username = document.getElementById('username').value.trim();
    const color = document.getElementById('userColor').value;
    
    if (username) {
        currentUser.username = username;
        currentUser.color = color;
        updateColorPreview();
        
        // Send user update via WebSocket
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            const userData = {
                id: currentUser.id,
                username: currentUser.username,
                color: currentUser.color,
                online: true
            };
            websocket.send(JSON.stringify(userData));
            console.log('Sent user update:', userData);
        } else {
            console.log('WebSocket not connected, cannot send user update');
        }
    }
}

function updateColorPreview() {
    const colorPreview = document.getElementById('colorPreview');
    colorPreview.style.backgroundColor = currentUser.color;
}

function updateStatus(status, text) {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    statusDot.className = 'status-dot ' + (status === 'connected' ? 'connected' : '');
    statusText.textContent = text;
}

// Update color preview when color picker changes
document.addEventListener('DOMContentLoaded', function() {
    const colorInput = document.getElementById('userColor');
    if (colorInput) {
        colorInput.addEventListener('change', function() {
            updateColorPreview();
        });
    }
    
    // Periodically refresh users list every 10 seconds
    setInterval(() => {
        if (websocket && websocket.readyState === WebSocket.OPEN) {
            loadUsers();
        }
    }, 10000);
});

// Test functions for debugging (available in browser console)
window.testChat = function(message) {
    console.log('Testing chat with message:', message);
    addChatMessage('TestUser', message || 'Test message');
};

window.testPixel = function(x, y, color) {
    console.log('Testing pixel at:', x, y, color);
    if (ctx) {
        ctx.fillStyle = color || '#ff0000';
        ctx.fillRect((x || 10) * 5, (y || 10) * 5, 5, 5);
        console.log('Pixel drawn');
    } else {
        console.error('Canvas context not available');
    }
};

window.testWebSocket = function() {
    console.log('WebSocket status:', websocket ? websocket.readyState : 'null');
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        console.log('Sending test message...');
        websocket.send(JSON.stringify({
            userId: 'test',
            username: 'TestUser',
            message: 'Test message from console',
            timestamp: Math.floor(Date.now() / 1000)
        }));
    } else {
        console.log('WebSocket not connected');
    }
};

window.checkStatus = function() {
    console.log('=== STATUS CHECK ===');
    console.log('WebSocket:', websocket ? websocket.readyState : 'null');
    console.log('Canvas:', canvas ? `${canvas.width}x${canvas.height}` : 'null');
    console.log('Context:', ctx ? 'available' : 'null');
    console.log('Chat container:', document.getElementById('chatMessages') ? 'found' : 'not found');
    console.log('Current user:', currentUser);
    console.log('==================');
};
