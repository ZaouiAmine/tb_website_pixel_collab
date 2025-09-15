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
    
    // Load canvas first, then connect WebSocket
    setTimeout(() => {
        loadCanvas();
        connectWebSocket();
        addChatMessage('System', 'Welcome to the pixel collaboration game!');
    }, 100);
});

// Canvas initialization
function initializeCanvas() {
    canvas = document.getElementById('pixelCanvas');
    ctx = canvas.getContext('2d');
    
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
            
            websocket.send(JSON.stringify({
                type: 'pixel',
                data: pixel
            }));
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
        const data = await response.json();
        
        const wsPath = data.websocket_url;
        let wsURL;
        if (baseURL.startsWith('https://')) {
            wsURL = baseURL.replace('https://', 'wss://') + '/' + wsPath;
        } else {
            wsURL = baseURL.replace('http://', 'ws://') + '/' + wsPath;
        }
        
        websocket = new WebSocket(wsURL);
        
        websocket.onopen = function() {
            updateStatus('connected', 'Connected');
            
            // Load fresh data when connected
            loadUsers();
            loadMessages();
            
            // Send user profile to backend when connected
            if (currentUser.username) {
                websocket.send(JSON.stringify({
                    type: 'user',
                    data: {
                        id: currentUser.id,
                        username: currentUser.username,
                        color: currentUser.color,
                        online: true
                    }
                }));
            }
        };
        
        websocket.onmessage = function(event) {
            if (event.data instanceof Blob) {
                event.data.text().then(text => {
                    try {
                        const message = JSON.parse(text);
                        handleWebSocketMessage(message);
                    } catch (e) {
                        console.log('Non-JSON blob message:', text);
                    }
                });
            } else {
                try {
                    const message = JSON.parse(event.data);
                    handleWebSocketMessage(message);
                } catch (e) {
                    console.log('Non-JSON text message:', event.data);
                }
            }
        };
        
        websocket.onclose = function() {
            updateStatus('disconnected', 'Disconnected');
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

function handleWebSocketMessage(message) {
    if (message.type === 'pixel') {
        const pixel = message.data;
        ctx.fillStyle = pixel.color;
        ctx.fillRect(pixel.x * 5, pixel.y * 5, 5, 5);
    } else if (message.type === 'user') {
        loadUsers();
    } else if (message.type === 'message') {
        const chatMessage = message.data;
        addChatMessage(chatMessage.username, chatMessage.message, new Date(chatMessage.timestamp * 1000));
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
        await fetch(`${baseURL}/api/resetCanvas`);
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
            // If backend returns error, just show empty users list
            const usersList = document.getElementById('usersList');
            usersList.innerHTML = '<div class="user-item">No users online</div>';
            return;
        }
        
        const users = await response.json();
        
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        if (users && users.length > 0) {
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.className = 'user-item';
                userDiv.innerHTML = `
                    <div class="user-color" style="background-color: ${user.color}"></div>
                    <span class="user-name">${user.username}</span>
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
        usersList.innerHTML = '<div class="user-item">No users online</div>';
    }
}

async function loadMessages() {
    try {
        const response = await fetch(`${baseURL}/api/getMessages`);
        
        if (!response.ok) {
            return; // Just skip if messages endpoint fails
        }
        
        const messages = await response.json();
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (messages && messages.length > 0) {
            messages.forEach(message => {
                addChatMessage(message.username, message.message, new Date(message.timestamp * 1000));
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
        
        websocket.send(JSON.stringify({
            type: 'message',
            data: chatMessage
        }));
        
        addChatMessage(currentUser.username, message);
        chatInput.value = '';
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function addChatMessage(username, message, timestamp = new Date()) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message';
    messageDiv.innerHTML = `
        <div class="message-header">${username}</div>
        <div class="message-content">${message}</div>
        <div class="message-time">${timestamp.toLocaleTimeString()}</div>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
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
            websocket.send(JSON.stringify({
                type: 'user',
                data: {
                    id: currentUser.id,
                    username: currentUser.username,
                    color: currentUser.color,
                    online: true
                }
            }));
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
});
