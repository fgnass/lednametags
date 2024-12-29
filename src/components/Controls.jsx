import { currentBankData, toggleAnimation } from "../store";
import TextTool from "./TextTool";
import ImageControls from "./ImageControls";
import AnimationControls from "./AnimationControls";

export default function Controls() {
  const isAnimated = currentBankData.value.isAnimated;

  return (
    <div class="flex flex-col gap-8">
      <div class="flex justify-center gap-4">
        <button
          class={`px-6 py-3 rounded-lg transition-colors ${
            isAnimated 
              ? "bg-orange-500 hover:bg-orange-600" 
              : "bg-gray-800 hover:bg-gray-700"
          }`}
          onClick={toggleAnimation}
        >
          Animation Mode: {isAnimated ? "ON" : "OFF"}
        </button>
      </div>

      <TextTool />
      
      {isAnimated ? <AnimationControls /> : <ImageControls />}
    </div>
  );
} 