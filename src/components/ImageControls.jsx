import { clearImage, invertImage, scrollImage, currentBankData } from "../store";

export default function ImageControls() {
  const viewport = currentBankData.value.viewport;
  const maxWidth = currentBankData.value.pixels[0].length;

  return (
    <div class="flex flex-col gap-4">
      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
          onClick={clearImage}
        >
          Clear
        </button>
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
          onClick={invertImage}
        >
          Invert
        </button>
      </div>
      
      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800"
          onClick={() => scrollImage("left")}
          disabled={viewport === 0}
        >
          ← Scroll Left
        </button>
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-gray-800"
          onClick={() => scrollImage("right")}
          disabled={viewport >= maxWidth - 44}
        >
          Scroll Right →
        </button>
      </div>
    </div>
  );
} 