import { DisplayMode } from "./constants";

// Convert frames to device format (each byte represents 8 vertical pixels)
export function framesToDeviceFormat(frames) {
  const result = new Uint8Array(frames.length * 11 * 6); // 11 rows × 6 bytes per row

  frames.forEach((frame, frameIndex) => {
    const frameOffset = frameIndex * 11 * 6;

    for (let x = 0; x < 44; x++) {
      const byteIndex = Math.floor(x / 8);
      const bitPosition = 7 - (x % 8);

      for (let y = 0; y < 11; y++) {
        if (frame[y][x]) {
          const index = frameOffset + byteIndex * 11 + y;
          result[index] |= 1 << bitPosition;
        }
      }
    }
  });

  return result;
}

// Create header for device protocol
export function createHeader({
  modes = [DisplayMode.SCROLL_LEFT],
  speeds = [4],
  brightness = 100,
  blink = false,
  ants = false,
  messageLengths = [5],
} = {}) {
  const header = new Uint8Array(64);

  // Magic bytes
  header[0] = 0x77;
  header[1] = 0x61;
  header[2] = 0x6e;
  header[3] = 0x67;

  // Brightness (0-100)
  header[4] = Math.max(0, Math.min(100, brightness));

  // Modes for each bank
  for (let i = 0; i < 8; i++) {
    header[5 + i] = modes[i] || modes[0];
  }

  // Speeds for each bank (1-8)
  for (let i = 0; i < 8; i++) {
    const speed = speeds[i] || speeds[0];
    header[13 + i] = Math.max(1, Math.min(8, speed)) - 1;
  }

  // Message lengths for each bank
  for (let i = 0; i < 8; i++) {
    header[21 + i] = messageLengths[i] || messageLengths[0];
  }

  // Effects
  header[29] = blink ? 1 : 0;
  header[30] = ants ? 1 : 0;

  return header;
}
