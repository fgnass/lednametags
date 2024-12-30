import { signal, computed } from "@preact/signals";
import { DisplayMode, SPEED_FPS } from "./constants";
import { textToPixels, fonts, currentFont } from "./fonts";
import { calculateBankMemory, DEVICE_MEMORY } from "./utils";

// Helper to ensure we always create proper 2D arrays
function create2DArray(rows, cols) {
  return Array(rows)
    .fill()
    .map(() => Array(cols).fill(false));
}

// Helper to ensure loaded bank data has proper arrays
function ensureBankArrays(bank) {
  if (!bank) return createBank();
  return {
    ...bank,
    pixels: Array.isArray(bank.pixels)
      ? bank.pixels.map((row) =>
          Array.isArray(row) ? [...row] : Array(row.length).fill(false)
        )
      : create2DArray(11, 44),
  };
}

// Bank data structure
function createBank() {
  return {
    mode: DisplayMode.STATIC,
    text: "",
    pixels: create2DArray(11, 44),
    currentFrame: 0,
    viewport: 0,
    speed: 7, // Default speed (7 = 7.5 fps)
  };
}

// Store
export const currentBank = signal(0);
export const isConnected = signal(false);
export const isPlaying = signal(false);

// Load state from local storage or create initial state
const savedState = JSON.parse(
  localStorage.getItem("lednametags-state") || "null"
);

// Create a signal for each bank
export const banks = Array(8)
  .fill()
  .map((_, i) => signal(ensureBankArrays(savedState?.banks[i])));

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

// Animation playback
let playbackTimer = null;
let initialViewport = 0; // Store initial viewport position

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

  // Store initial viewport position
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  initialViewport = data.viewport;

  // Reset viewport to start position
  if (
    data.mode === DisplayMode.SCROLL_RIGHT ||
    data.mode === DisplayMode.SCROLL_DOWN
  ) {
    data.viewport =
      data.mode === DisplayMode.SCROLL_RIGHT
        ? data.pixels[0].length - 44
        : data.pixels.length - 11;
  } else {
    data.viewport = 0;
  }

  // For vertical scrolling, we need a larger pixel array
  if (
    data.mode === DisplayMode.SCROLL_UP ||
    data.mode === DisplayMode.SCROLL_DOWN
  ) {
    // Create a double-height array for smooth scrolling
    const blankRows = create2DArray(11, data.pixels[0].length);

    // For scroll up, add blank rows at the top
    if (data.mode === DisplayMode.SCROLL_UP) {
      data.pixels = [...blankRows, ...data.pixels];
      data.viewport = 0; // Start at the blank rows
    } else {
      // For scroll down, add blank rows at the bottom
      data.pixels = [...data.pixels, ...blankRows];
      data.viewport = data.pixels.length - 11; // Start at the content
    }
  }

  banks[currentBank.value].value = data;

  const fps = SPEED_FPS[data.speed - 1];
  const interval = Math.round(1000 / fps);

  // Cache frequently accessed values
  const bankSignal = banks[currentBank.value];
  const mode = data.mode;
  const maxViewport =
    mode === DisplayMode.SCROLL_RIGHT || mode === DisplayMode.SCROLL_DOWN
      ? 0
      : data.pixels[0].length - 44;

  // Use requestAnimationFrame for smoother animation
  let lastFrameTime = 0;
  let frameCounter = 0;

  const animate = (timestamp) => {
    if (!isPlaying.value) return;

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= interval) {
      const currentData = bankSignal.value;
      const newData = { ...currentData };

      switch (mode) {
        case DisplayMode.ANIMATION:
          newData.currentFrame = (newData.currentFrame + 1) % frameCount.value;
          break;
        case DisplayMode.SCROLL_LEFT:
          newData.viewport = (newData.viewport + 1) % newData.pixels[0].length;
          break;
        case DisplayMode.SCROLL_RIGHT:
          newData.viewport = Math.max(0, newData.viewport - 1);
          break;
        case DisplayMode.SCROLL_UP:
          newData.viewport = Math.min(
            newData.viewport + 1,
            newData.pixels.length - 11
          );
          break;
        case DisplayMode.SCROLL_DOWN:
          newData.viewport = Math.max(0, newData.viewport - 1);
          break;
      }

      bankSignal.value = newData;
      lastFrameTime = timestamp;
    }

    playbackTimer = requestAnimationFrame(animate);
  };

  playbackTimer = requestAnimationFrame(animate);
}

function stopPlayback() {
  if (playbackTimer) {
    cancelAnimationFrame(playbackTimer);
    playbackTimer = null;
  }
  isPlaying.value = false;

  // Reset pixel array size after vertical scrolling and restore viewport
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  if (
    data.mode === DisplayMode.SCROLL_UP ||
    data.mode === DisplayMode.SCROLL_DOWN
  ) {
    // For scroll up, remove the blank rows from the top
    if (data.mode === DisplayMode.SCROLL_UP) {
      data.pixels = data.pixels.slice(11);
    } else {
      // For scroll down, remove the blank rows from the bottom
      data.pixels = data.pixels.slice(0, -11);
    }
  }

  // Restore initial viewport position
  data.viewport = initialViewport;
  banks[currentBank.value].value = data;
}

// Computed values
export const currentBankData = computed(() => banks[currentBank.value].value);

export const bankHasData = computed(() =>
  banks.map((bank) => {
    const data = bank.value;
    return (
      (Array.isArray(data.pixels) &&
        data.pixels.some(
          (row) => Array.isArray(row) && row.some((pixel) => pixel)
        )) ||
      Boolean(data.text.trim())
    );
  })
);

export const bankMemory = computed(() =>
  banks.map((bank) => calculateBankMemory(bank.value))
);

export const currentFrame = computed(() => {
  const bank = currentBankData.value;

  if (
    bank.mode === DisplayMode.SCROLL_UP ||
    bank.mode === DisplayMode.SCROLL_DOWN
  ) {
    // For vertical scrolling, take a slice of rows
    return bank.pixels
      .slice(bank.viewport, bank.viewport + 11)
      .map((row) => row.slice(0, 44));
  }

  // For horizontal modes
  const start =
    bank.mode === DisplayMode.ANIMATION
      ? bank.currentFrame * 44
      : bank.viewport;
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
  if (bank.mode !== DisplayMode.ANIMATION) return 1;
  return Math.ceil(bank.pixels[0].length / 44);
});

// Actions
export function togglePixel(x, y) {
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
  const bank = banks[currentBank.value];
  const data = { ...bank.value };
  data.text = text;
  data.pixels = textToPixels(text, currentFont.value);
  bank.value = data;
}

export function setMode(mode) {
  const bank = banks[currentBank.value];
  const data = { ...bank.value, mode };
  data.currentFrame = 0;
  data.viewport = 0;
  bank.value = data;
}

export function clearImage() {
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
    data.pixels = create2DArray(11, 88);
    data.viewport = 0; // Reset viewport to 0
  }

  bank.value = data;
}

export function invertImage() {
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  if (data.mode === DisplayMode.ANIMATION) {
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

  if (data.mode === DisplayMode.ANIMATION) return; // Only scroll in non-animated mode

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
  const bank = banks[currentBank.value];
  const data = { ...bank.value };

  // Don't delete if it's the last frame
  if (frameCount.value <= 1) return;

  const start = data.currentFrame * 44;
  const end = start + 44;

  // Remove the current frame's pixels
  data.pixels = data.pixels.map((row) => {
    const newRow = [...row];
    newRow.splice(start, 44);
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
