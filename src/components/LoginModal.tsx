import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { taubyteService } from '../services/taubyteService';
import { User, Gamepad2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const { setCurrentUser } = useGameStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsConnecting(true);
    
    try {
      // Check if user already exists in localStorage
      const savedUser = localStorage.getItem('pixel_collab_user');
      let userId: string;
      
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser);
        userId = parsedUser.id;
      } else {
        // Generate a simple user ID (in a real app, this would come from the server)
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Join game through Taubyte service (this also connects)
      const user = await taubyteService.joinGame(username.trim(), userId);
      
      // Save user to localStorage
      localStorage.setItem('pixel_collab_user', JSON.stringify(user));
      
      setCurrentUser(user);
      
      onClose();
    } catch (error) {
      console.error('Failed to connect:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="pixel-card max-w-md w-full mx-4">
        <div className="flex items-center gap-2 mb-4">
          <Gamepad2 className="w-6 h-6 text-pixel-accent" />
          <h2 className="font-pixel text-lg text-pixel-text">
            Join Pixel Collab
          </h2>
        </div>
        
        <p className="text-sm text-pixel-text opacity-75 mb-6 font-pixel">
          Enter your username to start collaborating on the pixel canvas!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-pixel-text mb-2 font-pixel">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-pixel-text opacity-50" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="pixel-input w-full pl-10"
                maxLength={20}
                required
                disabled={isConnecting}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="pixel-button flex-1"
              disabled={isConnecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="pixel-button flex-1 bg-pixel-accent text-pixel-bg border-pixel-accent hover:bg-pixel-accent hover:text-pixel-bg"
              disabled={!username.trim() || isConnecting}
            >
              {isConnecting ? 'Connecting...' : 'Join Game'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-pixel-bg border border-pixel-border">
          <h3 className="font-pixel text-xs text-pixel-accent mb-2">Game Features:</h3>
          <ul className="text-xs text-pixel-text space-y-1 font-pixel">
            <li>• Real-time pixel collaboration</li>
            <li>• Multiple drawing tools</li>
            <li>• Chat with other players</li>
            <li>• Pixel cooldown system</li>
            <li>• User statistics</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
