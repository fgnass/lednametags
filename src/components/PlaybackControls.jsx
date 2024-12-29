import { isPlaying, togglePlayback } from "../store";
import { Play, Square } from "lucide-preact";

export default function PlaybackControls() {
  return (
    <button
      class={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
        isPlaying.value 
          ? "bg-orange-500 hover:bg-orange-600" 
          : "bg-gray-800 hover:bg-gray-700"
      }`}
      onClick={togglePlayback}
    >
      {isPlaying.value ? <Square class="w-5 h-5" /> : <Play class="w-5 h-5" />}
      {isPlaying.value ? "Stop" : "Play"}
    </button>
  );
} 