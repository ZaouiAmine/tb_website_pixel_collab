import { useState, useEffect, useRef } from 'react'

const Toolbar = ({ selectedColor, setSelectedColor }) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const colorPickerRef = useRef(null)
  
  const predefinedColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3">
      <div className="flex items-center justify-center">
        {/* Color Picker */}
        <div className="relative" ref={colorPickerRef}>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="w-12 h-12 rounded-lg border-2 border-white/30 shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: selectedColor }}
          >
            <span className="sr-only">Color picker</span>
          </button>
          
          {showColorPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Choose Color</h3>
                  <button
                    onClick={() => setShowColorPicker(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Predefined Colors Grid */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Quick Colors</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color)
                          setShowColorPicker(false)
                        }}
                        className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                          selectedColor === color 
                            ? 'border-gray-800 shadow-lg scale-105' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        <span className="sr-only">{color}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Color Picker */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-600 mb-3">Custom Color</h4>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
                    />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Current Color Display */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-600">Current Color:</span>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-8 h-8 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: selectedColor }}
                    ></div>
                    <span className="text-sm font-mono text-gray-600">{selectedColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Toolbar
