import { currentBank } from '../store'

export default function BankSelector() {
  return (
    <div class="flex gap-2">
      {Array(8).fill().map((_, i) => (
        <button
          key={i}
          class={`flex-1 py-3 rounded-lg transition-all ${
            currentBank.value === i
              ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
              : 'bg-gray-800 hover:bg-gray-700'
          }`}
          onClick={() => currentBank.value = i}
        >
          Bank {i + 1}
        </button>
      ))}
    </div>
  )
} 