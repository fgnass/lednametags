import { DisplayMode } from "./constants";

// Convert pixel data to device format (column-wise bytes)
export function framesToDeviceFormat(bank) {
  // For animation mode, we need complete frames
  const width =
    bank.mode === DisplayMode.ANIMATION
      ? Math.ceil(bank.pixels[0].length / 44) * 44 // Round up to complete frames
      : bank.pixels[0].length;

  const columns = Math.ceil(width / 8);
  const result = new Uint8Array(columns * 11); // Each column needs 11 bytes

  // Process each column (of 8 pixels width)
  for (let col = 0; col < columns; col++) {
    const colOffset = col * 11;
    const pixelX = col * 8;

    // Fill 11 bytes for this column
    for (let y = 0; y < 11; y++) {
      let byte = 0;
      // Pack 8 horizontal pixels into one byte
      for (let bit = 0; bit < 8; bit++) {
        const x = pixelX + bit;
        if (x < bank.pixels[0].length && bank.pixels[y][x]) {
          byte |= 1 << (7 - bit);
        }
      }
      result[colOffset + y] = byte;
    }
  }

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
  const header = new Uint8Array(32); // Header is actually 32 bytes, not 64

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

  // Each column needs 11 bytes (one byte per row)
  bytes += columns * 11;

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
