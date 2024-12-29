import { isConnected } from '../store'
import { connectToDevice, toggleConnection } from '../device'

export default function DeviceControls() {
  return (
    <div class="flex justify-center gap-4">
      <button
        class={`px-6 py-3 rounded-lg transition-all ${
          isConnected.value
            ? 'bg-orange-500 shadow-lg shadow-orange-500/50'
            : 'bg-gray-800 hover:bg-gray-700'
        }`}
        onClick={toggleConnection}
      >
        {isConnected.value ? 'Disconnect' : 'Connect'}
      </button>
      <button
        class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
        onClick={connectToDevice}
      >
        Upload to Device
      </button>
    </div>
  )
} 