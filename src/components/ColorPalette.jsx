import { useCanvasStore } from '../store/canvasStore'

const ColorPalette = () => {
  const { currentColor, setCurrentColor } = useCanvasStore()

  const colors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
    '#ffc0cb', '#a52a2a', '#808080', '#008000', '#000080'
  ]

  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-lg font-semibold text-gray-700">Color Palette</h3>
      <div className="grid grid-cols-5 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            className={`w-10 h-10 rounded border-2 transition-all hover:scale-110 ${
              currentColor === color 
                ? 'border-gray-800 shadow-lg ring-2 ring-gray-300' 
                : 'border-gray-300 hover:border-gray-500'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => setCurrentColor(color)}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Current:</span>
        <div 
          className="w-8 h-8 border-2 border-gray-400 rounded"
          style={{ backgroundColor: currentColor }}
        />
        <span className="text-sm font-mono text-gray-500">{currentColor}</span>
      </div>
    </div>
  )
}

export default ColorPalette
