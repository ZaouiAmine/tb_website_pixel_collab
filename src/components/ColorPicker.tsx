import React from 'react';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onColorChange }) => {
  const colors = [
    '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
    '#ff8000', '#8000ff', '#00ff80', '#ff0080', '#80ff00', '#0080ff',
    '#ff4000', '#4000ff', '#00ff40', '#ff0040', '#40ff00', '#0040ff',
    '#000000', '#ffffff', '#808080', '#800000', '#008000', '#000080'
  ];

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Color:</span>
      <div className="flex space-x-1">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => onColorChange(color)}
            className={`w-6 h-6 rounded border-2 ${
              selectedColor === color ? 'border-gray-800' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <div
          className="w-6 h-6 rounded border border-gray-300"
          style={{ backgroundColor: selectedColor }}
        />
        <span className="text-sm text-gray-600 font-mono">{selectedColor}</span>
      </div>
    </div>
  );
};

export default ColorPicker;