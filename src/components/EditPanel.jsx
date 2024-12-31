import {
  currentBankData,
  clearImage,
  invertImage,
  setMode,
  setSpeed,
  setBlink,
  setAnts,
  translateImage,
} from "../store";
import { DisplayMode, SPEED_LABELS } from "../constants";
import {
  Eraser,
  FlipHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Zap,
  Gauge,
  SquareDashed,
  Siren,
} from "lucide-preact";
import { Button } from "./Button";
import TextControls from "./TextControls";
import Select from "./Select";

const ToolGroup = ({ title, children }) => (
  <div class="space-y-2">
    <div class="text-xs uppercase text-gray-500 font-medium tracking-wider">
      {title}
    </div>
    <div class="flex flex-wrap gap-2">{children}</div>
  </div>
);

export default function EditPanel() {
  const bank = currentBankData.value;

  return (
    <div class="bg-gray-800/50 rounded-lg p-4 space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <ToolGroup title="Image">
          <Button onClick={clearImage}>
            <Eraser class="w-4 h-4" />
            Clear
          </Button>
          <Button onClick={invertImage}>
            <FlipHorizontal class="w-4 h-4" />
            Invert
          </Button>
        </ToolGroup>

        <ToolGroup title="Move">
          <div class="flex items-center gap-1 w-min">
            <Button snug onClick={() => translateImage("left")}>
              <ChevronLeft class="w-4 h-4" />
            </Button>
            <div class="flex flex-col gap-1">
              <Button snug onClick={() => translateImage("up")}>
                <ChevronUp class="w-4 h-4" />
              </Button>
              <Button snug onClick={() => translateImage("down")}>
                <ChevronDown class="w-4 h-4" />
              </Button>
            </div>
            <Button snug onClick={() => translateImage("right")}>
              <ChevronRight class="w-4 h-4" />
            </Button>
          </div>
        </ToolGroup>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <ToolGroup title="Display">
          <Select
            value={bank.mode}
            onChange={(e) => setMode(parseInt(e.target.value))}
            icon={<Zap class="w-4 h-4" />}
          >
            <option value={DisplayMode.SCROLL_LEFT}>Scroll Left</option>
            <option value={DisplayMode.SCROLL_RIGHT}>Scroll Right</option>
            <option value={DisplayMode.SCROLL_UP}>Scroll Up</option>
            <option value={DisplayMode.SCROLL_DOWN}>Scroll Down</option>
            <option value={DisplayMode.STATIC}>Static</option>
            <option value={DisplayMode.ANIMATION}>Animation</option>
            <option value={DisplayMode.SNOW}>Snow</option>
            <option value={DisplayMode.CURTAIN}>Curtain</option>
            <option value={DisplayMode.LASER}>Laser</option>
          </Select>

          {bank.mode !== DisplayMode.STATIC && (
            <Select
              value={bank.speed}
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              icon={<Gauge class="w-4 h-4" />}
            >
              {SPEED_LABELS.map((label, i) => (
                <option key={i} value={i + 1}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </ToolGroup>

        <ToolGroup title="Effects">
          <Button onClick={() => setBlink(!bank.blink)} active={bank.blink}>
            <Siren />
            Blink
          </Button>
          <Button onClick={() => setAnts(!bank.ants)} active={bank.ants}>
            <SquareDashed />
            Ants
          </Button>
        </ToolGroup>
      </div>

      <ToolGroup title="Text">
        <TextControls />
      </ToolGroup>
    </div>
  );
}
