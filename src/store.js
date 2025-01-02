import { signal, computed } from "@preact/signals";
import { DisplayMode, SCREEN_WIDTH, SCREEN_HEIGHT } from "./constants";
import { textToPixels } from "./fonts";
import { calculateBankMemory, DEVICE_MEMORY } from "./utils";
import {
  frameCount,
  stopPlayback,
  startPlayback,
  isPlaying,
  previewState,
  createLaserFrame,
  createCurtainFrame,
  startBlinkAnimation,
  cancelBlinkAnimation,
} from "./animation";

// Bank data structure
function createBank() {
  return {
    mode: DisplayMode.STATIC,
    text: "",
    pixels: Array(SCREEN_HEIGHT)
      .fill()
      .map(() => Array(SCREEN_WIDTH).fill(false)),
    currentFrame: 0,
    viewport: 0,
    speed: 7, // Default speed (7 = 7.5 fps)
    blink: false,
    ants: false,
    font: null, // Default to no font selected
  };
}

// Store
export const currentBank = signal(0);
export const isConnected = signal(false);

// Load state from local storage or create initial state
const savedState = JSON.parse(
  localStorage.getItem("lednametags-state") || "null"
);

// Create a signal for each bank
export const banks = Array(8)
  .fill()
  .map((_, i) => signal(savedState?.banks?.[i] || createBank()));

// Restore current bank
if (savedState?.currentBank != null) {
  currentBank.value = savedState.currentBank;
}

// Subscribe to state changes and save to local storage
function saveState() {
  const state = {
    currentBank: currentBank.value,
    banks: banks.map((bank) => bank.value),
  };
  localStorage.setItem("lednametags-state", JSON.stringify(state));
}

// Watch for changes
currentBank.subscribe(saveState);
banks.forEach((bank) => bank.subscribe(saveState));

// Computed values
export const currentBankData = computed(() => banks[currentBank.value].value);

export const bankHasData = computed(() =>
  banks.map((bank) => {
    const data = bank.value;
    return (
      data.pixels.some((row) => row.some((pixel) => pixel)) ||
      Boolean(data.text.trim())
    );
  })
);

export const bankMemory = computed(() =>
  banks.map((bank) => calculateBankMemory(bank.value))
);

// Helper to find the rightmost pixel in a frame
function findRightmostPixel(pixels) {
  for (let x = pixels[0].length - 1; x >= 0; x--) {
    for (let y = 0; y < pixels.length; y++) {
      if (pixels[y][x]) {
        return x;
      }
    }
  }
  return -1;
}

// Helper to determine if mode needs device-style centering
function shouldDeviceCenter(mode) {
  return (
    mode === DisplayMode.STATIC ||
    mode === DisplayMode.LASER ||
    mode === DisplayMode.CURTAIN
  );
}

// Helper to apply device-style centering
function applyDeviceCentering(pixels) {
  const rightmost = findRightmostPixel(pixels);
  if (rightmost === -1) return pixels; // No pixels to center

  // Calculate how many pixels of space are on the right
  const rightSpace = SCREEN_WIDTH - 1 - rightmost;

  // Calculate how many pixels to shift right (half the space)
  const shift = Math.floor(rightSpace / 2);
  if (shift <= 0) return pixels;

  // Create new array with shifted content
  return pixels.map((row) => {
    const newRow = Array(SCREEN_WIDTH).fill(false);
    row.forEach((pixel, x) => {
      if (pixel && x + shift < SCREEN_WIDTH) {
        newRow[x + shift] = true;
      }
    });
    return newRow;
  });
}

