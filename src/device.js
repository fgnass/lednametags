import { DisplayMode, VENDOR_ID, PRODUCT_ID, PACKET_SIZE } from "./constants";
import { isConnected, banks } from "./store";
import { createHeader, framesToDeviceFormat } from "./utils";

let device = null;

export async function connectToDevice() {
  try {
    const devices = await navigator.hid.requestDevice({
      filters: [{ vendorId: VENDOR_ID, productId: PRODUCT_ID }],
    });

    if (devices.length === 0) {
      throw new Error("No device selected");
    }

    device = devices[0];
    await device.open();
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

async function sendPacket(data) {
  if (!device) {
    throw new Error("Device not connected");
  }

  // Send data in 64-byte chunks
  for (let offset = 0; offset < data.length; offset += PACKET_SIZE) {
    const packet = new Uint8Array(PACKET_SIZE);
    const chunk = data.slice(
      offset,
      Math.min(offset + PACKET_SIZE, data.length)
    );
    packet.set(chunk);

    const reportId = 0;
    await device.sendReport(reportId, packet);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

export async function uploadToDevice() {
  if (!device) {
    throw new Error("Device not connected");
  }

  try {
    // Send empty packet to clear display
    await sendPacket(new Uint8Array(PACKET_SIZE));

    // Initialize arrays for all 8 banks
    const modes = new Array(8).fill(0);
    const speeds = new Array(8).fill(0);
    const lengths = new Array(8).fill(0);
    const blinks = new Array(8).fill(false);
    const ants = new Array(8).fill(false);

    // First pass: calculate total size and collect bank data
    const bankData = [];
    let totalBytes = 0;

    for (let i = 0; i < banks.length; i++) {
      const bank = banks[i].value;
      if (bank.pixels.some((row) => row.some((pixel) => pixel))) {
        const data = framesToDeviceFormat(bank);
        bankData.push(data);
        const numCols = data.length / 11;
        lengths[i] = numCols;
        modes[i] = bank.mode;
        speeds[i] = bank.speed;
        totalBytes += data.length;
      }
    }

    // Only proceed if we have banks with data
    if (bankData.length > 0) {
      // Create header
      const header = createHeader({
        modes,
        speeds,
        lengths,
        blinks,
        ants,
      });
      await sendPacket(header);

      // Combine all bank data into a single buffer
      const combinedData = new Uint8Array(totalBytes);
      let offset = 0;
      for (const data of bankData) {
        combinedData.set(data, offset);
        offset += data.length;
      }

      // Send the combined data
      await sendPacket(combinedData);
    }

    return true;
  } catch (error) {
    console.error("Error:", error);
    return false;
  }
}
