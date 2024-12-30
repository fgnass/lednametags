import { isPlaying, togglePlayback } from "../store";
import { Play, Square } from "lucide-preact";

export default function PlaybackControls() {
  return (
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
  );
}
