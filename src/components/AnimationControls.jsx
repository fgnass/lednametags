import { currentBankData, frameCount, nextFrame, prevFrame, addFrame, togglePlayback, isPlaying } from "../store";

export default function AnimationControls() {
  const frame = currentBankData.value.currentFrame;
  const total = frameCount.value;

  return (
    <div class="flex flex-col gap-4">
      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800"
          onClick={prevFrame}
          disabled={frame === 0 || isPlaying.value}
        >
          ← Previous Frame
        </button>
        <div class="px-6 py-3 text-gray-400">
          Frame {frame + 1} of {total}
        </div>
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800"
          onClick={nextFrame}
          disabled={frame === total - 1 || isPlaying.value}
        >
          Next Frame →
        </button>
      </div>
      
      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
          onClick={addFrame}
          disabled={isPlaying.value}
        >
          Clone Frame
        </button>
        <button
          class={`px-6 py-3 rounded-lg transition-colors ${
            isPlaying.value 
              ? "bg-orange-500 hover:bg-orange-600" 
              : "bg-gray-800 hover:bg-gray-700"
          }`}
          onClick={togglePlayback}
        >
          {isPlaying.value ? "■ Stop" : "▶ Play"}
        </button>
      </div>
    </div>
  );
} 