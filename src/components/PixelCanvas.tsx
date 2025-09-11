import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { taubyteService } from '../services/taubyteService';
import { throttle } from '../utils/helpers';

interface PixelCanvasProps {
  className?: string;
}

export const PixelCanvas: React.FC<PixelCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPixel, setLastPixel] = useState<{ x: number; y: number } | null>(null);
  
  const {
    canvas,
    selectedColor,
    selectedTool,
    pixelSize,
    currentUser
  } = useGameStore();

  const canPlacePixel = !!currentUser;

  // Memoize canvas size calculation for performance
  const canvasDimensions = useMemo(() => {
    const { canvasSize } = useGameStore.getState();
    const maxWidth = 800;
    const calculatedPixelSize = Math.min(pixelSize, Math.floor(maxWidth / canvasSize.width));
    return {
      width: canvasSize.width * calculatedPixelSize,
      height: canvasSize.height * calculatedPixelSize,
      pixelSize: calculatedPixelSize
    };
  }, [pixelSize]);

  const drawCanvas = useCallback(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    const { canvasSize } = useGameStore.getState();
    
    // Set canvas size
    canvasElement.width = canvasDimensions.width;
    canvasElement.height = canvasDimensions.height;

    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw pixels with optimized rendering
    ctx.save();
    for (let y = 0; y < canvasSize.height; y++) {
      for (let x = 0; x < canvasSize.width; x++) {
        const pixel = canvas[y]?.[x];
        if (pixel && pixel.userId) {
          ctx.fillStyle = pixel.color;
          ctx.fillRect(x * canvasDimensions.pixelSize, y * canvasDimensions.pixelSize, canvasDimensions.pixelSize, canvasDimensions.pixelSize);
        }
      }
    }
    ctx.restore();

    // Draw grid with optimized rendering
    ctx.save();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Draw vertical lines
    ctx.beginPath();
    for (let x = 0; x <= canvasSize.width; x++) {
      const xPos = x * canvasDimensions.pixelSize;
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvasElement.height);
    }
    ctx.stroke();
    
    // Draw horizontal lines
    ctx.beginPath();
    for (let y = 0; y <= canvasSize.height; y++) {
      const yPos = y * canvasDimensions.pixelSize;
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvasElement.width, yPos);
    }
    ctx.stroke();
    ctx.restore();
  }, [canvas, canvasDimensions]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getPixelCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return null;

    const rect = canvasElement.getBoundingClientRect();
    const { canvasSize } = useGameStore.getState();
    
    const x = Math.floor((event.clientX - rect.left) / canvasDimensions.pixelSize);
    const y = Math.floor((event.clientY - rect.top) / canvasDimensions.pixelSize);
    
    if (x >= 0 && x < canvasSize.width && y >= 0 && y < canvasSize.height) {
      return { x, y };
    }
    return null;
  }, [canvasDimensions.pixelSize]);

  // Throttled pixel placement for performance
  const throttledPixelPlace = useMemo(
    () => throttle((x: number, y: number) => {
      if (!canPlacePixel || !currentUser) return;

      let color = selectedColor;
      if (selectedTool === 'eraser') {
        color = '#ffffff';
      }

      // Update local state immediately for responsiveness
      useGameStore.getState().updatePixel(x, y, color, currentUser.id);
      
      // Send to server
      taubyteService.placePixel(x, y, color).catch(error => {
        console.error('Failed to place pixel:', error);
      });
    }, 16), // ~60fps throttling
    [canPlacePixel, currentUser, selectedColor, selectedTool, currentUserData]
  );

  const handlePixelPlace = (x: number, y: number) => {
    throttledPixelPlace(x, y);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getPixelCoordinates(event);
    if (!coords) return;

    setIsDrawing(true);
    setLastPixel(coords);
    handlePixelPlace(coords.x, coords.y);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const coords = getPixelCoordinates(event);
    if (!coords || !lastPixel) return;

    // Only place pixel if it's different from the last one
    if (coords.x !== lastPixel.x || coords.y !== lastPixel.y) {
      setLastPixel(coords);
      handlePixelPlace(coords.x, coords.y);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setLastPixel(null);
  };

  const handleMouseLeave = () => {
    setIsDrawing(false);
    setLastPixel(null);
  };

  // Touch event handlers for mobile support
  const handleTouchStart = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const touch = event.touches[0];
    const coords = getPixelCoordinates({
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as React.MouseEvent<HTMLCanvasElement>);
    
    if (!coords) return;
    
    setIsDrawing(true);
    setLastPixel(coords);
    handlePixelPlace(coords.x, coords.y);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    if (!isDrawing) return;

    const touch = event.touches[0];
    const coords = getPixelCoordinates({
      clientX: touch.clientX,
      clientY: touch.clientY,
    } as React.MouseEvent<HTMLCanvasElement>);
    
    if (!coords || !lastPixel) return;

    // Only place pixel if it's different from the last one
    if (coords.x !== lastPixel.x || coords.y !== lastPixel.y) {
      setLastPixel(coords);
      handlePixelPlace(coords.x, coords.y);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDrawing(false);
    setLastPixel(null);
  };

  return (
    <div className={`canvas-container ${className}`}>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          className="pixel-grid cursor-crosshair select-none block touch-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            imageRendering: 'pixelated',
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none',
          }}
        />
      </div>
      
    </div>
  );
};

