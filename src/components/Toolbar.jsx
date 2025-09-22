import { useState } from 'react'

const Toolbar = ({ selectedColor, setSelectedColor }) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  
  const predefinedColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080'
  ]

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3">
      <div className="flex items-center justify-center">
        {/* Color Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-12 h-12 rounded-lg border-2 border-white/30 shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: selectedColor }}
          >
            <span className="sr-only">Color picker</span>
          </button>
          
          {showColorPicker && (
            <div className="absolute top-14 left-1/2 transform -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 p-3 z-10">
              <div className="grid grid-cols-5 gap-2 mb-3">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color)
                      setShowColorPicker(false)
                    }}
                    className={`w-6 h-6 rounded border transition-transform hover:scale-110 ${
                      selectedColor === color ? 'border-white' : 'border-white/30'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    <span className="sr-only">{color}</span>
                  </button>
                ))}
              </div>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full h-6 rounded border border-white/30 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Toolbar
