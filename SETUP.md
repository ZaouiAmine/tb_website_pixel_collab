# Frontend Setup for Pixel Collab Game

## 🚀 Quick Start

1. **Update API Configuration**
   - Open `src/config/api.js`
   - Replace `'https://your-taubyte-domain.com'` with your actual Taubyte domain

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### API Configuration
Update the API base URL in `src/config/api.js`:

```javascript
export const API_CONFIG = {
  BASE_URL: 'https://your-actual-taubyte-domain.com', // Replace this!
  // ... rest of config
}
```

### Environment Variables (Alternative)
You can also use environment variables:

1. Create a `.env` file in the frontend root:
   ```
   REACT_APP_API_URL=https://your-actual-taubyte-domain.com
   ```

2. Update `src/config/api.js`:
   ```javascript
   BASE_URL: process.env.REACT_APP_API_URL || 'https://your-taubyte-domain.com',
   ```

## 📡 Backend Integration

The frontend now connects to your Taubyte backend with the following features:

### ✅ **Real-time Features**
- **Live Pixel Drawing**: See other players' drawings instantly
- **User Management**: Join/leave game with username
- **Real-time Chat**: Chat with other players
- **Connection Status**: Visual indicator of server connection

### 🔌 **API Endpoints Used**
- `GET /api/getCanvas` - Load canvas state
- `POST /api/placePixel` - Place a pixel
- `POST /api/initCanvas` - Clear canvas
- `GET /api/getWebSocketURL` - Get WebSocket URL
- `GET /api/getUsers` - Get online users
- `POST /api/joinGame` - Join the game
- `POST /api/leaveGame` - Leave the game
- `GET /api/getMessages` - Get chat messages
- `POST /api/sendMessage` - Send chat message

### 🌐 **WebSocket Channels**
- `pixelupdates` - Real-time pixel drawing
- `userupdates` - User join/leave events
- `chatmessages` - Real-time chat
- `canvasupdates` - Canvas-wide updates (clear)

## 🎮 **How to Use**

1. **Join the Game**
   - Enter your username
   - Click "Join Game"

2. **Draw Pixels**
   - Select a color from the palette
   - Click and drag on the canvas
   - See your changes in real-time

3. **Chat**
   - Switch to the "Chat" tab
   - Type messages and send them
   - See messages from other players

4. **Collaborate**
   - See other players' drawings appear instantly
   - Chat with other players
   - See who's online

## 🛠 **Development**

### Project Structure
```
src/
├── components/
│   ├── PixelCanvas.jsx      # Drawing canvas
│   ├── ColorPalette.jsx     # Color selection
│   ├── UserManager.jsx      # User join/leave
│   ├── Chat.jsx             # Chat system
│   └── ConnectionManager.jsx # WebSocket management
├── services/
│   ├── api.js               # Backend API calls
│   └── websocket.js         # WebSocket connection
├── store/
│   └── canvasStore.js       # Zustand state management
├── config/
│   └── api.js               # API configuration
└── App.jsx                  # Main app component
```

### Key Features
- **Optimistic Updates**: UI updates immediately, then syncs with backend
- **Error Handling**: Graceful error handling with user feedback
- **Auto-reconnection**: WebSocket automatically reconnects on disconnect
- **Responsive Design**: Works on desktop and mobile
- **Real-time Collaboration**: Multiple users can draw simultaneously

## 🚨 **Troubleshooting**

### Connection Issues
- Check that your Taubyte domain is correct in `src/config/api.js`
- Verify your Taubyte backend is deployed and running
- Check browser console for error messages

### WebSocket Issues
- Ensure WebSocket channels are properly configured in Taubyte
- Check that the `getWebSocketURL` endpoint returns a valid URL
- Verify CORS settings if running locally

### API Issues
- Check that all required databases and channels are created in Taubyte
- Verify API endpoints match your backend function names
- Check network tab in browser dev tools for failed requests

## 📝 **Notes**

- The app generates a unique user ID for each session
- Pixel updates are sent to the backend immediately for real-time collaboration
- Chat messages are limited to the last 100 messages
- Canvas is automatically loaded when the app starts
- Users are marked as offline when they leave the game
