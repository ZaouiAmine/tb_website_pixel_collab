import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { taubyteService } from '../services/taubyteService';
import { BarChart3, Wifi, WifiOff } from 'lucide-react';

export const GameStats: React.FC = () => {
  const { 
    canvas, 
    users, 
    currentUser, 
    canvasSize, 
    pixelSize,
    maxPixelsPerUser 
  } = useGameStore();

  const [connectionStatus, setConnectionStatus] = useState(taubyteService.getConnectionStatus());
  const currentUserData = currentUser ? users.find(u => u.id === currentUser.id) : null;

  useEffect(() => {
    const updateConnectionStatus = () => {
      setConnectionStatus(taubyteService.getConnectionStatus());
    };

    // Update connection status every 5 seconds
    const interval = setInterval(updateConnectionStatus, 5000);
    
    // Also listen to connection events
    taubyteService.on('connect', updateConnectionStatus);
    taubyteService.on('disconnect', updateConnectionStatus);

    return () => {
      clearInterval(interval);
      taubyteService.off('connect', updateConnectionStatus);
      taubyteService.off('disconnect', updateConnectionStatus);
    };
  }, []);
  
  const totalPixels = canvas.flat().filter(pixel => pixel.userId).length;
  const pixelsUsed = canvasSize.width * canvasSize.height;
  const usagePercentage = (totalPixels / pixelsUsed) * 100;


  const pixelsRemaining = currentUserData 
    ? Math.max(0, maxPixelsPerUser - currentUserData.pixelsPlaced)
    : 0;

  return (
    <div className="pixel-card">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-pixel-accent" />
        <h3 className="font-pixel text-sm text-pixel-text">Stats</h3>
      </div>

      <div className="space-y-3">
        {/* Connection Status */}
        <div className="space-y-2">
          <h4 className="font-pixel text-xs text-pixel-accent">Connection</h4>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {connectionStatus.connected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span className="text-pixel-text">
                {connectionStatus.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              connectionStatus.mode === 'websocket' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {connectionStatus.mode === 'websocket' ? 'WebSocket' : 'Polling'}
            </span>
          </div>
        </div>

        {/* Canvas Stats */}
        <div className="space-y-2">
          <h4 className="font-pixel text-xs text-pixel-accent">Canvas</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-pixel-text">Size:</span>
              <span className="text-pixel-text font-mono">
                {canvasSize.width}×{canvasSize.height}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-pixel-text">Pixel Size:</span>
              <span className="text-pixel-text font-mono">{pixelSize}px</span>
            </div>
            <div className="flex justify-between">
              <span className="text-pixel-text">Used:</span>
              <span className="text-pixel-text font-mono">
                {totalPixels}/{pixelsUsed}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-pixel-text">Usage:</span>
              <span className="text-pixel-text font-mono">
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="w-full bg-pixel-border h-2">
            <div 
              className="bg-pixel-accent h-full transition-all duration-300"
              style={{ width: `${usagePercentage}%` }}
            />
          </div>
        </div>

        {/* User Stats */}
        {currentUserData && (
          <div className="space-y-2">
            <h4 className="font-pixel text-xs text-pixel-accent">Your Progress</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span className="text-pixel-text">Pixels:</span>
                <span className="text-pixel-text font-mono">
                  {currentUserData.pixelsPlaced}/{maxPixelsPerUser}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-pixel-text">Remaining:</span>
                <span className="text-pixel-text font-mono">{pixelsRemaining}</span>
              </div>
            </div>
            <div className="w-full bg-pixel-border h-2">
              <div 
                className="bg-pixel-info h-full transition-all duration-300"
                style={{ width: `${(currentUserData.pixelsPlaced / maxPixelsPerUser) * 100}%` }}
              />
            </div>
          </div>
        )}


        {/* Game Settings */}
        <div className="space-y-2">
          <h4 className="font-pixel text-xs text-pixel-accent">Settings</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-pixel-text">Max/User:</span>
              <span className="text-pixel-text font-mono">
                {maxPixelsPerUser}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
