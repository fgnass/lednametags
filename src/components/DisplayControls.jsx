import { currentBankData, setMode, setSpeed } from "../store";
import { DisplayMode, SPEED_LABELS } from "../constants";
import ImageControls from "./ImageControls";
import AnimationControls from "./AnimationControls";
import PlaybackControls from "./PlaybackControls";
import Select from "./Select";

export default function DisplayControls() {
  const bank = currentBankData.value;

  return (
    <div class="flex flex-col items-center gap-4">
      <div class="flex items-center gap-4">
        <Select
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
        </Select>

        {bank.mode !== DisplayMode.STATIC && (
          <>
            <Select
              value={bank.speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
            >
              {SPEED_LABELS.map((label, i) => (
                <option key={i} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>

            <PlaybackControls />
          </>
        )}
      </div>
    </div>
  );
}
