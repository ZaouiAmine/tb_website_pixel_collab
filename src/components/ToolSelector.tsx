import React from 'react';

const ToolSelector: React.FC = () => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Tool:</span>
      <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-md">
        <span className="text-sm">🎨</span>
        <span className="text-sm font-medium">Pixel Brush</span>
      </div>
    </div>
  );
};

export default ToolSelector;