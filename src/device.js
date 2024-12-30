import { createHeader, framesToDeviceFormat } from "./utils";
import { isConnected, currentBankData, banks } from "./store";

const PACKET_SIZE = 64;
const PROTOCOL_HEADER = new Uint8Array([
  0x77, 0x61, 0x6e, 0x67, 0x00, 0x00, 0x00, 0x00, 0x40, 0x40, 0x40, 0x40, 0x40,
  0x40, 0x40, 0x40, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

let device = null;

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
    console.log("Selected device:", {
      productName: device.productName,
      manufacturerName: device.manufacturerName,
      vendorId: device.vendorId,
      productId: device.productId,
    });

    await device.open();
    console.log("Device opened");

    // Log detailed device capabilities
    if (device.collections && device.collections.length > 0) {
      const collection = device.collections[0];
      console.log("Device collection:", {
        usagePage: collection.usagePage,
        usage: collection.usage,
        inputReports: collection.inputReports.map((r) => ({
          reportId: r.reportId,
          items: r.items,
        })),
        outputReports: collection.outputReports.map((r) => ({
          reportId: r.reportId,
          items: r.items,
        })),
      });
    }

    // Send initial protocol header
    try {
      await sendPacket(PROTOCOL_HEADER);
      console.log("Protocol header sent successfully");
    } catch (error) {
      console.error("Error sending protocol header:", error);
      return false;
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
    isConnected.value = false;
    return false;
  } else {
    return connectToDevice();
  }
}

async function sendPacket(data) {
  if (!device?.opened) {
    alert("Device not connected");
    return false;
  }

  try {
    // Get output report from first collection
    const outputReport = device.collections[0].outputReports[0];
    if (!outputReport) {
      throw new Error("No output report found");
    }

    const reportId = outputReport.reportId || 0;
    console.log("Sending data:", {
      totalLength: data.length,
      reportId,
      collections: device.collections.length,
      outputReports: device.collections[0].outputReports.length,
      firstBytes: Array.from(data.slice(0, 4)).map((b) => b.toString(16)),
    });

    // Create fixed-size packet for first chunk
    const packet = new Uint8Array(PACKET_SIZE);
    packet.set(data.slice(0, PACKET_SIZE));

    try {
      await Promise.race([
        device.sendReport(reportId, packet),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout sending data")), 5000)
        ),
      ]);
      console.log("Data sent successfully");
    } catch (error) {
      console.error("Error sending data:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    return false;
  }
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

  // Collect all bank data first
  const modes = [];
  const speeds = [];
  const messageLengths = [];
  const allPixelData = [];

  for (const bankSignal of banks) {
    const bank = bankSignal.value;
    console.log("Preparing bank data:", bank);

    modes.push(bank.mode);
    speeds.push(bank.speed);
    messageLengths.push(Math.ceil(bank.pixels[0].length / 8));
    allPixelData.push(framesToDeviceFormat(bank));
  }

  // Create single header for all banks
  const header = createHeader({
    modes,
    speeds,
    brightness: 100,
    messageLengths,
  });

  // Calculate total size and create final buffer
  const totalPixelLength = allPixelData.reduce(
    (sum, data) => sum + data.length,
    0
  );
  const data = new Uint8Array(header.length + totalPixelLength);

  // Add header
  data.set(header);

  // Add all pixel data sequentially
  let offset = header.length;
  for (const pixelData of allPixelData) {
    data.set(pixelData, offset);
    offset += pixelData.length;
  }

  console.log("Uploading all bank data:", {
    headerLength: header.length,
    pixelDataLength: totalPixelLength,
    totalLength: data.length,
  });

  const success = await sendPacket(data);
  if (!success) {
    console.error("Failed to upload banks");
    return false;
  }

  console.log("Upload completed successfully");
  return true;
}
