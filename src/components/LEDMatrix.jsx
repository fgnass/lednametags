import {
  currentFrame,
  togglePixel,
  currentBankData,
  scrollImage,
} from "../store";
import { DisplayMode } from "../constants";
import { useEffect, useState } from "preact/hooks";
import { ChevronLeft, ChevronRight } from "lucide-preact";
import { Button } from "./Button";
import { styled } from "classname-variants/preact";

export default function LEDMatrix() {
  const bank = currentBankData.value;
  const mode = bank.mode;
  const showScrollButtons =
    mode === DisplayMode.SCROLL_LEFT || mode === DisplayMode.SCROLL_RIGHT;
  const canScrollLeft = bank.viewport > 0;
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
    <div class="flex justify-center gap-2 my-16">
      <ScrollButton
        onClick={() => scrollImage("left")}
        disabled={!canScrollLeft}
        invisible={!showScrollButtons}
      >
        <ChevronLeft />
      </ScrollButton>

      <div class="grid gap-0.5 bg-gray-900 px-4 rounded-lg">
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

      <ScrollButton
        onClick={() => scrollImage("right")}
        invisible={!showScrollButtons}
      >
        <ChevronRight />
      </ScrollButton>
    </div>
  );
}

const ScrollButton = styled(Button, {
  base: "px-2",
  variants: {
    invisible: {
      true: "invisible",
    },
  },
});
