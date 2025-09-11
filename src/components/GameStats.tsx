import React from 'react';
import { useGameStore } from '../store/gameStore';

const GameStats: React.FC = () => {
  const { canvas, users, messages } = useGameStore();

  const getPixelCount = () => {
    if (!canvas || canvas.length === 0) return 0;
    
    let count = 0;
    canvas.forEach(row => {
      row.forEach(pixel => {
        if (pixel.color && pixel.color !== '#ffffff') {
          count++;
        }
      });
    });
    return count;
  };

  const getTotalPixels = () => {
    return canvas.length > 0 ? canvas.length * canvas[0].length : 0;
  };

  const getCompletionPercentage = () => {
    const total = getTotalPixels();
    if (total === 0) return 0;
    return Math.round((getPixelCount() / total) * 100);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Game Stats</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Pixels Placed</span>
          <span className="text-sm font-medium text-gray-800">
            {getPixelCount().toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Pixels</span>
          <span className="text-sm font-medium text-gray-800">
            {getTotalPixels().toLocaleString()}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Completion</span>
          <span className="text-sm font-medium text-gray-800">
            {getCompletionPercentage()}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Online Users</span>
          <span className="text-sm font-medium text-gray-800">
            {users.length}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Messages</span>
          <span className="text-sm font-medium text-gray-800">
            {messages.length}
          </span>
        </div>
      </div>
    </div>
  );
};

export default GameStats;