import { currentBankData } from "../store";
import { DisplayMode } from "../constants";
import ImageControls from "./ImageControls";
import AnimationControls from "./AnimationControls";

export default function Controls() {
  const bank = currentBankData.value;

  return bank.mode === DisplayMode.ANIMATION ? (
    <AnimationControls />
  ) : (
    <ImageControls />
  );
}
