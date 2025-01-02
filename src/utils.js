import {
  DisplayMode,
  PACKET_SIZE,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from "./constants";

// Convert pixel data to device format (column-wise bytes)
export function framesToDeviceFormat(bank) {
  if (bank.mode === DisplayMode.ANIMATION) {
    // Animation mode: Split into SCREEN_WIDTH-pixel wide frames
    const frameWidth = SCREEN_WIDTH;
    const numFrames = Math.ceil(bank.pixels[0].length / frameWidth);
    const bytesPerFrame = 6 * SCREEN_HEIGHT; // 6 bytes × SCREEN_HEIGHT rows
    const totalBytes = numFrames * bytesPerFrame;
    const data = new Uint8Array(totalBytes).fill(0);

    // Process each frame
    for (let frame = 0; frame < numFrames; frame++) {
      const frameStart = frame * frameWidth;
      const frameByteStart = frame * bytesPerFrame;

      // Process each column in this frame
      for (let col = 0; col < 6; col++) {
        // Process each row in this column
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
          let byte = 0;
          // Pack 8 horizontal pixels into one byte
          for (let bit = 0; bit < 8; bit++) {
            const x = frameStart + col * 8 + bit;
            if (x < bank.pixels[0].length && bank.pixels[y][x]) {
              byte |= 1 << (7 - bit);
            }
          }
          // Store byte in column-major format
          data[frameByteStart + col * SCREEN_HEIGHT + y] = byte;
        }
      }
    }
    return data;
  } else {
    // Other modes: Pack pixels into columns
    // Calculate number of byte-columns needed (8 pixels per byte)
    const numCols = Math.ceil(bank.pixels[0].length / 8);
    const data = new Uint8Array(numCols * SCREEN_HEIGHT).fill(0);

    // Process each byte-column
    for (let col = 0; col < numCols; col++) {
      // Process each row in this column
      for (let y = 0; y < SCREEN_HEIGHT; y++) {
        let byte = 0;
        // Pack 8 horizontal pixels into one byte
        for (let bit = 0; bit < 8; bit++) {
          const x = col * 8 + bit;
          if (x < bank.pixels[0].length && bank.pixels[y][x]) {
            byte |= 1 << (7 - bit);
          }
        }
        // Store byte in column-major format (SCREEN_HEIGHT bytes per column)
        data[col * SCREEN_HEIGHT + y] = byte;
      }
    }
    return data;
  }
}

// Create test animation pattern
export function createTestPattern(alternate = false) {
  const data = new Uint8Array(24); // 6 bytes/frame × 4 frames

  if (alternate) {
    // Create an alternate pattern (e.g., moving from bottom to top)
    data.set([
      0b00000001, 0b00000001, 0b00000001, 0b00000001, 0b00000001, 0b00000001,
      0b00000010, 0b00000010, 0b00000010, 0b00000010, 0b00000010, 0b00000010,
      0b00000100, 0b00000100, 0b00000100, 0b00000100, 0b00000100, 0b00000100,
      0b00001000, 0b00001000, 0b00001000, 0b00001000, 0b00001000, 0b00001000,
    ]);
  } else {
    // Original pattern (moving from left to right)
    data.set([
      0b00000001, 0b00000010, 0b00000100, 0b00001000, 0b00010000, 0b00100000,
      0b00000001, 0b00000010, 0b00000100, 0b00001000, 0b00010000, 0b00100000,
      0b00000001, 0b00000010, 0b00000100, 0b00001000, 0b00010000, 0b00100000,
      0b00000001, 0b00000010, 0b00000100, 0b00001000, 0b00010000, 0b00100000,
    ]);
  }

  return data;
}

// Create header for device protocol
export function createHeader({
  modes = [DisplayMode.SCROLL_LEFT],
  speeds = [4],
  brightness = 100,
  blinks = [false],
  ants = [false],
  lengths = [5],
} = {}) {
  // Create header with template
  const header = new Uint8Array(PACKET_SIZE).fill(0);

  // Magic "wang"
  header.set([0x77, 0x61, 0x6e, 0x67]);

  // Set brightness (byte 5)
  if (brightness <= 25) header[5] = 0x40;
  else if (brightness <= 50) header[5] = 0x20;
  else if (brightness <= 75) header[5] = 0x10;
  // else default 100% == 0x00

  // Helper to ensure 8 values, repeating last value if needed
  const normalizeArray = (arr, defaultValue) => {
    const result = [...arr];
    while (result.length < 8) {
      result.push(result[result.length - 1] ?? defaultValue);
    }
    return result;
  };

  // Normalize all arrays to 8 elements
  const normalizedBlinks = normalizeArray(blinks, false);
  const normalizedAnts = normalizeArray(ants, false);
  const normalizedSpeeds = normalizeArray(speeds, 4).map((s) =>
    Math.min(Math.max(s - 1, 0), 7)
  );
  const normalizedModes = normalizeArray(modes, DisplayMode.SCROLL_LEFT);
  const normalizedLengths = normalizeArray(lengths, 0);

  // Pack blinks and ants into bytes 6 and 7
  header[6] = 0; // Clear blink byte first
  header[7] = 0; // Clear ants byte first
  normalizedBlinks.forEach((blink, i) => {
    header[6] |= (blink ? 1 : 0) << i;
  });
  normalizedAnts.forEach((ant, i) => {
    header[7] |= (ant ? 1 : 0) << i;
  });

  // Pack speeds and modes into bytes 8-15
  for (let i = 0; i < 8; i++) {
    header[8 + i] = (normalizedSpeeds[i] << 4) | normalizedModes[i];
  }

  // Pack message lengths into bytes 16-31 (2 bytes per length)
  normalizedLengths.forEach((length, i) => {
    header[16 + i * 2] = Math.floor(length / 256);
    header[17 + i * 2] = length % 256;
  });

  // Date bytes 38-43 are left at 0 since they're not visible on device

  return header;
}

// Calculate memory usage for a bank
export function calculateBankMemory(bank) {
  // Header is 32 bytes
  let bytes = 32;

  // Find the rightmost used pixel
  let maxX = 0;
  for (let y = 0; y < bank.pixels.length; y++) {
    for (let x = bank.pixels[y].length - 1; x >= 0; x--) {
      if (bank.pixels[y][x]) {
        maxX = Math.max(maxX, x);
        break;
      }
    }
  }

  // Calculate number of 8-pixel columns needed
  const columns = Math.ceil((maxX + 1) / 8);

  // Each column needs SCREEN_HEIGHT bytes (one byte per row)
  bytes += columns * SCREEN_HEIGHT;

  return bytes;
}

// Calculate total memory usage for all banks
export function calculateTotalMemory(banks) {
  return banks.reduce(
    (total, bank) => total + calculateBankMemory(bank.value),
    0
  );
}

// Memory constants
export const DEVICE_MEMORY = 4096; // 4K
export const MAX_CHARS = 750;
