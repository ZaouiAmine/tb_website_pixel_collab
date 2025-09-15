import { useRef, useEffect, useState } from 'react'

const PixelCanvas = ({ selectedColor }) => {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [pixels, setPixels] = useState({})
  
  // Canvas dimensions - make it responsive to container
  const PIXEL_SIZE = 8
  const GRID_WIDTH = 90  // 80x80 grid for more pixels
  const GRID_HEIGHT = 90
  const CANVAS_WIDTH = GRID_WIDTH * PIXEL_SIZE
  const CANVAS_HEIGHT = GRID_HEIGHT * PIXEL_SIZE

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Set canvas size
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    
    // Draw grid
    drawGrid(ctx)
    
    // Draw existing pixels
    drawPixels(ctx)
  }, [pixels])

  const drawGrid = (ctx) => {
    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    
    // Draw vertical lines
    for (let x = 0; x <= CANVAS_WIDTH; x += PIXEL_SIZE) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, CANVAS_HEIGHT)
      ctx.stroke()
    }
    
    // Draw horizontal lines
    for (let y = 0; y <= CANVAS_HEIGHT; y += PIXEL_SIZE) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(CANVAS_WIDTH, y)
      ctx.stroke()
    }
  }

  const drawPixels = (ctx) => {
    Object.entries(pixels).forEach(([key, color]) => {
      const [x, y] = key.split(',').map(Number)
      ctx.fillStyle = color
      ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE)
    })
  }

  const getPixelCoordinates = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SIZE)
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SIZE)
    return { x, y }
  }

  const drawPixel = (x, y) => {
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const key = `${x},${y}`
      setPixels(prev => ({
        ...prev,
        [key]: selectedColor
      }))
    }
  }

  const handleMouseDown = (event) => {
    setIsDrawing(true)
    const { x, y } = getPixelCoordinates(event)
    drawPixel(x, y)
  }

  const handleMouseMove = (event) => {
    if (isDrawing) {
      const { x, y } = getPixelCoordinates(event)
      drawPixel(x, y)
    }
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const handleMouseLeave = () => {
    setIsDrawing(false)
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50 overflow-auto p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 shadow-lg cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ 
            imageRendering: 'pixelated',
            maxWidth: '100%',
            maxHeight: '100%'
          }}
        />
        {/* Canvas info overlay */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {GRID_WIDTH}×{GRID_HEIGHT}
        </div>
      </div>
    </div>
  )
}

export default PixelCanvas
