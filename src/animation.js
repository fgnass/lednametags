import { computed, signal } from "@preact/signals";
import { currentBank, banks, currentBankData, bankHasData } from "./store";
import {
  DisplayMode,
  SPEED_FPS,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from "./constants";

// Animation state
export const isPlaying = signal(false);
export const isCycling = signal(false);
export const previewState = signal(null);

let playbackTimer = null;

// Compute number of frames for animation mode
export const frameCount = computed(() => {
  const bank = currentBankData.value;
  if (bank.mode !== DisplayMode.ANIMATION) return 1;
  return Math.ceil(bank.pixels[0].length / 44);
});

export function togglePlayback() {
  if (isPlaying.value) {
    stopPlayback();
  } else {
    startPlayback();
  }
}

export function startPlayback() {
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

export function stopPlayback() {
  if (playbackTimer) {
    cancelAnimationFrame(playbackTimer);
    playbackTimer = null;
  }
  isPlaying.value = false;
  previewState.value = null;
}
