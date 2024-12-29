import { clearImage, invertImage } from "../store";
import { Eraser, Contrast } from "lucide-preact";

export default function ImageControls() {
  return (
    <div class="flex justify-center gap-4">
      <button
        class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center gap-2"
        onClick={clearImage}
      >
        <Eraser class="w-5 h-5" />
        Clear
      </button>

      <button
        class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center gap-2"
        onClick={invertImage}
      >
        <Contrast class="w-5 h-5" />
        Invert
      </button>
    </div>
  );
} 