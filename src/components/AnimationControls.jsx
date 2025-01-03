import {
  currentBankData,
  addFrame,
  deleteFrame,
  nextFrame,
  prevFrame,
} from "../store";
import { frameCount } from "../animation";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-preact";

export default function AnimationControls() {
  const bank = currentBankData.value;
  const frames = frameCount.value;
  const currentFrame = bank.currentFrame + 1;

  return (
    <div class="space-y-4">
      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          onClick={prevFrame}
        >
          <ChevronLeft />
          Prev
        </button>

        <div class="px-6 py-3 text-gray-400 tabular-nums">
          Frame {currentFrame} of {frames}
        </div>

        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          onClick={nextFrame}
        >
          Next
          <ChevronRight />
        </button>
      </div>

      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 flex items-center gap-2"
          onClick={addFrame}
        >
          <Plus />
          Add Frame
        </button>

        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800 flex items-center gap-2"
          onClick={deleteFrame}
          disabled={frames <= 1}
        >
          <Trash2 />
          Delete Frame
        </button>
      </div>
    </div>
  );
}
