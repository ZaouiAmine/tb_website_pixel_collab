import React from 'react';
import { useGameStore } from '../store/gameStore';

const UserList: React.FC = () => {
  const { users } = useGameStore();

  const getStatusIcon = (user: any) => {
    return user.isOnline ? '🟢' : '⚫';
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Online Users</h3>
      
      {users.length === 0 ? (
        <div className="text-center text-gray-500 py-4">
          No users online
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: user.color }}
                ></div>
                <span className="text-sm font-medium text-gray-800">
                  {user.username}
                </span>
              </div>
              
              <div className="flex items-center space-x-1 ml-auto">
                <span className="text-xs text-gray-500">
                  {getStatusIcon(user)}
                </span>
                <span className="text-xs text-gray-500">
                  {user.pixelsPlaced} pixels
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserList;