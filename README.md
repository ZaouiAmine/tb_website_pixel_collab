# Pixel Collab Game

A real-time collaborative pixel art game built with React, TypeScript, and WebSocket technology. Multiple players can draw together on a shared canvas, chat with each other, and see real-time updates.

## Features

### 🎨 **Real-time Pixel Collaboration**
- Multiple players can draw simultaneously on a shared canvas
- Real-time synchronization of pixel updates across all clients
- Pixel-perfect drawing with customizable pixel sizes

### 🛠️ **Drawing Tools**
- **Pencil**: Draw individual pixels
- **Eraser**: Remove pixels (set to white)
- **Eyedropper**: Pick colors from existing pixels (planned)
- **Bucket**: Fill areas with color (planned)

### 🎨 **Color System**
- 32 preset colors for quick selection
- Custom color picker with hex input
- Color preview and current selection display

### 👥 **User Management**
- Real-time user list showing online players
- User statistics (pixels placed, cooldown status)
- Visual indicators for user status and activity

### 💬 **Chat System**
- Real-time chat with other players
- Message history and timestamps
- System messages for user join/leave events

### 📊 **Game Statistics**
- Canvas usage statistics
- Individual player progress tracking
- Cooldown timers and pixel limits
- Real-time progress bars

### ⚙️ **Game Mechanics**
- **Cooldown System**: Prevents spam by limiting pixel placement frequency
- **Pixel Limits**: Each user has a maximum number of pixels they can place
- **User Authentication**: Simple username-based system
- **Connection Management**: Automatic reconnection and error handling

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS with custom pixel-art theme
- **State Management**: Zustand
- **Real-time Communication**: Socket.IO Client
- **Icons**: Lucide React
- **Canvas API**: HTML5 Canvas for pixel rendering

## Project Structure

```
src/
├── components/          # React components
│   ├── PixelCanvas.tsx     # Main drawing canvas
│   ├── ColorPicker.tsx     # Color selection interface
│   ├── ToolSelector.tsx    # Drawing tools
│   ├── UserList.tsx        # Online players list
│   ├── Chat.tsx            # Chat interface
│   ├── GameStats.tsx       # Statistics display
│   └── LoginModal.tsx      # User authentication
├── store/              # State management
│   └── gameStore.ts        # Zustand store
├── services/           # External services
│   └── socketService.ts    # WebSocket communication
├── hooks/              # Custom React hooks
│   └── useGameConnection.ts # Connection management
├── types/              # TypeScript definitions
│   └── game.ts             # Game-related types
├── utils/              # Utility functions
│   ├── constants.ts        # Game configuration
│   └── helpers.ts          # Helper functions
└── App.tsx             # Main application component
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open your browser** and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### Game Settings

Modify `src/utils/constants.ts` to adjust:
- Canvas dimensions
- Pixel size
- Cooldown times
- User limits
- Color palettes

## Backend Integration

This frontend is designed to work with a WebSocket-based backend. The expected backend should handle:

### WebSocket Events

**Client to Server:**
- `joinGame` - User joins the game
- `leaveGame` - User leaves the game
- `placePixel` - Place a pixel on the canvas
- `chatMessage` - Send a chat message
- `requestCanvasState` - Request current canvas state

**Server to Client:**
- `pixelUpdate` - Pixel placed by any user
- `userJoin` - New user joined
- `userLeave` - User left
- `chatMessage` - Chat message from any user
- `canvasState` - Full canvas state
- `error` - Error messages

### Data Structures

See `src/types/game.ts` for complete type definitions.

## Game Features in Detail

### Canvas System
- Configurable canvas size (default: 100x100 pixels)
- Pixel-perfect rendering with customizable pixel size
- Real-time synchronization across all clients
- Grid overlay for better precision

### User System
- Simple username-based authentication
- Automatic user ID generation
- User color assignment for identification
- Online/offline status tracking

### Drawing System
- Multiple drawing tools (pencil, eraser, etc.)
- Color picker with presets and custom colors
- Cooldown system to prevent spam
- Pixel limits per user

### Chat System
- Real-time messaging
- User identification in messages
- Message history
- System notifications

### Statistics
- Real-time canvas usage tracking
- Individual user progress
- Cooldown timers
- Connection status

## Customization

### Styling
The game uses Tailwind CSS with a custom pixel-art theme. Modify `tailwind.config.js` to change:
- Color scheme
- Fonts
- Animations
- Component styles

### Game Mechanics
Adjust game parameters in `src/utils/constants.ts`:
- Canvas dimensions
- Cooldown times
- Pixel limits
- Color palettes

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Future Enhancements

- [ ] Undo/Redo functionality
- [ ] Canvas history and snapshots
- [ ] User profiles and achievements
- [ ] Multiple canvas rooms
- [ ] Image import/export
- [ ] Advanced drawing tools (shapes, lines)
- [ ] Mobile touch support
- [ ] Offline mode with sync
- [ ] Admin controls and moderation
- [ ] Performance optimizations for large canvases
