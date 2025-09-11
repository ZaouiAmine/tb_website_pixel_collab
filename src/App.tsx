import { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { taubyteService } from './services/taubyteService';
import { PixelCanvas } from './components/PixelCanvas';
import { ColorPicker } from './components/ColorPicker';
import { ToolSelector } from './components/ToolSelector';
import { UserList } from './components/UserList';
import { Chat } from './components/Chat';
import { GameStats } from './components/GameStats';
import { LoginModal } from './components/LoginModal';
import { Gamepad2, Users, MessageCircle, BarChart3 } from 'lucide-react';

function App() {
  const { 
    currentUser, 
    isConnected, 
    setCurrentUser, 
    setConnected,
    messages,
    reset 
  } = useGameStore();
  
  const [showLogin, setShowLogin] = useState(!currentUser);
  const [activePanel, setActivePanel] = useState<'users' | 'chat' | 'stats'>('users');
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize service with store
  useEffect(() => {
    taubyteService.setGameStore(useGameStore);
  }, []);

  // Check for saved user on app startup
  useEffect(() => {
    const savedUser = localStorage.getItem('pixel_collab_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setShowLogin(false);
        
        // Set current user in service and connect
        taubyteService.setCurrentUser(user);
        taubyteService.connect().then(() => {
          setConnected(true);
        }).catch(error => {
          console.error('Failed to connect:', error);
          setConnected(false);
        });
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('pixel_collab_user');
      }
    }
  }, [setCurrentUser, setConnected]);

  // Track unread messages
  useEffect(() => {
    if (activePanel === 'chat') {
      setUnreadCount(0);
    }
  }, [activePanel]);

  useEffect(() => {
    if (activePanel !== 'chat' && messages.length > 0) {
      setUnreadCount(prev => prev + 1);
    }
  }, [messages, activePanel]);

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('pixel_collab_user');
    
    // Disconnect the service
    taubyteService.disconnect();
    
    // Reset store
    reset();
    setShowLogin(true);
  };

  if (!currentUser) {
    return <LoginModal isOpen={showLogin} onClose={() => setShowLogin(false)} />;
  }

  return (
    <div className="min-h-screen bg-pixel-bg text-pixel-text flex flex-col">
      {/* Header */}
      <header className="border-b border-pixel-border bg-pixel-canvas flex-shrink-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-pixel-accent" />
              <h1 className="font-pixel text-lg sm:text-xl text-pixel-text">
                <span className="hidden sm:inline">Pixel Collab Game</span>
                <span className="sm:hidden">Pixel Collab</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-pixel-text/70 hidden sm:inline">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              {/* User Info */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-pixel-border"
                  style={{ backgroundColor: currentUser.color }}
                />
                <span className="text-sm font-medium text-pixel-text hidden sm:inline">
                  {currentUser.username}
                </span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs bg-pixel-accent text-white rounded hover:bg-pixel-accent/80 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Tools */}
        <div className="w-16 sm:w-20 bg-pixel-canvas border-r border-pixel-border flex flex-col items-center py-4 gap-4">
          <ColorPicker />
          <ToolSelector />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-4 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <PixelCanvas />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Panels */}
        <div className="w-64 sm:w-80 bg-pixel-canvas border-l border-pixel-border flex flex-col">
          {/* Panel Tabs */}
          <div className="flex border-b border-pixel-border">
            <button
              onClick={() => setActivePanel('users')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                activePanel === 'users'
                  ? 'bg-pixel-accent text-white'
                  : 'text-pixel-text hover:bg-pixel-bg'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </button>
            
            <button
              onClick={() => setActivePanel('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors relative ${
                activePanel === 'chat'
                  ? 'bg-pixel-accent text-white'
                  : 'text-pixel-text hover:bg-pixel-bg'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Chat</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActivePanel('stats')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
                activePanel === 'stats'
                  ? 'bg-pixel-accent text-white'
                  : 'text-pixel-text hover:bg-pixel-bg'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {activePanel === 'users' && <UserList />}
            {activePanel === 'chat' && <Chat />}
            {activePanel === 'stats' && <GameStats />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;