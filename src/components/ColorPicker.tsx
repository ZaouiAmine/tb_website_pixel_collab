import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Palette } from 'lucide-react';

const PRESET_COLORS = [
  '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#8000ff',
  '#0080ff', '#80ff00', '#ff0080', '#808080', '#c0c0c0',
  '#800000', '#008000', '#000080', '#808000', '#800080',
  '#008080', '#ffa500', '#ffc0cb', '#a52a2a', '#00ff80',
  '#ff8080', '#80ff80', '#8080ff', '#ffff80', '#ff80ff',
  '#80ffff', '#dda0dd', '#98fb98', '#f0e68c', '#ffb6c1'
];

export const ColorPicker: React.FC = () => {
  const { selectedColor, setSelectedColor } = useGameStore();
  const [customColor, setCustomColor] = useState(selectedColor);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    setSelectedColor(color);
  };

  return (
    <div className="pixel-card">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-pixel-accent" />
        <h3 className="font-pixel text-sm text-pixel-text">Colors</h3>
      </div>
      
      {/* Current color display */}
      <div className="mb-2">
        <div 
          className="w-full h-6 border border-pixel-border"
          style={{ backgroundColor: selectedColor }}
        />
        <p className="text-xs text-pixel-text mt-1 font-mono">
          {selectedColor.toUpperCase()}
        </p>
      </div>

      {/* Preset colors grid */}
      <div className="grid grid-cols-6 gap-1 mb-3">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            className={`w-4 h-4 border-2 transition-all ${
              selectedColor === color 
                ? 'border-pixel-accent scale-110' 
                : 'border-pixel-border hover:border-pixel-text'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelect(color)}
            title={color}
          />
        ))}
      </div>

      {/* Custom color picker */}
      <div className="space-y-2">
        <button
          className="pixel-button w-full text-xs"
          onClick={() => setShowCustomPicker(!showCustomPicker)}
        >
          {showCustomPicker ? 'Hide' : 'Custom'} Color
        </button>
        
        {showCustomPicker && (
          <div className="space-y-2">
            <input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-full h-8 border border-pixel-border cursor-pointer"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="pixel-input w-full text-xs font-mono"
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        )}
      </div>
    </div>
  );
};
