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
  const { currentUser, isConnected, setCurrentUser, messages } = useGameStore();
  const [showLogin, setShowLogin] = useState(!currentUser);
  const [activePanel, setActivePanel] = useState<'users' | 'chat' | 'stats'>('users');
  const [unreadCount, setUnreadCount] = useState(0);

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
        taubyteService.connect().catch(error => {
          console.error('Failed to connect:', error);
        });
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('pixel_collab_user');
      }
    }
  }, [setCurrentUser]);

  useEffect(() => {
    if (currentUser) {
      setShowLogin(false);
    }
  }, [currentUser]);

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
    
    useGameStore.getState().setCurrentUser(null);
    useGameStore.getState().reset();
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
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-pixel-text font-pixel hidden sm:inline">
                Welcome, {currentUser.username}!
              </span>
              <span className="text-xs text-pixel-text font-pixel sm:hidden">
                {currentUser.username}
              </span>
              <button
                onClick={handleLogout}
                className="pixel-button text-xs px-2 sm:px-4 py-1 sm:py-2"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-3 sm:py-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6 h-full">
          {/* Center - Canvas */}
          <div className="lg:col-span-2 min-w-0 order-1 lg:order-1">
            <div className="pixel-card h-full">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h2 className="font-pixel text-base sm:text-lg text-pixel-text">Canvas</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-pixel-text">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <div className="w-full overflow-hidden flex-1">
                <PixelCanvas className="w-full h-full" />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tools, Colors, Users, Chat, Stats */}
          <div className="lg:col-span-1 min-w-0 space-y-3 sm:space-y-4 order-2 lg:order-2">
            {/* Tools and Colors */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <ColorPicker />
              <ToolSelector />
            </div>

            {/* Panel Tabs */}
            <div className="flex border-b border-pixel-border">
              <button
                onClick={() => setActivePanel('users')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-pixel transition-colors ${
                  activePanel === 'users'
                    ? 'text-pixel-accent border-b-2 border-pixel-accent'
                    : 'text-pixel-text hover:text-pixel-accent'
                }`}
              >
                <Users className="w-3 h-3" />
                Players
              </button>
              <button
                onClick={() => setActivePanel('chat')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-pixel transition-colors relative ${
                  activePanel === 'chat'
                    ? 'text-pixel-accent border-b-2 border-pixel-accent'
                    : 'text-pixel-text hover:text-pixel-accent'
                }`}
              >
                <MessageCircle className="w-3 h-3" />
                Chat
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActivePanel('stats')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs font-pixel transition-colors ${
                  activePanel === 'stats'
                    ? 'text-pixel-accent border-b-2 border-pixel-accent'
                    : 'text-pixel-text hover:text-pixel-accent'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Stats
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 min-h-0">
              {activePanel === 'users' && <UserList />}
              {activePanel === 'chat' && <Chat />}
              {activePanel === 'stats' && <GameStats />}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-pixel-border bg-pixel-canvas flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-xs text-pixel-text opacity-75">
            <div className="flex items-center gap-4">
              <span>Pixel Collab Game v1.0</span>
              <span>•</span>
              <span>Real-time collaboration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span>{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;