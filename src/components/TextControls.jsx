import { currentBankData, setText, setFont } from '../store'
import { fonts } from '../fonts'

export default function TextControls() {
  const bank = currentBankData.value;
  
  return (
    <div class="flex flex-col gap-4">
      <div class="flex gap-4">
        <input
          type="text"
          value={bank.text}
          onInput={(e) => setText(e.target.value)}
          placeholder="Enter text..."
          class="flex-1 px-4 py-3 bg-gray-800 rounded-lg text-lg"
        />
        
        <select
          value={bank.font}
          onChange={(e) => setFont(e.target.value)}
          class="px-4 py-3 bg-gray-800 rounded-lg text-lg"
        >
          {fonts.map(name => (
            <option key={name} value={name}>
              {name.replace(/([A-Z])/g, ' $1').trim()}
            </option>
          ))}
        </select>
      </div>
      
      <div class="flex justify-center gap-4">
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
          onClick={() => setText('')}
        >
          Clear
        </button>
      </div>
    </div>
  )
} 