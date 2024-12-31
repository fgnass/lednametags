import { signal, computed } from "@preact/signals";
import {
  DisplayMode,
  SPEED_FPS,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from "./constants";
import { textToPixels, currentFont } from "./fonts";
import { calculateBankMemory, DEVICE_MEMORY } from "./utils";

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
  };
}

// Store
export const currentBank = signal(0);
export const isConnected = signal(false);
export const isPlaying = signal(false);
export const isCycling = signal(false);
export const previewState = signal(null);

// Load state from local storage or create initial state
const savedState = JSON.parse(
  localStorage.getItem("lednametags-state") || "null"
);

// Create a signal for each bank
export const banks = Array(8)
  .fill()
  .map((_, i) => signal(savedState?.banks[i] || createBank()));

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

  // Store initial bank for cycling
  const initialBank = currentBank.value;
  const bank = banks[currentBank.value];
  const bankData = bank.value;

  // Create preview state
  const preview = {
    pixels: [...bankData.pixels.map((row) => [...row])],
    viewport: 0,
    currentFrame: bankData.currentFrame,
    mode: bankData.mode,
  };

  // Prepare preview state based on mode
  if (bankData.mode === DisplayMode.SCROLL_RIGHT) {
    preview.viewport = preview.pixels[0].length + 1;
  } else if (bankData.mode === DisplayMode.SCROLL_LEFT) {
    preview.viewport = -(SCREEN_WIDTH + 1);
  } else if (
    bankData.mode === DisplayMode.SCROLL_UP ||
    bankData.mode === DisplayMode.SCROLL_DOWN
  ) {
    // Create a triple-height array for smooth scrolling
    const blankRows = Array(SCREEN_HEIGHT)
      .fill()
      .map(() => Array(preview.pixels[0].length).fill(false));
    preview.pixels = [...blankRows, ...preview.pixels, ...blankRows];
    preview.viewport =
      bankData.mode === DisplayMode.SCROLL_DOWN
        ? preview.pixels.length - SCREEN_HEIGHT
        : -1;
  }

  previewState.value = preview;

  const fps = SPEED_FPS[bankData.speed - 1];
  const interval = Math.round(1000 / fps);
  const mode = bankData.mode;

  let lastFrameTime = 0;
  let pauseUntil = 0;

  const animate = (timestamp) => {
    if (!isPlaying.value) return;

    if (timestamp < pauseUntil) {
      playbackTimer = requestAnimationFrame(animate);
      return;
    }

    const elapsed = timestamp - lastFrameTime;
    if (elapsed >= interval) {
      const preview = { ...previewState.value };
      let shouldStop = false;

      switch (mode) {
        case DisplayMode.ANIMATION:
          preview.currentFrame = (preview.currentFrame + 1) % frameCount.value;
          break;

        case DisplayMode.SCROLL_LEFT:
          if (preview.viewport < preview.pixels[0].length) {
            preview.viewport++;
          } else {
            pauseUntil = timestamp + 1000;
            preview.viewport = -(SCREEN_WIDTH + 1);
          }
          break;

        case DisplayMode.SCROLL_RIGHT:
          if (preview.viewport > -SCREEN_WIDTH) {
            preview.viewport--;
          } else {
            pauseUntil = timestamp + 1000;
            preview.viewport = preview.pixels[0].length + 1;
          }
          break;

        case DisplayMode.SCROLL_UP:
        case DisplayMode.SCROLL_DOWN: {
          const currentPos = preview.viewport;
          const totalHeight = preview.pixels.length;
          const isScrollUp = mode === DisplayMode.SCROLL_UP;

          if (isScrollUp) {
            if (currentPos === SCREEN_HEIGHT - 1) {
              pauseUntil = timestamp + 1000;
            }
            if (currentPos < totalHeight - SCREEN_HEIGHT) {
              preview.viewport++;
            } else {
              shouldStop = true;
            }
          } else {
            if (currentPos === SCREEN_HEIGHT + 1) {
              pauseUntil = timestamp + 1000;
            }
            if (currentPos > 0) {
              preview.viewport--;
            } else {
              shouldStop = true;
            }
          }
          break;
        }
      }

      previewState.value = preview;
      lastFrameTime = timestamp;

      if (shouldStop) {
        if (isCycling.value) {
          // Find next bank with data
          let nextBank = (currentBank.value + 1) % 8;
          while (nextBank !== initialBank && !bankHasData.value[nextBank]) {
            nextBank = (nextBank + 1) % 8;
          }

          if (nextBank !== initialBank && bankHasData.value[nextBank]) {
            currentBank.value = nextBank;
            startPlayback();
            return;
          }
        } else if (
          mode === DisplayMode.SCROLL_UP ||
          mode === DisplayMode.SCROLL_DOWN
        ) {
          // Restart vertical scroll after pause
          pauseUntil = timestamp + 1000;
          preview.viewport =
            mode === DisplayMode.SCROLL_DOWN
              ? preview.pixels.length - SCREEN_HEIGHT
              : -1;
          previewState.value = preview;
          shouldStop = false;
        } else {
          stopPlayback();
          return;
        }
      }
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
  previewState.value = null;
}

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

export const currentFrame = computed(() => {
  // Use preview state if available
  const state = previewState.value || currentBankData.value;

  if (
    state.mode === DisplayMode.SCROLL_UP ||
    state.mode === DisplayMode.SCROLL_DOWN
  ) {
    // For vertical scrolling, take a slice of rows
    // Handle negative viewport by showing blank rows
    const viewport = Math.max(0, state.viewport);
    return state.pixels
      .slice(viewport, viewport + 11)
      .map((row) => row.slice(0, 44));
  }

  // For horizontal modes
  const start =
    state.mode === DisplayMode.ANIMATION
      ? state.currentFrame * 44
      : state.viewport;
  const end = start + 44;
  return state.pixels.map((row) => {
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
});

export const frameCount = computed(() => {
  const bank = currentBankData.value;
  if (bank.mode !== DisplayMode.ANIMATION) return 1;
  return Math.ceil(bank.pixels[0].length / 44);
});

// Helper to determine if text should be centered based on mode
function shouldCenterText(mode) {
  return mode !== DisplayMode.SCROLL_LEFT && mode !== DisplayMode.SCROLL_RIGHT;
}

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
  data.pixels = textToPixels(
    text,
    currentFont.value,
    shouldCenterText(data.mode)
  );

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
    data.pixels = textToPixels(
      data.text,
      currentFont.value,
      shouldCenterText(mode)
    );
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
    data.pixels = Array(11)
      .fill()
      .map(() => Array(88).fill(false));
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
  if (isPlaying.value) return;
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

export function setBlink(value) {
  const bank = banks[currentBank.value];
  bank.value = { ...bank.value, blink: value };
}

export function setAnts(value) {
  const bank = banks[currentBank.value];
  bank.value = { ...bank.value, ants: value };
}
