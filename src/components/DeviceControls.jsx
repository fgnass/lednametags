import { Usb, Unplug, Send } from "lucide-preact";
import { isConnected } from "../store";
import { connectToDevice, toggleConnection, uploadToDevice } from "../device";
import { Button } from "./Button";
export default function DeviceControls() {
  return (
    <div class="flex justify-center gap-4">
      {isConnected.value ? (
        <>
          <Button onClick={toggleConnection}>
            <Unplug />
            Disconnect
          </Button>
          <Button onClick={uploadToDevice}>
            <Send />
            Upload to Device
          </Button>
        </>
      ) : (
        <Button onClick={toggleConnection}>
          <Usb />
          Connect
        </Button>
      )}
    </div>
  );
}
