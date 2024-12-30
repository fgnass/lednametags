import { currentFrame, togglePixel, currentBankData, scrollImage } from "../store";
import { DisplayMode } from "../constants";
import { useEffect, useState } from "preact/hooks";

export default function LEDMatrix() {
  const bank = currentBankData.value;
  const mode = bank.mode;
  const showScrollButtons = mode === DisplayMode.SCROLL_LEFT || mode === DisplayMode.SCROLL_RIGHT;
  const canScrollLeft = bank.viewport > 0;
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(null); // true = draw, false = erase

  // Handle mouse up event globally
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDrawing(false);
      setDrawMode(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDown = (x, y, isActive) => {
    setIsDrawing(true);
    setDrawMode(!isActive); // If pixel is active, we're erasing
    togglePixel(x, y);
  };

  const handleMouseEnter = (x, y, isActive) => {
    if (isDrawing && isActive !== drawMode) {
      togglePixel(x, y);
    }
  };

  return (
    <div class="flex items-center justify-center gap-2">
      <button
        onClick={() => scrollImage("left")}
        disabled={!canScrollLeft}
        class={`h-[286px] w-10 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-gray-800 ${!showScrollButtons && 'invisible'}`}
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div class="grid gap-0.5 bg-gray-900 p-4 rounded-lg">
        {currentFrame.value.map((row, y) => (
          <div key={y} class="flex gap-0.5">
            {row.map((isActive, x) => (
              <button
                key={x}
                class={`w-5 h-5 rounded-full transition-all ${
                  isActive
                    ? "bg-orange-500 shadow-lg shadow-orange-500/50"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
                onMouseDown={() => handleMouseDown(x, y, isActive)}
                onMouseEnter={() => handleMouseEnter(x, y, isActive)}
              />
            ))}
          </div>
        ))}
      </div>

      <button
        onClick={() => scrollImage("right")}
        class={`h-[286px] w-10 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center justify-center ${!showScrollButtons && 'invisible'}`}
      >
        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
} 