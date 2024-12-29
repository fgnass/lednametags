import { signal, computed } from "@preact/signals";
import { DisplayMode } from "./constants";
import { textToPixels } from "./fonts";

// Bank data structure
function createBank() {
  return {
    isAnimated: false,
    text: "",
    font: "5x7",
    pixels: Array(11)
      .fill()
      .map(() => Array(88).fill(false)),
    currentFrame: 0,
    viewport: 0,
  };
}

// Store
export const currentBank = signal(0);
export const isConnected = signal(false);
export const isPlaying = signal(false);

// Create a signal for each bank
export const banks = Array(8)
  .fill()
  .map(() => signal(createBank()));

// Animation playback
let playbackTimer = null;

export function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

function startPlayback() {
  if (playbackTimer) return;
  isPlaying.value = true;
  playbackTimer = setInterval(() => {
    const bank = banks[currentBank.value].value;
    if (bank.isAnimated) {
      const nextFrameIndex = (bank.currentFrame + 1) % frameCount.value;
      const data = { ...bank };
      data.currentFrame = nextFrameIndex;
      banks[currentBank.value].value = data;
    }
  }, 200); // 5fps
}

function stopPlayback() {
  if (playbackTimer) {
    clearInterval(playbackTimer);
    playbackTimer = null;
  }
  isPlaying.value = false;
}

// Computed values
export const currentBankData = computed(() => banks[currentBank.value].value);

export const currentFrame = computed(() => {
  const bank = currentBankData.value;
  const start = bank.isAnimated ? bank.currentFrame * 44 : bank.viewport;
  const end = start + 44;
  return bank.pixels.map((row) => {
    if (end > row.length) {
      return [...row, ...Array(end - row.length).fill(false)].slice(start, end);
    }
    return row.slice(start, end);
  });
});

export const frameCount = computed(() => {
  const bank = currentBankData.value;
  if (!bank.isAnimated) return 1;
  return Math.ceil(bank.pixels[0].length / 44);
});

// Actions
export function togglePixel(x, y) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  const actualX =
    x + (data.isAnimated ? data.currentFrame * 44 : data.viewport);
  data.pixels[y][actualX] = !data.pixels[y][actualX];

  bank.value = data;
}

export function setText(text) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value, text };
  const textPixels = textToPixels(text, data.font);
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 44; x++) {
      data.pixels[y][x] = textPixels[y][x];
    }
  }
  bank.value = data;
}

export function setFont(font) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value, font };
  bank.value = data;
  setText(data.text); // Rerender text with new font
}

export function toggleAnimation() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  data.isAnimated = !data.isAnimated;
  data.currentFrame = 0;
  data.viewport = 0;
  bank.value = data;
}

export function clearImage() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  if (data.isAnimated) {
    // Clear just the current frame
    const start = data.currentFrame * 44;
    const end = start + 44;
    data.pixels = data.pixels.map((row) => {
      const newRow = [...row];
      for (let x = start; x < end; x++) {
        newRow[x] = false;
      }
      return newRow;
    });
  } else {
    data.pixels = Array(11)
      .fill()
      .map(() => Array(88).fill(false));
  }

  bank.value = data;
}

export function invertImage() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  if (data.isAnimated) {
    // Invert just the current frame
    const start = data.currentFrame * 44;
    const end = start + 44;
    data.pixels = data.pixels.map((row) => {
      const newRow = [...row];
      for (let x = start; x < end; x++) {
        newRow[x] = !newRow[x];
      }
      return newRow;
    });
  } else {
    data.pixels = data.pixels.map((row) => row.map((pixel) => !pixel));
  }

  bank.value = data;
}

export function nextFrame() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  data.currentFrame = (data.currentFrame + 1) % frameCount.value;
  bank.value = data;
}

export function prevFrame() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  data.currentFrame =
    (data.currentFrame - 1 + frameCount.value) % frameCount.value;
  bank.value = data;
}

export function scrollImage(direction) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  if (data.isAnimated) return; // Only scroll in non-animated mode

  if (direction === "left") {
    data.viewport = Math.max(0, data.viewport - 1);
  } else {
    data.viewport++;
  }

  bank.value = data;
}

export function addFrame() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  // Clone the current frame's pixels
  const start = data.currentFrame * 44;
  const end = start + 44;
  const newPixels = data.pixels.map((row) => {
    const newRow = [...row];
    // Insert a copy of the current frame after itself
    newRow.splice(end, 0, ...row.slice(start, end));
    return newRow;
  });

  data.pixels = newPixels;
  data.currentFrame++; // Move to the newly inserted frame
  bank.value = data;
}
