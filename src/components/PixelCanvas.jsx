import { useCanvasStore } from '../store/canvasStore'

const PixelCanvas = () => {
  const { 
    pixels, 
    canvasSize, 
    pixelSize, 
    currentColor, 
    isDrawing, 
    setPixel, 
    setIsDrawing 
  } = useCanvasStore()

  const handleMouseDown = (x, y) => {
    setIsDrawing(true)
    setPixel(x, y, currentColor)
  }

  const handleMouseMove = (x, y) => {
    if (isDrawing) {
      setPixel(x, y, currentColor)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div 
        className="grid gap-px border-2 border-gray-300 bg-gray-300"
        style={{
          gridTemplateColumns: `repeat(${canvasSize}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${canvasSize}, ${pixelSize}px)`
        }}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {pixels.map((row, y) =>
          row.map((color, x) => (
            <div
              key={`${x}-${y}`}
              className="cursor-crosshair border border-gray-200 hover:border-gray-400 transition-colors"
              style={{
                backgroundColor: color,
                width: `${pixelSize}px`,
                height: `${pixelSize}px`
              }}
              onMouseDown={() => handleMouseDown(x, y)}
              onMouseMove={() => handleMouseMove(x, y)}
              onMouseEnter={() => {
                if (isDrawing) {
                  handleMouseMove(x, y)
                }
              }}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default PixelCanvas
