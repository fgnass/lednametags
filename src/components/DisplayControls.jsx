import { currentBankData, setMode } from "../store";
import { DisplayMode } from "../constants";
import Select from "./Select";

export default function DisplayControls() {
  const bank = currentBankData.value;
  return (
    <Select
      key={`mode-${bank.mode}`}
      value={bank.mode}
      onChange={(e) => setMode(parseInt(e.target.value))}
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
  );
}
