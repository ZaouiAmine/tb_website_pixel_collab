import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

interface PixelCanvasProps {
  onPixelClick: (x: number, y: number) => void;
}

const CANVAS_SIZE = 100;
const PIXEL_SIZE = 8;

const PixelCanvas: React.FC<PixelCanvasProps> = ({ onPixelClick }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { canvas } = useGameStore();

  useEffect(() => {
    drawCanvas();
  }, [canvas]);

  const drawCanvas = () => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // Draw pixels
    if (canvas && canvas.length > 0) {
      canvas.forEach((row, y) => {
        row.forEach((pixel, x) => {
          if (pixel.color && pixel.color !== '#ffffff') {
            ctx.fillStyle = pixel.color;
            ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
          }
        });
      });
    }

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    for (let i = 0; i <= CANVAS_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * PIXEL_SIZE, 0);
      ctx.lineTo(i * PIXEL_SIZE, CANVAS_SIZE * PIXEL_SIZE);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, i * PIXEL_SIZE);
      ctx.lineTo(CANVAS_SIZE * PIXEL_SIZE, i * PIXEL_SIZE);
      ctx.stroke();
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    const rect = canvasElement.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / PIXEL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / PIXEL_SIZE);

    if (x >= 0 && x < CANVAS_SIZE && y >= 0 && y < CANVAS_SIZE) {
      onPixelClick(x, y);
    }
  };

  return (
    <div className="flex justify-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE * PIXEL_SIZE}
        height={CANVAS_SIZE * PIXEL_SIZE}
        onClick={handleCanvasClick}
        className="cursor-crosshair border border-gray-300 bg-white"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
};

export default PixelCanvas;