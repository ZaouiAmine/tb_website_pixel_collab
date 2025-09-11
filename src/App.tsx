import { useEffect, useState } from 'react';
import { useGameStore } from './store/gameStore';
import { taubyteService } from './services/taubyteService';
import type { User } from './types/game';

// Components
import PixelCanvas from './components/PixelCanvas';
import Chat from './components/Chat';
import UserList from './components/UserList';
import LoginModal from './components/LoginModal';
import ColorPicker from './components/ColorPicker';
import ToolSelector from './components/ToolSelector';
import GameStats from './components/GameStats';

function App() {
  const { 
    activePanel, 
    setActivePanel, 
    isConnected, 
    setIsConnected,
    messages 
  } = useGameStore();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ff0000');
  const [unreadCount, setUnreadCount] = useState(0);

  // Initialize connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        await taubyteService.connect();
        setIsConnected(true);
      } catch (error) {
        console.error('Failed to connect:', error);
        setIsConnected(false);
      }
    };

    initializeConnection();

    return () => {
      taubyteService.disconnect();
    };
  }, [setIsConnected]);

  // Handle user authentication
  useEffect(() => {
    const savedUser = localStorage.getItem('pixelCollabUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        taubyteService.setCurrentUser(user);
        taubyteService.updateUserStatus(true);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('pixelCollabUser');
      }
    }
  }, []);

  // Track unread messages
  useEffect(() => {
    if (activePanel !== 'chat' && messages.length > 0) {
      setUnreadCount(prev => prev + 1);
    } else if (activePanel === 'chat') {
      setUnreadCount(0);
    }
  }, [messages, activePanel]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    taubyteService.setCurrentUser(user);
    taubyteService.updateUserStatus(true);
    localStorage.setItem('pixelCollabUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    if (currentUser) {
      taubyteService.updateUserStatus(false);
    }
    setCurrentUser(null);
    taubyteService.setCurrentUser(null);
    localStorage.removeItem('pixelCollabUser');
  };

  const handlePixelClick = (x: number, y: number) => {
    if (currentUser) {
      taubyteService.placePixel(x, y, selectedColor);
    }
  };

  const handleSendMessage = (message: string) => {
    taubyteService.sendMessage(message);
  };

  const handleResetCanvas = async () => {
    if (window.confirm('Are you sure you want to reset the canvas? This action cannot be undone.')) {
      try {
        await taubyteService.resetCanvas();
        window.location.reload(); // Reload to get fresh canvas
      } catch (error) {
        console.error('Failed to reset canvas:', error);
        alert('Failed to reset canvas. Please try again.');
      }
    }
  };

  if (!currentUser) {
    return <LoginModal onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">Pixel Collab</h1>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {currentUser.username}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Canvas Area */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              {/* Canvas Controls */}
              <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                <div className="flex items-center space-x-4">
                  <ColorPicker 
                    selectedColor={selectedColor} 
                    onColorChange={setSelectedColor} 
                  />
                  <ToolSelector />
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleResetCanvas}
                    className="px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Reset Canvas
                  </button>
                </div>
              </div>

              {/* Canvas */}
              <div className="border rounded-lg overflow-hidden">
                <PixelCanvas onPixelClick={handlePixelClick} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Game Stats */}
              <GameStats />

              {/* Navigation Tabs */}
              <div className="bg-white rounded-lg shadow">
                <div className="flex border-b">
                  <button
                    onClick={() => setActivePanel('canvas')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      activePanel === 'canvas'
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Canvas
                  </button>
                  <button
                    onClick={() => setActivePanel('chat')}
                    className={`flex-1 px-4 py-2 text-sm font-medium relative ${
                      activePanel === 'chat'
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Chat
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActivePanel('users')}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${
                      activePanel === 'users'
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Users
                  </button>
                </div>

                <div className="p-4">
                  {activePanel === 'chat' && (
                    <Chat 
                      onSendMessage={handleSendMessage}
                      currentUser={currentUser}
                    />
                  )}
                  {activePanel === 'users' && <UserList />}
                  {activePanel === 'canvas' && (
                    <div className="text-center text-gray-500 py-8">
                      <p>Canvas view is active</p>
                      <p className="text-sm mt-2">Click on the canvas above to place pixels</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;