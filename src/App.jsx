import BankSelector from "./components/BankSelector";
import Controls from "./components/Controls";
import LEDMatrix from "./components/LEDMatrix";
import DeviceControls from "./components/DeviceControls";

export default function App() {
  return (
    <div class="min-h-screen bg-gray-900 text-white p-8">
      <div class="max-w-4xl mx-auto space-y-8">
        <div class="flex items-center justify-between">
          <BankSelector />
          <DeviceControls />
        </div>
        <LEDMatrix />
        <Controls />
      </div>
    </div>
  );
} 