import { createHeader } from "./utils";
import { isConnected } from "./store";

let device = null;

export async function connectToDevice() {
  if (!navigator.hid) {
    alert("WebHID is not supported in this browser");
    return false;
  }

  try {
    // Request device with vendor/product ID of LED name tag
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId: 0x0416, productId: 0x5020 }],
    });

    if (devices.length === 0) {
      alert("No device selected");
      return false;
    }

    device = devices[0];
    if (!device.opened) {
      await device.open();
    }

    isConnected.value = true;
    return true;
  } catch (error) {
    console.error("Error connecting:", error);
    return false;
  }
}

export async function toggleConnection() {
  if (isConnected.value) {
    if (device?.opened) {
      await device.close();
    }
    device = null;
    isConnected.value = false;
    return false;
  } else {
    return connectToDevice();
  }
}

export async function sendPacket(data) {
  if (!device?.opened) {
    alert("Device not connected");
    return false;
  }

  try {
    await device.sendReport(0, data);
    return true;
  } catch (error) {
    console.error("Error sending:", error);
    return false;
  }
}

export async function sendMessage(options) {
  const header = createHeader(options);
  const data = new Uint8Array(header.length + options.messageData.length);
  data.set(header);
  data.set(options.messageData, header.length);
  return sendPacket(data);
}
