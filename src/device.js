import { createHeader, framesToDeviceFormat } from "./utils";
import { isConnected, currentBankData, banks } from "./store";

let device = null;
let outputReport = null;

export async function connectToDevice() {
  console.log("Attempting to connect to device...");
  if (!navigator.hid) {
    alert("WebHID is not supported in this browser");
    return false;
  }

  try {
    const devices = await navigator.hid.requestDevice({
      filters: [
        {
          vendorId: 0x0416,
          productId: 0x5020,
          usagePage: 0xff00,
          usage: 0x0001,
        },
      ],
    });

    if (devices.length === 0) {
      alert("No device selected");
      return false;
    }

    device = devices[0];
    console.log("Device collections:", device.collections);

    // Find the output report we need
    for (const collection of device.collections) {
      console.log("Collection:", collection);
      for (const report of collection.outputReports) {
        console.log("Output report:", report);
        outputReport = report;
      }
    }

    if (!outputReport) {
      console.error("No suitable output report found");
      return false;
    }

    if (!device.opened) {
      await device.open();
    }

    isConnected.value = true;
    console.log("Device connected successfully");
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
    outputReport = null;
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
    console.log("Sending data to device:", {
      reportId: outputReport.reportId,
      dataLength: data.length,
      data: data,
    });
    await device.sendReport(outputReport.reportId, data);
    console.log("Data sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending data:", error);
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

export async function uploadToDevice() {
  console.log("Starting upload to device...");
  if (!isConnected.value) {
    const connected = await connectToDevice();
    if (!connected) {
      alert("Failed to connect to device");
      return false;
    }
  }

  for (const bankSignal of banks) {
    const bank = bankSignal.value;
    console.log("Preparing bank data:", bank);
    const header = createHeader({
      modes: [bank.mode],
      speeds: [bank.speed],
      brightness: 100, // Assuming full brightness
      messageLengths: [Math.ceil(bank.pixels[0].length / 8)],
    });

    const pixelData = framesToDeviceFormat(bank);
    const data = new Uint8Array(header.length + pixelData.length);
    data.set(header);
    data.set(pixelData, header.length);

    console.log("Uploading bank data:", {
      headerLength: header.length,
      pixelDataLength: pixelData.length,
      totalLength: data.length,
    });

    const success = await sendPacket(data);
    if (!success) {
      console.error("Failed to upload bank");
      return false;
    }
  }

  console.log("Upload completed successfully");
  return true;
}
