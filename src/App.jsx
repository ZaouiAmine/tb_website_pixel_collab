import { useState } from 'react'
import PixelCanvas from './components/PixelCanvas'
import Chat from './components/Chat'
import Toolbar from './components/Toolbar'
import { usePixelGame } from './hooks/usePixelGame'

function App() {
  const [selectedColor, setSelectedColor] = useState('#000000')
  const { pixels, messages, placePixel, sendMessage, clearCanvas, clearChat, isLoading } = usePixelGame()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Pixel Collab Game...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🎨</span>
            Pixel Collab Game v3
          </h1>
          <p className="text-gray-300 text-sm mt-1">Collaborate with others to create pixel art together</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Canvas Area */}
          <div className="lg:col-span-3 flex flex-col order-1 lg:order-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 flex-1 flex flex-col min-h-0 max-h-[55vh] lg:max-h-none">
              <div className="mb-4 flex gap-4">
                <Toolbar 
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                />
                <div className="flex gap-2">
                  <button
                    onClick={clearCanvas}
                    className="bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 px-3 py-2 rounded-lg border border-red-400/30 hover:border-red-400/50 transition-all duration-200 text-sm font-medium"
                    title="Clear Canvas"
                  >
                    🗑️ Clear Canvas
                  </button>
                  <button
                    onClick={clearChat}
                    className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 hover:text-orange-100 px-3 py-2 rounded-lg border border-orange-400/30 hover:border-orange-400/50 transition-all duration-200 text-sm font-medium"
                    title="Clear Chat"
                  >
                    💬 Clear Chat
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white rounded-lg shadow-inner overflow-hidden min-h-0">
                <PixelCanvas 
                  selectedColor={selectedColor}
                  pixels={pixels}
                  onPixelPlace={placePixel}
                />
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-1 flex flex-col order-2 lg:order-2 min-h-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 h-full min-h-[250px] max-h-[45vh] lg:min-h-0 lg:max-h-none flex flex-col">
              <Chat 
                messages={messages}
                onSendMessage={sendMessage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
