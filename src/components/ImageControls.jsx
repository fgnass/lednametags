import { clearImage, invertImage } from "../store";
import { Eraser, Contrast, TypeOutline } from "lucide-preact";
import { Button } from "./Button";
import { useState } from "preact/hooks";
import TextControls from "./TextControls";

export default function ImageControls() {
  const [showTextControls, setShowTextControls] = useState(false);

  return (
    <div class="flex flex-col items-center gap-4">
      <div class="flex justify-center gap-4">
        <Button onClick={clearImage}>
          <Eraser />
          Clear
        </Button>

        <Button onClick={invertImage}>
          <Contrast />
          Invert
        </Button>

        <Button onClick={clearImage}>
          <Eraser />
          Clear
        </Button>

        <Button onClick={invertImage}>
          <Contrast />
          Invert
        </Button>

        <Button
          onClick={() => setShowTextControls(!showTextControls)}
          active={showTextControls}
        >
          <TypeOutline />
          Text
        </Button>
      </div>

      {showTextControls && (
        <div class="flex-1 bg-gray-700 p-4 rounded-lg shadow-md w-full">
          <TextControls />
        </div>
      )}
    </div>
  );
}
