import {
  currentBankData,
  scrollImage,
  addFrame,
  deleteFrame,
  nextFrame,
  prevFrame,
} from "../store";
import { frameCount } from "../animation";
import { DisplayMode } from "../constants";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-preact";
import { Button } from "./Button";

export default function NavigationControls() {
  const bank = currentBankData.value;
  const mode = bank.mode;

  if (mode === DisplayMode.ANIMATION) {
    return (
      <div class="flex flex-col gap-2">
        <div class="flex justify-between gap-4">
          <Button onClick={prevFrame}>
            <ChevronLeft />
          </Button>
          <div class="flex items-center gap-2">
            <div class="px-6 py-3 text-gray-400 tabular-nums">
              Frame {bank.currentFrame + 1} of {frameCount.value}
            </div>
            <Button onClick={deleteFrame} disabled={frameCount.value <= 1}>
              <Trash2 />
            </Button>
            <Button onClick={addFrame}>
              <Plus />
            </Button>
          </div>
          <Button onClick={nextFrame}>
            <ChevronRight />
          </Button>
        </div>
      </div>
    );
  }

  const showScrollButtons =
    mode === DisplayMode.SCROLL_LEFT || mode === DisplayMode.SCROLL_RIGHT;

  if (!showScrollButtons) return null;

  return (
    <div class="flex justify-between">
      <Button onClick={() => scrollImage("left")} disabled={bank.viewport <= 0}>
        <ChevronLeft />
      </Button>
      <Button onClick={() => scrollImage("right")}>
        <ChevronRight />
      </Button>
    </div>
  );
}