export const currentFrame = computed(() => {
  // Use preview state if available
  const state = previewState.value || currentBankData.value;

  let frame;

  if (state.mode === DisplayMode.LASER && previewState.value) {
    frame = createLaserFrame(
      state.pixels,
      previewState.value.laserX,
      previewState.value.targetX,
      previewState.value.activePixels,
      previewState.value.leftmostPixel,
      previewState.value.isCleanup
    );
  } else if (state.mode === DisplayMode.CURTAIN && previewState.value) {
    frame = createCurtainFrame(
      state.pixels,
      previewState.value.curtainPos,
      previewState.value.curtainPhase === "closing"
    );
  } else if (
    state.mode === DisplayMode.SCROLL_UP ||
    state.mode === DisplayMode.SCROLL_DOWN
  ) {
    // For vertical scrolling, take a slice of rows
    // Handle negative viewport by showing blank rows
    const viewport = Math.max(0, state.viewport);
    frame = state.pixels
      .slice(viewport, viewport + 11)
      .map((row) => row.slice(0, 44));
  } else {
    // For horizontal modes
    const start =
      state.mode === DisplayMode.ANIMATION
        ? state.currentFrame * 44
        : state.viewport;
    const end = start + 44;
    frame = state.pixels.map((row) => {
      if (start < 0) {
        // Handle negative viewport by showing blank columns
        const visible = row.slice(0, Math.max(0, end));
        return [...Array(Math.min(44, -start)).fill(false), ...visible];
      }
      if (start >= row.length) {
        return Array(44).fill(false);
      }
      if (end > row.length) {
        return [...row.slice(start), ...Array(end - row.length).fill(false)];
      }
      return row.slice(start, end);
    });
  }

  // Apply device-style centering for non-scrolling modes
  if (shouldDeviceCenter(state.mode)) {
    frame = applyDeviceCentering(frame);
  }

  // Apply post-processing effects
  const effectState = {
    blink: state.blink,
    blinkState: previewState.value?.blinkState ?? blinkState.value,
    ants: currentBankData.value.ants,
  };
  return applyEffects(frame, effectState);
});

// Actions
export function togglePixel(x, y) {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  const actualX =
    x +
    (data.mode === DisplayMode.ANIMATION
      ? data.currentFrame * 44
      : data.viewport);
  data.pixels[y][actualX] = !data.pixels[y][actualX];

  bank.value = data;
}

export function setText(text) {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  const oldWidth = data.pixels?.[0]?.length ?? 0;
  const oldViewport = data.viewport;

  data.text = text;
  const font = data.font || fonts.value[0];
  // Don't center text - let device centering handle it
  data.pixels = textToPixels(text, font, false);

  // If pixels array is empty or undefined, create a default one
  if (!data.pixels || !data.pixels.length) {
    data.pixels = Array(SCREEN_HEIGHT)
      .fill()
      .map(() => Array(SCREEN_WIDTH).fill(false));
  }

  // Handle scrolling behavior for horizontal modes
  if (
    data.mode === DisplayMode.SCROLL_LEFT ||
    data.mode === DisplayMode.SCROLL_RIGHT
  ) {
    const textWidth = data.pixels[0].length;

    if (textWidth > SCREEN_WIDTH) {
      if (textWidth > oldWidth) {
        // Text got longer - show the end
        data.viewport = textWidth - SCREEN_WIDTH;
      } else {
        // Text got shorter - preserve viewport but don't exceed bounds
        data.viewport = Math.min(oldViewport, textWidth - SCREEN_WIDTH);
      }
    } else {
      // Text fits on screen, reset viewport
      data.viewport = 0;
    }
  } else {
    // For non-scrolling modes, always reset viewport
    data.viewport = 0;
  }

  bank.value = data;
}

export function setMode(mode) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value, mode };
  data.currentFrame = 0;
  data.viewport = 0;

  // Re-render text with appropriate centering if there is text
  if (data.text) {
    const font = data.font || fonts.value[0];
    data.pixels = textToPixels(data.text, font, shouldCenterText(mode));
  }

  bank.value = data;

  // Restart playback if running
  if (isPlaying.value) {
    stopPlayback();
    startPlayback();
  }
}

export function clearImage() {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value, text: "" }; // Clear text as well

  if (data.mode === DisplayMode.ANIMATION) {
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
    data.pixels = Array(SCREEN_HEIGHT)
      .fill()
      .map(() => Array(SCREEN_WIDTH * 2).fill(false));
    data.viewport = 0; // Reset viewport to 0
  }

  bank.value = data;
}

