import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Tool } from '../types/game';
import { Pencil, Eraser, Eye, PaintBucket } from 'lucide-react';

const TOOLS: { tool: Tool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { tool: 'pencil', icon: Pencil, label: 'Pencil' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser' },
  { tool: 'eyedropper', icon: Eye, label: 'Eyedropper' },
  { tool: 'bucket', icon: PaintBucket, label: 'Bucket' },
];

export const ToolSelector: React.FC = () => {
  const { selectedTool, setSelectedTool } = useGameStore();

  return (
    <div className="pixel-card">
      <h3 className="font-pixel text-sm text-pixel-text mb-3">Tools</h3>
      
      <div className="grid grid-cols-2 gap-1">
        {TOOLS.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            className={`pixel-button flex flex-col items-center gap-1 p-1 ${
              selectedTool === tool 
                ? 'bg-pixel-accent text-pixel-bg border-pixel-accent' 
                : ''
            }`}
            onClick={() => setSelectedTool(tool)}
            title={label}
          >
            <Icon className="w-3 h-3" />
            <span className="text-xs font-pixel">{label}</span>
          </button>
        ))}
      </div>
      
      <div className="mt-2 p-1 bg-pixel-bg border border-pixel-border">
        <p className="text-xs text-pixel-text font-pixel">
          <strong>Selected:</strong> {TOOLS.find(t => t.tool === selectedTool)?.label}
        </p>
      </div>
    </div>
  );
};