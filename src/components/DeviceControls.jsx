import { signal } from "@preact/signals";
import { sync } from "../device";
import { Button } from "./Button";
import { Loader2, Upload } from "lucide-preact";
import { toast } from "./ToastMessage";

const isSyncing = signal(false);

export default function DeviceControls() {
  const handleSync = async () => {
    isSyncing.value = true;

    try {
      const result = await sync();
      if (result.success) {
        toast.show("Configuration uploaded successfully");
      } else {
        toast.show(result.error || "Failed to upload configuration", "error");
      }
    } catch (error) {
      toast.show(error.message || "Unknown error occurred", "error");
    } finally {
      isSyncing.value = false;
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing.value}
      title="Upload to device"
    >
      {isSyncing.value ? (
        <Loader2 class="animate-spin" />
      ) : (
        <>
          <Upload />
          Sync
        </>
      )}
    </Button>
  );
}