export function invertImage() {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  if (data.mode === DisplayMode.ANIMATION) {
    // Invert just the current frame
    const start = data.currentFrame * SCREEN_WIDTH;
    const end = start + SCREEN_WIDTH;
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
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  data.currentFrame = (data.currentFrame + 1) % frameCount.value;
  bank.value = data;
}

export function prevFrame() {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  data.currentFrame =
    (data.currentFrame - 1 + frameCount.value) % frameCount.value;
  bank.value = data;
}

export function scrollImage(direction) {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  if (data.mode === DisplayMode.ANIMATION) return; // Only scroll in non-animated mode

  if (direction === "left") {
    data.viewport = Math.max(0, data.viewport - 1);
  } else {
    data.viewport++;
  }

  bank.value = data;
}

export function addFrame() {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  // Clone the current frame's pixels
  const start = data.currentFrame * SCREEN_WIDTH;
  const end = start + SCREEN_WIDTH;
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

// Add speed control action
export function setSpeed(speed) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value, speed };
  bank.value = data;

  // Restart playback if running to apply new speed
  if (isPlaying.value) {
    stopPlayback();
    startPlayback();
  }
}

export function deleteFrame() {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  // Don't delete if it's the last frame
  if (frameCount.value <= 1) return;

  const start = data.currentFrame * SCREEN_WIDTH;

  // Remove the current frame's pixels
  data.pixels = data.pixels.map((row) => {
    const newRow = [...row];
    newRow.splice(start, SCREEN_WIDTH);
    return newRow;
  });

  // Adjust current frame if we're at the end
  if (data.currentFrame >= frameCount.value - 1) {
    data.currentFrame = frameCount.value - 2;
  }

  bank.value = data;
}

// Memory stats
export const memoryUsage = computed(() => {
  return banks.reduce(
    (total, bank) => total + calculateBankMemory(bank.value),
    0
  );
});

export const memoryPercent = computed(() => {
  return Math.round((memoryUsage.value / DEVICE_MEMORY) * 100);
});

export function setBlink(value) {
  const bank = banks[currentBank.value];
  bank.value = { ...bank.value, blink: value };

  // If we're playing, handle the blink animation and update preview state
  if (isPlaying.value) {
    if (value) {
      startBlinkAnimation();
    } else {
      cancelBlinkAnimation();
    }

    // Update preview state if it exists
    if (previewState.value) {
      previewState.value = {
        ...previewState.value,
        blink: value,
      };
    }
  }
}

export function setAnts(value) {
  const bank = banks[currentBank.value];
  bank.value = { ...bank.value, ants: value };
}

export function setFont(fontName) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value, font: fontName };
  bank.value = data;
  setText(data.text); // Re-render text with new font
}

export function translateImage(direction) {
  if (isPlaying.value) return;
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  // Check if we have any pixels to translate
  if (!data.pixels?.length || !data.pixels[0]?.length) return;

  if (data.mode === DisplayMode.ANIMATION) {
    // For animation mode, only translate current frame
    const start = data.currentFrame * SCREEN_WIDTH;
    const end = start + SCREEN_WIDTH;
    const framePixels = data.pixels.map((row) => row.slice(start, end));

    // Translate frame pixels
    const translatedFrame = translatePixels(framePixels, direction);

    // Put translated frame back
    data.pixels = data.pixels.map((row, y) => {
      const newRow = [...row];
      for (let x = 0; x < SCREEN_WIDTH; x++) {
        newRow[start + x] = translatedFrame[y][x];
      }
      return newRow;
    });
  } else {
    // For other modes, translate all pixels
    data.pixels = translatePixels(data.pixels, direction);
  }

  bank.value = data;
}

// Helper function to translate a pixel array in a given direction
function translatePixels(pixels, direction) {
  const height = pixels.length;
  const width = pixels[0].length;
  const result = Array(height)
    .fill()
    .map(() => Array(width).fill(false));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let newX = x;
      let newY = y;

      switch (direction) {
        case "left":
          newX = (x + width - 1) % width;
          break;
        case "right":
          newX = (x + 1) % width;
          break;
        case "up":
          newY = (y + height - 1) % height;
          break;
        case "down":
          newY = (y + 1) % height;
          break;
      }

      result[newY][newX] = pixels[y][x];
    }
  }

  return result;
}
