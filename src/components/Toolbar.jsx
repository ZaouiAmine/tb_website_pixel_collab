const Toolbar = ({ selectedColor, setSelectedColor }) => {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-3">
      <div className="flex items-center justify-center">
        {/* Native Color Picker */}
        <div className="flex items-center space-x-3">
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-12 h-12 rounded-lg border-2 border-white/30 cursor-pointer hover:border-white/50 transition-colors"
            title="Choose color"
          />
          <div className="text-white/80 text-sm font-medium">
            {selectedColor}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Toolbar
