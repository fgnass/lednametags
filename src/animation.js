import { computed, signal } from "@preact/signals";
import {
  currentBank,
  banks,
  currentBankData,
  bankHasData,
  findLeftmostPixel,
} from "./store";
import {
  DisplayMode,
  SPEED_FPS,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from "./constants";

// Animation state
export const isPlaying = signal(false);
export const previewState = signal(null);

// Load cycling state from local storage
const savedState = JSON.parse(
  localStorage.getItem("lednametags-state") || "null"
);
export const isCycling = signal(savedState?.isCycling || false);

// Save cycling state when it changes
isCycling.subscribe((value) => {
  const state =
    JSON.parse(localStorage.getItem("lednametags-state") || "null") || {};
  state.isCycling = value;
  localStorage.setItem("lednametags-state", JSON.stringify(state));
});

let playbackTimer = null;

// Helper to create a laser frame
export function createLaserFrame(
  content,
  laserX,
  targetX = null,
  activePixels = null,
  leftmostPixel = null
) {
  const frame = Array(SCREEN_HEIGHT)
    .fill()
    .map(() => Array(SCREEN_WIDTH).fill(false));

  // Draw already etched pixels in completed columns
  if (targetX !== null) {
    for (let x = leftmostPixel; x < targetX; x++) {
      for (let y = 0; y < SCREEN_HEIGHT; y++) {
        frame[y][x] = content[y][x];
      }
    }
  }

  // Draw laser lines for current column
  if (targetX !== null) {
    // For each row, if there's a pixel in the current column,
    // draw a line from that position to the right edge
    for (let y = 0; y < SCREEN_HEIGHT; y++) {
      if (content[y][targetX]) {
        for (let x = targetX; x < SCREEN_WIDTH; x++) {
          frame[y][x] = true;
        }
      }
    }
  }

  return frame;
}

// Helper to create a curtain frame
export function createCurtainFrame(content, curtainPos, isClosing = false) {
  const frame = Array(SCREEN_HEIGHT)
    .fill()
    .map(() => Array(SCREEN_WIDTH).fill(false));
  const center = Math.floor(SCREEN_WIDTH / 2);
  const leftCurtain = Math.floor(center - curtainPos);
  const rightCurtain = Math.floor(center + curtainPos);

  // Copy the visible part of the content
  for (let y = 0; y < SCREEN_HEIGHT; y++) {
    if (isClosing) {
      // During closing, show content everywhere except between the curtain lines
      for (let x = 0; x < SCREEN_WIDTH; x++) {
        if (x < leftCurtain || x > rightCurtain) {
          frame[y][x] = content[y][x];
        }
      }
    } else {
      // During opening, show content only between the curtain lines
      for (let x = leftCurtain + 1; x <= rightCurtain; x++) {
        if (x >= 0 && x < SCREEN_WIDTH) {
          frame[y][x] = content[y][x];
        }
      }
    }
    // Draw the curtain lines
    if (leftCurtain >= 0 && leftCurtain < SCREEN_WIDTH) {
      frame[y][leftCurtain] = true;
    }
    if (rightCurtain >= 0 && rightCurtain < SCREEN_WIDTH) {
      frame[y][rightCurtain] = true;
    }
  }
  return frame;
}

// Compute number of frames for animation mode
export const frameCount = computed(() => {
  const bank = currentBankData.value;
  if (bank.mode !== DisplayMode.ANIMATION) return 1;
  return Math.ceil(bank.pixels[0].length / 44);
});

// Helper to set up preview state for a bank
function setupPreviewState(bankData) {
  const preview = {
    pixels: [...bankData.pixels.map((row) => [...row])],
    viewport: 0,
    currentFrame: bankData.currentFrame,
    mode: bankData.mode,
    blink: bankData.blink,
    blinkState: true,
    lastBlinkTime: 0,
  };

  switch (bankData.mode) {
    case DisplayMode.LASER:
      preview.targetX = findLeftmostPixel(preview.pixels);
      preview.leftmostPixel = preview.targetX;
      preview.lastPhaseChange = performance.now();
      break;
    case DisplayMode.CURTAIN:
      preview.curtainPhase = "opening";
      preview.curtainPos = 0;
      preview.showContent = false;
      preview.lastPhaseChange = performance.now();
      break;
    case DisplayMode.SCROLL_RIGHT:
      preview.viewport = preview.pixels[0].length + 1;
      break;
    case DisplayMode.SCROLL_LEFT:
      preview.viewport = -(SCREEN_WIDTH + 1);
      break;
    case DisplayMode.SCROLL_UP:
    case DisplayMode.SCROLL_DOWN:
      const blankRows = Array(SCREEN_HEIGHT)
        .fill()
        .map(() => Array(preview.pixels[0].length).fill(false));
      preview.pixels = [...blankRows, ...preview.pixels, ...blankRows];
      preview.viewport =
        bankData.mode === DisplayMode.SCROLL_DOWN
          ? preview.pixels.length - SCREEN_HEIGHT
          : -1;
      break;
  }

  return preview;
}

// Handle animation frame updates
function updateAnimation(preview, mode, timestamp) {
  let shouldStop = false;
  let pauseUntil = 0;

  // Handle blink effect
  if (preview.blink) {
    if (timestamp - preview.lastBlinkTime >= 500) {
      preview.blinkState = !preview.blinkState;
      preview.lastBlinkTime = timestamp;
    }
  }

  const timeInPhase = timestamp - preview.lastPhaseChange;

  switch (mode) {
    case DisplayMode.LASER:
      // Move to next column every 25ms
      if (timeInPhase >= 25) {
        preview.targetX++;
        preview.lastPhaseChange = timestamp;

        if (preview.targetX >= SCREEN_WIDTH) {
          // Animation complete
          shouldStop = true;
        }
      }
      break;

    case DisplayMode.CURTAIN:
      const CURTAIN_SPEED = 0.011; // pixels per ms (half screen width in 2000ms)
      const MAX_CURTAIN_DISTANCE = SCREEN_WIDTH / 2 + 1; // Add 1 to ensure left line moves off screen

      if (preview.curtainPhase === "opening") {
        preview.curtainPos = Math.min(
          MAX_CURTAIN_DISTANCE,
          timeInPhase * CURTAIN_SPEED
        );
        if (timeInPhase >= 2000) {
          // 2000ms for opening
          preview.curtainPhase = "show";
          preview.lastPhaseChange = timestamp;
        }
      } else if (preview.curtainPhase === "show") {
        if (timeInPhase >= 3000) {
          // 3000ms for showing content
          preview.curtainPhase = "closing";
          preview.curtainPos = 0;
          preview.lastPhaseChange = timestamp;
        }
      } else if (preview.curtainPhase === "closing") {
        preview.curtainPos = Math.min(
          MAX_CURTAIN_DISTANCE,
          timeInPhase * CURTAIN_SPEED
        );
        if (timeInPhase >= 2000) {
          // 2000ms for closing
          preview.curtainPhase = "opening";
          preview.curtainPos = 0;
          preview.lastPhaseChange = timestamp;
        }
      }
      break;

    case DisplayMode.ANIMATION:
      preview.currentFrame = (preview.currentFrame + 1) % frameCount.value;
      break;

    case DisplayMode.SCROLL_LEFT:
      if (preview.viewport < preview.pixels[0].length) {
        preview.viewport++;
      } else {
        if (isCycling.value) {
          shouldStop = true;
        } else {
          pauseUntil = timestamp + 1000;
          preview.viewport = -(SCREEN_WIDTH + 1);
        }
      }
      break;

    case DisplayMode.SCROLL_RIGHT:
      if (preview.viewport > -SCREEN_WIDTH) {
        preview.viewport--;
      } else {
        if (isCycling.value) {
          shouldStop = true;
        } else {
          pauseUntil = timestamp + 1000;
          preview.viewport = preview.pixels[0].length + 1;
        }
      }
      break;

    case DisplayMode.SCROLL_UP:
    case DisplayMode.SCROLL_DOWN:
      const isScrollUp = mode === DisplayMode.SCROLL_UP;
      const currentPos = preview.viewport;
      const totalHeight = preview.pixels.length;
      const pausePoint = isScrollUp ? SCREEN_HEIGHT - 1 : SCREEN_HEIGHT + 1;

      if (currentPos === pausePoint) {
        pauseUntil = timestamp + 1000;
      }

      if (isScrollUp) {
        if (currentPos < totalHeight - SCREEN_HEIGHT) {
          preview.viewport++;
        } else {
          shouldStop = isCycling.value;
          if (!shouldStop) {
            pauseUntil = timestamp + 1000;
            preview.viewport = -1;
          }
        }
      } else {
        if (currentPos > 0) {
          preview.viewport--;
        } else {
          shouldStop = isCycling.value;
          if (!shouldStop) {
            pauseUntil = timestamp + 1000;
            preview.viewport = preview.pixels.length - SCREEN_HEIGHT;
          }
        }
      }
      break;
  }

  return { shouldStop, pauseUntil };
}

// Find the next bank to play
function findNextBank(currentBankIndex, initialBank) {
  let nextBank = (currentBankIndex + 1) % 8;

  while (nextBank !== initialBank && !bankHasData.value[nextBank]) {
    nextBank = (nextBank + 1) % 8;
  }

  return nextBank;
}

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

  const initialBank = currentBank.value;
  let bank = banks[currentBank.value];
  let bankData = bank.value;

  previewState.value = setupPreviewState(bankData);

  let fps = SPEED_FPS[bankData.speed - 1];
  let interval = Math.round(1000 / fps);
  let mode = bankData.mode;

  let lastFrameTime = 0;
  let pauseUntil = 0;

  const animate = (timestamp) => {
    if (!isPlaying.value) return;

    if (timestamp < pauseUntil) {
      playbackTimer = requestAnimationFrame(animate);
      return;
    }

    // Update bank data in case we switched banks
    bank = banks[currentBank.value];
    bankData = bank.value;
    fps = SPEED_FPS[bankData.speed - 1];
    interval = Math.round(1000 / fps);
    mode = bankData.mode;

    const elapsed = timestamp - lastFrameTime;

    // Curtain mode always updates on each frame, independent of fps
    if (mode === DisplayMode.CURTAIN) {
      const preview = { ...previewState.value };
      const { shouldStop, pauseUntil: newPauseUntil } = updateAnimation(
        preview,
        mode,
        timestamp
      );
      pauseUntil = newPauseUntil;
      previewState.value = preview;
      lastFrameTime = timestamp;
    } else if (elapsed >= interval) {
      // Other modes respect fps setting
      const preview = { ...previewState.value };
      const { shouldStop, pauseUntil: newPauseUntil } = updateAnimation(
        preview,
        mode,
        timestamp
      );

      pauseUntil = newPauseUntil;
      previewState.value = preview;
      lastFrameTime = timestamp;

      if (shouldStop) {
        if (isCycling.value) {
          const nextBank = findNextBank(currentBank.value, initialBank);
          pauseUntil = timestamp + 1000;

          if (nextBank !== initialBank && bankHasData.value[nextBank]) {
            currentBank.value = nextBank;
            previewState.value = setupPreviewState(banks[nextBank].value);
          } else {
            currentBank.value = initialBank;
            previewState.value = setupPreviewState(banks[initialBank].value);
          }
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
