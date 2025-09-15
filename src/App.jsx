import { useState } from 'react'
import PixelCanvas from './components/PixelCanvas'
import Chat from './components/Chat'
import Toolbar from './components/Toolbar'
import { usePixelGame } from './hooks/usePixelGame'

function App() {
  const [selectedColor, setSelectedColor] = useState('#000000')
  const { pixels, messages, placePixel, sendMessage, isLoading } = usePixelGame()

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
            Pixel Collab Game
          </h1>
          <p className="text-gray-300 text-sm mt-1">Collaborate with others to create pixel art together</p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
          {/* Canvas Area */}
          <div className="lg:col-span-3 flex flex-col">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4 flex-1 flex flex-col">
              <div className="mb-4">
                <Toolbar 
                  selectedColor={selectedColor}
                  setSelectedColor={setSelectedColor}
                />
              </div>
              <div className="flex-1 bg-white rounded-lg shadow-inner overflow-hidden">
                <PixelCanvas 
                  selectedColor={selectedColor}
                  pixels={pixels}
                  onPixelPlace={placePixel}
                />
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 h-full">
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
