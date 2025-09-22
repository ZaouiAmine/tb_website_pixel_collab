const Toolbar = ({ selectedColor, setSelectedColor }) => {
  const colors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080',
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'
  ]

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-4">
      <div className="flex flex-col items-center space-y-3">
        <h3 className="text-white/90 text-sm font-medium">Choose Color</h3>
        <div className="grid grid-cols-5 gap-2">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg ${
                selectedColor === color 
                  ? 'border-white shadow-lg scale-105' 
                  : 'border-white/30 hover:border-white/50'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            >
              <span className="sr-only">{color}</span>
            </button>
          ))}
        </div>
        <div className="text-white/80 text-xs font-mono">
          {selectedColor}
        </div>
      </div>
    </div>
  )
}

export default Toolbar
