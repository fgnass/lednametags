import { currentBankData, setText, setFont } from "../store";
import { availableFonts } from "../fonts";

export default function TextTool() {
  return (
    <div class="flex flex-col gap-4">
      <div class="flex justify-center gap-4">
        <input
          type="text"
          value={currentBankData.value.text}
          onInput={e => setText(e.target.value)}
          placeholder="Enter text..."
          class="px-4 py-3 bg-gray-800 rounded-lg text-lg w-full max-w-md"
        />
        <select
          value={currentBankData.value.font}
          onChange={e => setFont(e.target.value)}
          class="px-4 py-3 bg-gray-800 rounded-lg text-lg"
        >
          {availableFonts.map(font => (
            <option key={font.name} value={font.name}>
              {font.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
} 