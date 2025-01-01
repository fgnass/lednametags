import { useEffect } from "preact/hooks";
import { loadState } from "./share";
import { banks, currentBank } from "./store";
import BankSelector from "./components/BankSelector";
import GitHubLink from "./components/GitHubLink";
import DeviceControls from "./components/DeviceControls";
import LEDMatrix from "./components/LEDMatrix";
import MemoryStats from "./components/MemoryStats";
import NavigationControls from "./components/NavigationControls";
import EditPanel from "./components/EditPanel";
import PlaybackControls from "./components/PlaybackControls";
import ShareButton from "./components/ShareButton";

export default function App() {
  useEffect(() => {
    // Check for shared state
    const url = new URL(window.location.href);
    const stateId = url.searchParams.get("state");

    if (stateId) {
      loadState(stateId).then(({ success, state, error }) => {
        if (success && state) {
          // Load the shared state
          currentBank.value = state.currentBank;
          state.banks.forEach((bankData, i) => {
            banks[i].value = bankData;
          });

          // Remove state param from URL
          url.searchParams.delete("state");
          window.history.replaceState({}, "", url);
        } else {
          console.error("Failed to load shared state:", error);
        }
      });
    }
  }, []);

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
            <ShareButton />
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
