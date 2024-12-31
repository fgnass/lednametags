import { signal } from "@preact/signals";
import { sync } from "../device";
import { Button } from "./Button";
import { Loader2, Usb } from "lucide-preact";

const isSyncing = signal(false);
const syncError = signal(null);

export default function DeviceControls() {
  const handleSync = async () => {
    isSyncing.value = true;
    syncError.value = null;

    try {
      const result = await sync();
      if (!result.success) {
        syncError.value = result.error;
      }
    } catch (error) {
      syncError.value = error.message || "Unknown error occurred";
    } finally {
      isSyncing.value = false;
    }
  };

  return (
    <div class="flex items-center gap-2">
      <Button
        onClick={handleSync}
        disabled={isSyncing.value}
        class="min-w-[100px] justify-center"
      >
        {isSyncing.value ? (
          <Loader2 class="animate-spin" />
        ) : (
          <>
            <Usb />
            Sync
          </>
        )}
      </Button>
      {syncError.value && (
        <div class="text-sm text-red-500">{syncError.value}</div>
      )}
    </div>
  );
}
