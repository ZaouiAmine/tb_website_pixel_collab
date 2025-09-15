import { useState, useCallback } from 'react';

export function useCanvas() {
  const [canvas, setCanvas] = useState(null);
  const [ctx, setCtx] = useState(null);

  const initializeCanvas = useCallback(() => {
    const canvasElement = document.getElementById('pixelCanvas');
    if (canvasElement) {
      const canvasCtx = canvasElement.getContext('2d');
      setCanvas(canvasElement);
      setCtx(canvasCtx);
      console.log('Canvas initialized successfully:', canvasElement.width, 'x', canvasElement.height);
    }
  }, []);

  const loadCanvas = useCallback(async () => {
    try {
      const response = await fetch(`${window.location.origin}/api/getCanvas`);
      
      if (!response.ok) {
        console.error('Failed to load canvas:', response.status);
        return;
      }
      
      const canvasData = await response.json();
      
      // Clear canvas
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw canvas data
        if (canvasData && Array.isArray(canvasData)) {
          canvasData.forEach((row, y) => {
            if (Array.isArray(row)) {
              row.forEach((pixel, x) => {
                if (pixel && pixel.color && pixel.color !== '#ffffff') {
                  ctx.fillStyle = pixel.color;
                  ctx.fillRect(x * 5, y * 5, 5, 5);
                }
              });
            }
          });
        }
      }
      
    } catch (error) {
      console.error('Error loading canvas:', error);
    }
  }, [canvas, ctx]);

  const clearCanvas = useCallback(async () => {
    try {
      await fetch(`${window.location.origin}/api/initCanvas`);
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch (error) {
      console.error('Error clearing canvas:', error);
    }
  }, [canvas, ctx]);

  return { canvas, ctx, initializeCanvas, loadCanvas, clearCanvas };
}
