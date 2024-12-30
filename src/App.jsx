import BankSelector from "./components/BankSelector";
import DisplayControls from "./components/DisplayControls";
import GitHubLink from "./components/GitHubLink";
import DeviceControls from "./components/DeviceControls";
import LEDMatrix from "./components/LEDMatrix";
import Controls from "./components/Controls";
import MemoryStats from "./components/MemoryStats";
export default function App() {
  return (
    <div class="min-h-screen bg-gray-900 text-white p-8 flex">
      <div class="mx-auto flex flex-col mt-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <BankSelector />
            <DisplayControls />
          </div>
          <div class="flex items-center gap-4">
            <MemoryStats />
            <DeviceControls />
            <GitHubLink />
          </div>
        </div>
        <LEDMatrix />
        <Controls />
      </div>
    </div>
  );
}
