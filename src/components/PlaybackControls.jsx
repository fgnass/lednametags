import { isPlaying, togglePlayback } from "../store";
import { Play, Square } from "lucide-preact";

export default function PlaybackControls() {
  return (
    <div class="flex items-center gap-4">
      <button
        class={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
          isPlaying.value
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-green-600 hover:bg-green-700"
        }`}
        onClick={togglePlayback}
      >
        {isPlaying.value ? <Square /> : <Play />}
        {isPlaying.value ? "Stop" : "Play"}
      </button>
      <label class="flex items-center gap-2 text-gray-400 text-sm">
        <input type="checkbox" class="accent-gray-400" />
        Cycle M1-8
      </label>
    </div>
  );
}
