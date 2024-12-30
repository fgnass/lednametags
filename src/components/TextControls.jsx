import { currentBankData, setText } from "../store";
import { fonts, currentFont, setFont } from "../fonts";
import Select from "./Select";

export default function TextControls() {
  const bank = currentBankData.value;

  return (
    <div class="flex gap-4">
      <Select
        value={currentFont.value}
        onChange={(e) => {
          setFont(e.target.value);
          setText(bank.text); // Re-render text with new font
        }}
      >
        {fonts.value.map((font) => (
          <option key={font} value={font}>
            {font}
          </option>
        ))}
      </Select>

      <input
        type="text"
        value={bank.text}
        onInput={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        class="flex-1 px-6 py-3 bg-gray-800 rounded-lg text-lg"
      />
    </div>
  );
}
