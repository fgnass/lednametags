import { currentBankData, setText, setFont } from '../store'
import { fonts } from '../fonts'
import Select from './Select'

export default function TextControls() {
  const bank = currentBankData.value;
  
  return (
    <div class="flex justify-center gap-4">
      <Select
        value={bank.font}
        onChange={(e) => setFont(e.target.value)}
        className="px-6 py-3 w-48"
      >
        {fonts.map((font, i) => (
          <option key={i} value={font}>
            {font}
          </option>
        ))}
      </Select>
      
      <input
        type="text"
        value={bank.text}
        onInput={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        class="flex-1 px-6 py-3 bg-gray-800 rounded-lg text-lg hover:bg-gray-700"
      />
    </div>
  )
} 