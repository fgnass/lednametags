import { render } from "preact";
import App from "./App";
import "./index.css";

render(<App />, document.getElementById("root"));

function poc() {
  // Constants from the Python code
  const VENDOR_ID = 0x0416;
  const PRODUCT_ID = 0x5020;
  const PACKET_SIZE = 64;

  // Constants for display modes
  const DisplayMode = {
    SCROLL_LEFT: 0,
    SCROLL_RIGHT: 1,
    SCROLL_UP: 2,
    SCROLL_DOWN: 3,
    STILL: 4,
    ANIMATION: 5,
    DROP_DOWN: 6,
    CURTAIN: 7,
    LASER: 8,
  };

  // Constants for brightness levels
  const Brightness = {
    PERCENT_25: 0x40,
    PERCENT_50: 0x20,
    PERCENT_75: 0x10,
    PERCENT_100: 0x00,
  };

  function createHeader({
    mode = DisplayMode.SCROLL_LEFT,
    speed = 4,
    brightness = 100,
    blink = false,
    ants = false,
    messageLength = 5,
  } = {}) {
    // Validate and adjust speed (1-8)
    speed = Math.max(1, Math.min(8, speed));

    // Convert speed to device format (0-7)
    const deviceSpeed = speed - 1;

    // Calculate brightness byte
    let brightnessValue = Brightness.PERCENT_100;
    if (brightness <= 25) brightnessValue = Brightness.PERCENT_25;
    else if (brightness <= 50) brightnessValue = Brightness.PERCENT_50;
    else if (brightness <= 75) brightnessValue = Brightness.PERCENT_75;

    // Create header
    const header = new Uint8Array(64);

    // Magic "wang"
    header[0] = 0x77;
    header[1] = 0x61;
    header[2] = 0x6e;
    header[3] = 0x67;

    // Brightness settings
    header[4] = 0x00; // Normal brightness
    header[5] = brightnessValue;

    // Effects
    header[6] = blink ? 0x01 : 0x00; // Blink effect
    header[7] = ants ? 0x01 : 0x00; // Animated border

    // Speed and mode for first message
    header[8] = (deviceSpeed << 4) | mode;

    // Fill remaining speeds/modes with default values
    for (let i = 1; i < 8; i++) {
      header[8 + i] = 0x40; // Default value from Python code
    }

    // Message length (in byte-columns)
    header[16] = messageLength / 256;
    header[17] = messageLength % 256;

    return header;
  }

  function createSimpleTestAnimation() {
    // For 4 frames:
    // - Each frame is 6 bytes wide × 11 pixels high
    // - Each byte represents 8 horizontal pixels
    // - Each column is 11 bytes high
    // - Total size is 24 columns × 11 rows = 264 bytes
    const animationData = new Uint8Array(264).fill(0); // 24 columns × 11 rows

    // Helper function to set a pixel in a specific frame
    function setPixel(frame, x, y) {
      // Calculate which byte column and bit position within the frame
      const frameStartCol = frame * 6; // Each frame starts 6 columns over
      const byteCol = frameStartCol + Math.floor(x / 8); // Which byte column within the frame
      const bitPos = 7 - (x % 8); // Which bit within the byte (MSB = leftmost)
      const byteIndex = byteCol * 11 + y; // Final byte index
      animationData[byteIndex] |= 1 << bitPos;
    }

    // Frame 1: Vertical line in leftmost column
    for (let y = 0; y < 11; y++) {
      setPixel(0, 0, y);
    }

    // Frame 2: Two vertical lines
    for (let y = 0; y < 11; y++) {
      setPixel(1, 0, y); // Left line
      setPixel(1, 7, y); // Right line
    }

    // Frame 3: Three vertical lines
    for (let y = 0; y < 11; y++) {
      setPixel(2, 0, y); // Left line
      setPixel(2, 3, y); // Middle line
      setPixel(2, 7, y); // Right line
    }

    // Frame 4: Four vertical lines
    for (let y = 0; y < 11; y++) {
      setPixel(3, 0, y); // Leftmost line
      setPixel(3, 2, y); // Left-middle line
      setPixel(3, 5, y); // Right-middle line
      setPixel(3, 7, y); // Rightmost line
    }

    // Log the layout for debugging
    console.log("Frame data:");
    for (let frame = 0; frame < 4; frame++) {
      const frameStart = frame * 6 * 11;
      console.log(`\nFrame ${frame + 1} (starting at byte ${frameStart}):`);
      for (let row = 0; row < 11; row++) {
        const rowBytes = [];
        for (let col = 0; col < 6; col++) {
          const byteIndex = frameStart + col * 11 + row;
          rowBytes.push(animationData[byteIndex].toString(2).padStart(8, "0"));
        }
        console.log(`Row ${row}: ${rowBytes.join(" ")}`);
      }
    }

    return animationData;
  }

  let device = null;

  // Try to reconnect to the last used device
  async function tryReconnect() {
    try {
      // Check if we have permission to access any HID devices
      const devices = await navigator.hid.getDevices();

      // Find our device among the permitted devices
      const matchingDevice = devices.find(
        (d) => d.vendorId === VENDOR_ID && d.productId === PRODUCT_ID
      );

      if (matchingDevice) {
        device = matchingDevice;
        console.log("Found previously connected device:", {
          productName: device.productName,
          manufacturerName: device.manufacturerName,
          vendorId: device.vendorId,
          productId: device.productId,
        });

        // Try to open the device
        if (!device.opened) {
          await device.open();
        }

        // Update UI
        const statusElement = document.getElementById("status");
        const connectButton = document.getElementById("connect");
        const sendButton = document.getElementById("send");

        statusElement.textContent = "Device reconnected!";
        connectButton.textContent = "Disconnect";
        sendButton.disabled = false;

        // Add disconnect handler
        device.addEventListener("disconnect", () => {
          console.log("Device disconnected");
          device = null;
          localStorage.removeItem("lastDeviceId");
          statusElement.textContent = "Device disconnected";
          connectButton.textContent = "Connect";
          sendButton.disabled = true;
        });
      }
    } catch (error) {
      console.log("Auto-reconnect failed:", error);
    }
  }

  async function sendPacket(data) {
    if (!device) {
      throw new Error("Device not connected");
    }

    // Create the output report
    const packet = new Uint8Array(PACKET_SIZE);
    packet.set(data.slice(0, PACKET_SIZE));

    // Find the output report
    const outputReport = device.collections[0].outputReports[0];
    if (!outputReport) {
      throw new Error("No output report found");
    }

    // Send using the correct report ID
    const reportId = outputReport.reportId || 0;
    console.log("Sending with report ID:", reportId);

    try {
      await device.sendReport(reportId, packet);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Send error:", error);
      throw error;
    }
  }

  async function clearDisplay() {
    if (!device) {
      throw new Error("Device not connected");
    }

    // Create a packet to clear the display
    const clearPacket = new Uint8Array(PACKET_SIZE).fill(0);

    // Find the output report
    const outputReport = device.collections[0].outputReports[0];
    if (!outputReport) {
      throw new Error("No output report found");
    }

    // Send using the correct report ID
    const reportId = outputReport.reportId || 0;
    console.log("Clearing display with report ID:", reportId);

    try {
      await device.sendReport(reportId, clearPacket);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error("Clear display error:", error);
      throw error;
    }
  }

  async function sendMessage(options = {}) {
    const statusElement = document.getElementById("status");

    try {
      await clearDisplay();

      // Set animation mode and speed
      options.mode = DisplayMode.ANIMATION;
      options.speed = 1; // Slowest speed to see each frame clearly
      options.messageLength = 24; // 6 bytes/frame × 4 frames = 24 byte-columns
      options.numFrames = 4; // Tell the device we have 4 frames

      // Create and send header
      const header = createHeader(options);

      // Log header for debugging
      console.log(
        "Header bytes:",
        Array.from(header)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" ")
      );

      await sendPacket(header);

      // Create animation data
      const messageData = createSimpleTestAnimation();

      // Only send the first 24 byte-columns (6 bytes × 4 frames × 11 rows)
      const bytesToSend = messageData.slice(0, 24 * 11);

      // Send animation data in 64-byte chunks
      for (let offset = 0; offset < bytesToSend.length; offset += 64) {
        const chunk = bytesToSend.slice(offset, offset + 64);
        console.log(
          `Sending chunk ${offset / 64 + 1}, length: ${chunk.length}, bytes:`,
          Array.from(chunk)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" ")
        );
        await sendPacket(chunk);
        // Add a small delay between chunks
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      statusElement.textContent = "Test animation sent to device!";
    } catch (error) {
      console.error("Error sending data:", error);
      statusElement.textContent = `Error: ${error.message}`;
    }
  }

  // Modified connectToDevice to store device ID
  async function connectToDevice() {
    const statusElement = document.getElementById("status");
    const connectButton = document.getElementById("connect");
    const sendButton = document.getElementById("send");

    try {
      console.log("Requesting HID device...");
      const devices = await navigator.hid.requestDevice({
        filters: [
          {
            vendorId: VENDOR_ID,
            productId: PRODUCT_ID,
            usagePage: 0xff00,
            usage: 0x0001,
          },
        ],
      });

      if (devices.length === 0) {
        throw new Error("No devices selected");
      }

      device = devices[0];
      // Store device info for reconnection
      localStorage.setItem(
        "lastDeviceId",
        `${device.vendorId}:${device.productId}`
      );

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

      // Update UI
      statusElement.textContent = "Device connected!";
      connectButton.textContent = "Disconnect";
      sendButton.disabled = false;

      // Add disconnect handler
      device.addEventListener("disconnect", () => {
        console.log("Device disconnected");
        device = null;
        localStorage.removeItem("lastDeviceId");
        statusElement.textContent = "Device disconnected";
        connectButton.textContent = "Connect";
        sendButton.disabled = true;
      });
    } catch (error) {
      console.error("Error connecting to device:", error);
      statusElement.textContent = `Error: ${error.message}`;
      device = null;
      localStorage.removeItem("lastDeviceId");
      connectButton.textContent = "Connect";
      sendButton.disabled = true;
    }
  }

  // Modified toggleConnection to clear stored device ID
  async function toggleConnection() {
    if (device) {
      await device.close();
      device = null;
      localStorage.removeItem("lastDeviceId");
      document.getElementById("connect").textContent = "Connect";
      document.getElementById("send").disabled = true;
      document.getElementById("status").textContent = "Device disconnected";
    } else {
      await connectToDevice();
    }
  }

  // Add click handlers
  const connectBtn = document.createElement("button");
  document.body.appendChild(connectBtn);
  connectBtn.id = "connect";
  connectBtn.textContent = "Connect";
  connectBtn.addEventListener("click", toggleConnection);

  const sendBtn = document.createElement("button");
  sendBtn.id = "send";
  sendBtn.textContent = "Send";
  document.body.appendChild(sendBtn);
  sendBtn.addEventListener("click", () => {
    // Get current values from controls
    sendMessage();
  });

  const statusElement = document.createElement("div");
  statusElement.id = "status";
  document.body.appendChild(statusElement);

  // Initialize
  if (navigator.hid) {
    // Try to reconnect to previously connected device
    tryReconnect();
  } else {
    document.getElementById("status").textContent =
      "WebHID is not supported in this browser. Please use Chrome or Edge.";
  }
}
