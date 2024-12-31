import { currentFrame, togglePixel, currentBankData } from "../store";
import { useEffect, useState } from "preact/hooks";

export default function LEDMatrix() {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(null); // true = draw, false = erase

  // Handle mouse up event globally
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDrawing(false);
      setDrawMode(null);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
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
    <div class="grid gap-0.5 bg-gray-900 rounded-lg">
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
  );
}
