import React, { useState, useEffect } from 'react';

function Canvas({ canvas, ctx, currentUser, websocket, onClearCanvas, onRefreshCanvas }) {
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas on mount
  useEffect(() => {
    if (canvas && ctx) {
      console.log('Canvas component initialized with canvas and context');
    }
  }, [canvas, ctx]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e) => {
    if (!isDrawing || !ctx || !canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    
    // Scale down coordinates to match backend (100x100 grid)
    const backendX = Math.floor(x / 5);
    const backendY = Math.floor(y / 5);
    
    // Ensure coordinates are within bounds
    if (backendX >= 0 && backendX < 100 && backendY >= 0 && backendY < 100) {
      // Draw pixel (5x5 for visibility)
      ctx.fillStyle = currentUser.color;
      ctx.fillRect(backendX * 5, backendY * 5, 5, 5);
      
      // Send pixel update via WebSocket
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        const pixel = {
          x: backendX,
          y: backendY,
          color: currentUser.color,
          userId: currentUser.id,
          username: currentUser.username
        };
        
        websocket.send(JSON.stringify(pixel));
        console.log('Sent pixel update:', pixel);
      } else {
        console.log('WebSocket not connected, cannot send pixel update');
      }
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  return (
    <div className="canvas-container">
      <div className="canvas-wrapper">
        <canvas 
          id="pixelCanvas" 
          width="500" 
          height="500"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
        ></canvas>
      </div>
      <div className="canvas-info">
        <p>Click and drag to draw pixels</p>
        <p>Canvas: 100x100 pixels</p>
      </div>
      <div className="tools">
        <button className="button" onClick={onRefreshCanvas}>Load Canvas</button>
        <button className="button secondary" onClick={onClearCanvas}>Clear Canvas</button>
      </div>
    </div>
  );
}

export default Canvas;
