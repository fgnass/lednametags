import BankSelector from "./components/BankSelector";
import Controls from "./components/Controls";
import LEDMatrix from "./components/LEDMatrix";

export default function App() {
  return (
    <div class="min-h-screen bg-gray-900 text-white p-8">
      <div class="max-w-4xl mx-auto space-y-8">
        <BankSelector />
        <LEDMatrix />
        <Controls />
      </div>
    </div>
  );
} 