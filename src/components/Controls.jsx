import { currentBankData, setMode, setSpeed } from "../store";
import { DisplayMode, SPEED_LABELS } from "../constants";
import TextControls from "./TextControls";
import ImageControls from "./ImageControls";
import AnimationControls from "./AnimationControls";
import PlaybackControls from "./PlaybackControls";

export default function Controls() {
  const bank = currentBankData.value;

  return (
    <div class="space-y-8">
      <div class="flex justify-center items-center gap-4">
        <select
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
          value={bank.mode}
          onChange={(e) => setMode(parseInt(e.target.value))}
        >
          <option value={DisplayMode.STATIC}>Static</option>
          <option value={DisplayMode.SCROLL_LEFT}>Scroll Left</option>
          <option value={DisplayMode.SCROLL_RIGHT}>Scroll Right</option>
          <option value={DisplayMode.SCROLL_UP}>Scroll Up</option>
          <option value={DisplayMode.SCROLL_DOWN}>Scroll Down</option>
          <option value={DisplayMode.ANIMATION}>Animation</option>
          <option value={DisplayMode.SNOW}>Snow</option>
          <option value={DisplayMode.LASER}>Laser</option>
          <option value={DisplayMode.CURTAIN}>Curtain</option>
        </select>

        {bank.mode !== DisplayMode.STATIC && (
          <>
            <select
              class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
              value={bank.speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
            >
              {SPEED_LABELS.map((label, i) => (
                <option key={i} value={i + 1}>
                  {label}
                </option>
              ))}
            </select>

            <PlaybackControls />
          </>
        )}
      </div>

      {bank.mode === DisplayMode.ANIMATION ? (
        <AnimationControls />
      ) : (
        <>
          <TextControls />
          <ImageControls />
        </>
      )}
    </div>
  );
} 