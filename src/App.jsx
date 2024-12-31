import BankSelector from "./components/BankSelector";
import GitHubLink from "./components/GitHubLink";
import DeviceControls from "./components/DeviceControls";
import LEDMatrix from "./components/LEDMatrix";
import MemoryStats from "./components/MemoryStats";
import NavigationControls from "./components/NavigationControls";
import EditPanel from "./components/EditPanel";
import PlaybackControls from "./components/PlaybackControls";

export default function App() {
  return (
    <div class="min-h-screen bg-gray-900 text-white p-8 flex">
      <div class="mx-auto flex flex-col space-y-8">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <BankSelector />
            <PlaybackControls />
          </div>
          <div class="flex items-center gap-4">
            <MemoryStats />
            <DeviceControls />
          </div>
        </div>
        <LEDMatrix />
        <NavigationControls />
        <EditPanel />
        <div class="flex justify-end">
          <GitHubLink />
        </div>
      </div>
    </div>
  );
}
