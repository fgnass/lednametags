import { currentBankData, setText, setFont } from '../store'
import { fonts } from '../fonts'

export default function TextControls() {
  const bank = currentBankData.value;
  
  return (
    <div class="flex justify-center gap-4">
      <select
        class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 w-48"
        value={bank.font}
        onChange={(e) => setFont(e.target.value)}
      >
        {fonts.map((font, i) => (
          <option key={i} value={font}>
            {font}
          </option>
        ))}
      </select>
      
      <input
        type="text"
        value={bank.text}
        onInput={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        class="flex-1 px-6 py-3 bg-gray-800 rounded-lg text-lg"
      />
    </div>
  )
} 