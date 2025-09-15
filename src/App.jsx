import { useState } from 'react'
import PixelCanvas from './components/PixelCanvas'
import ColorPalette from './components/ColorPalette'
import UserManager from './components/UserManager'
import Chat from './components/Chat'
import ConnectionManager from './components/ConnectionManager'
import { useCanvasStore } from './store/canvasStore'

function App() {
  const { 
    clearCanvas, 
    isLoading, 
    error, 
    currentUser,
    isConnected 
  } = useCanvasStore()
  
  const [activeTab, setActiveTab] = useState('users')

  return (
    <ConnectionManager>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              Pixel Collab Game
            </h1>
            <p className="text-gray-600">
              Draw pixels collaboratively! Click and drag to paint.
            </p>
            <div className="flex items-center justify-center mt-2 space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected to server' : 'Disconnected from server'}
              </span>
            </div>
          </header>

          <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
            {/* Canvas Section */}
            <div className="flex-1 max-w-2xl">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-gray-700">Canvas</h2>
                  <button
                    onClick={clearCanvas}
                    disabled={isLoading || !isConnected}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Clearing...' : 'Clear Canvas'}
                  </button>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    {error}
                  </div>
                )}
                
                <PixelCanvas />
              </div>
            </div>

            {/* Controls Section */}
            <div className="w-full lg:w-80 space-y-6">
              {/* User Management */}
              <UserManager />
              
              {/* Color Palette */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <ColorPalette />
              </div>
              
              {/* Chat and Users Tabs */}
              <div className="bg-white rounded-lg shadow-lg">
                <div className="border-b border-gray-200">
                  <nav className="flex">
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'users'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Users
                    </button>
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-4 py-2 text-sm font-medium ${
                        activeTab === 'chat'
                          ? 'text-blue-600 border-b-2 border-blue-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Chat
                    </button>
                  </nav>
                </div>
                
                <div className="p-6">
                  {activeTab === 'chat' ? (
                    <Chat />
                  ) : (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-4">
                        Online Users
                      </h3>
                      <p className="text-sm text-gray-600">
                        Join the game to see other users and start collaborating!
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Instructions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  How to Play
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Join the game with your username</li>
                  <li>• Select a color from the palette</li>
                  <li>• Click and drag on the canvas to draw</li>
                  <li>• Chat with other players in real-time</li>
                  <li>• See other players' drawings instantly</li>
                  <li>• Clear canvas to start over</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ConnectionManager>
  )
}

export default App