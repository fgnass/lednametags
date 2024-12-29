import { currentFrame, togglePixel } from "../store";

export default function LEDMatrix() {
  return (
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
              onClick={() => togglePixel(x, y)}
            />
          ))}
        </div>
      ))}
    </div>
  );
} 