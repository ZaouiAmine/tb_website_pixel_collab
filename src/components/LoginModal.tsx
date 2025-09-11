import React, { useState } from 'react';
import type { User } from '../types/game';

interface LoginModalProps {
  onLogin: (user: User) => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [color, setColor] = useState('#ff0000');
  const [isLoading, setIsLoading] = useState(false);

  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8000', '#8000ff', '#00ff80', '#ff0080', '#80ff00', '#0080ff',
    '#ff4000', '#4000ff', '#00ff40', '#ff0040', '#40ff00', '#0040ff'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      alert('Please enter a username');
      return;
    }

    if (username.length > 20) {
      alert('Username must be 20 characters or less');
      return;
    }

    setIsLoading(true);

    // Simulate a brief loading state
    setTimeout(() => {
      const user: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: username.trim(),
        color,
        isOnline: true,
        lastSeen: Date.now(),
        pixelsPlaced: 0
      };

      onLogin(user);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Join Pixel Collab
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={20}
              required
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose Your Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === colorOption ? 'border-gray-800' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: colorOption }}
                  title={colorOption}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-sm text-gray-600">Selected:</span>
              <div
                className="w-6 h-6 rounded-full border border-gray-300"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-gray-600">{color}</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Welcome to Pixel Collab!</p>
          <p>Click on the canvas to place pixels and collaborate with others.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;