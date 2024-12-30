import { isConnected } from '../store'
import { connectToDevice, toggleConnection } from '../device'

export default function DeviceControls() {
  return (
    <div class="flex justify-center gap-4">
      {isConnected.value ? (
        <>
          <button
            class="px-6 py-3 bg-orange-500 shadow-lg shadow-orange-500/50 rounded-lg"
            onClick={toggleConnection}
          >
            Disconnect
          </button>
          <button
            class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
            onClick={connectToDevice}
          >
            Upload to Device
          </button>
        </>
      ) : (
        <button
          class="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700"
          onClick={toggleConnection}
        >
          Connect
        </button>
      )}
    </div>
  )
} 