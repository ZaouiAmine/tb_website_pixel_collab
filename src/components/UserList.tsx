import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { User } from '../types/game';
import { Users, Wifi, WifiOff } from 'lucide-react';

export const UserList: React.FC = () => {
  const { users, currentUser, isConnected } = useGameStore();

  const getStatusColor = (user: User) => {
    if (!user.isOnline) return 'text-gray-500';
    if (user.id === currentUser?.id) return 'text-pixel-accent';
    return 'text-pixel-text';
  };

  const getStatusIcon = (user: User) => {
    if (!user.isOnline) return <WifiOff className="w-3 h-3" />;
    return <Wifi className="w-3 h-3" />;
  };

  return (
    <div className="pixel-card">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-pixel-accent" />
        <h3 className="font-pixel text-sm text-pixel-text">
          Players ({users.length})
        </h3>
        <div className={`ml-auto w-2 h-2 rounded-full ${
          isConnected ? 'bg-green-500' : 'bg-red-500'
        }`} />
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {users.length === 0 ? (
          <p className="text-xs text-pixel-text opacity-50 font-pixel">
            No players online
          </p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center gap-2 p-2 border border-pixel-border ${
                user.id === currentUser?.id ? 'bg-pixel-accent bg-opacity-20' : ''
              }`}
            >
              <div
                className="w-3 h-3 border border-pixel-border"
                style={{ backgroundColor: user.color }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-pixel truncate ${getStatusColor(user)}`}>
                  {user.username}
                  {user.id === currentUser?.id && ' (You)'}
                </p>
                <p className="text-xs text-pixel-text opacity-50">
                  {user.pixelsPlaced} pixels
                </p>
              </div>
              <div className="flex items-center gap-1">
                {getStatusIcon(user)}
              </div>
            </div>
          ))
        )}
      </div>
      
      {!isConnected && (
        <div className="mt-3 p-2 bg-pixel-warning bg-opacity-20 border border-pixel-warning">
          <p className="text-xs text-pixel-warning font-pixel">
            Disconnected from server
          </p>
        </div>
      )}
    </div>
  );
};