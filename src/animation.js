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
export const previewState = signal(null);
export const antsOffset = signal(0);
export const blinkState = signal(true);

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

// Animation timers
let playbackTimer = null;
let blinkTimer = null;
let antsTimer = null;

// Blink animation
export function startBlinkAnimation() {
  if (blinkTimer) return;
  let lastTime = performance.now();

  const animate = (timestamp) => {
    if (timestamp - lastTime >= 500) {
      blinkState.value = !blinkState.value;
      lastTime = timestamp;
    }
    if (isPlaying.value) {
      blinkTimer = requestAnimationFrame(animate);
    } else {
      cancelBlinkAnimation();
    }
  };
  blinkTimer = requestAnimationFrame(animate);
}

export function cancelBlinkAnimation() {
  if (blinkTimer) {
    cancelAnimationFrame(blinkTimer);
    blinkTimer = null;
  }
  blinkState.value = true;
}

// Ants animation
function startAntsAnimation() {
  if (antsTimer) return;
  let lastTime = performance.now();

  const animate = (timestamp) => {
    if (!isPlaying.value) {
      cancelAntsAnimation();
      return;
    }
    if (timestamp - lastTime >= 200) {
      antsOffset.value = (antsOffset.value + 1) % 4;
      lastTime = timestamp;
    }
    antsTimer = requestAnimationFrame(animate);
  };
  antsTimer = requestAnimationFrame(animate);
}

function cancelAntsAnimation() {
  if (antsTimer) {
    cancelAnimationFrame(antsTimer);
    antsTimer = null;
  }
  antsOffset.value = 0;
}

// Helper to create an ants frame
function createAntsFrame(offset) {
  return Array(SCREEN_HEIGHT)
    .fill()
    .map((_, y) =>
      Array(SCREEN_WIDTH)
        .fill(false)
        .map((_, x) => {
          // Only apply to border pixels
          if (
            y === 0 ||
            y === SCREEN_HEIGHT - 1 ||
            x === 0 ||
            x === SCREEN_WIDTH - 1
          ) {
            // Calculate position along the border (counter-clockwise from top-left)
            let borderPos;
            if (y === 0) borderPos = x; // Top edge (left to right)
            else if (x === SCREEN_WIDTH - 1)
              borderPos = y + SCREEN_WIDTH - 1; // Right edge (top to bottom)
            else if (y === SCREEN_HEIGHT - 1)
              borderPos = 2 * SCREEN_WIDTH + SCREEN_HEIGHT - 3 - x;
            // Bottom edge (right to left)
            else borderPos = 2 * (SCREEN_WIDTH + SCREEN_HEIGHT - 2) - y; // Left edge (bottom to top)

            // Create marching pattern
            return (borderPos + offset) % 4 === 0;
          }
          return false;
        })
    );
}

// Helper to apply post-processing effects (blink & ants)
function applyEffects(frame, state) {
  let contentFrame = frame;
  let antsFrame = null;

  // First, create the ants frame if needed
  if (state.ants) {
    antsFrame = createAntsFrame(antsOffset.value);
  }

  // Then handle blinking of content
  if (state.blink && !state.blinkState) {
    contentFrame = Array(SCREEN_HEIGHT)
      .fill()
      .map(() => Array(SCREEN_WIDTH).fill(false));
  }

  // Finally, combine content and ants
  if (antsFrame) {
    return contentFrame.map((row, y) =>
      row.map((pixel, x) => pixel || antsFrame[y][x])
    );
  }

  return contentFrame;
}

// Helper to create a laser frame
export function createLaserFrame(
  content,
  laserX,
  targetX = null,
  activePixels = null,
  leftmostPixel = null,
  isCleanup = false
) {
  const frame = Array(SCREEN_HEIGHT)
    .fill()
    .map(() => Array(SCREEN_WIDTH).fill(false));

  // Draw already etched pixels in completed columns
  if (targetX !== null) {
    if (isCleanup) {
      // During cleanup, show all pixels from target onwards
      for (let x = targetX + 1; x < SCREEN_WIDTH; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
          frame[y][x] = content[y][x];
        }
      }
    } else {
      // During etching, show all pixels up to target
      for (let x = 0; x < targetX; x++) {
        for (let y = 0; y < SCREEN_HEIGHT; y++) {
          frame[y][x] = content[y][x];
        }
      }
    }
  }

  // Draw laser lines for current column
  if (targetX !== null && targetX >= 0 && targetX < SCREEN_WIDTH) {
    // For each row, if there's a pixel in the current column,
    // draw a line from that position to the edge
    for (let y = 0; y < SCREEN_HEIGHT; y++) {
      if (content[y][targetX]) {
        if (isCleanup) {
          // Draw line from left edge to target
          for (let x = 0; x <= targetX; x++) {
            frame[y][x] = true;
          }
        } else {
          // Draw line from target to right edge
          for (let x = targetX; x < SCREEN_WIDTH; x++) {
            frame[y][x] = true;
          }
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

// Helper to find the rightmost column containing pixels
function findRightmostPixel(content) {
  for (let x = SCREEN_WIDTH - 1; x >= 0; x--) {
    for (let y = 0; y < SCREEN_HEIGHT; y++) {
      if (content[y][x]) {
        return x;
      }
    }
  }
  return -1;
}

// Helper to set up preview state for a bank
function setupPreviewState(bankData) {
  const preview = {
    pixels: [...bankData.pixels.map((row) => [...row])],
    viewport: 0,
    currentFrame: bankData.currentFrame,
    mode: bankData.mode,
    blink: bankData.blink,
    blinkState: blinkState.value,
    lastBlinkTime: performance.now(),
    ants: bankData.ants,
    lastAntsTime: 0,
    antsOffset: 0,
  };

  switch (bankData.mode) {
    case DisplayMode.LASER:
      preview.targetX = -1;
      preview.lastPhaseChange = performance.now();
      preview.isCleanup = false;
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

// Helper to check if a column has any pixels
function hasPixelsInColumn(content, x) {
  for (let y = 0; y < SCREEN_HEIGHT; y++) {
    if (content[y][x]) return true;
  }
  return false;
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

  // Handle ants effect
  if (preview.ants) {
    if (timestamp - preview.lastAntsTime >= 200) {
      preview.antsOffset = (preview.antsOffset + 1) % 4;
      preview.lastAntsTime = timestamp;
    }
  }

  const timeInPhase = timestamp - preview.lastPhaseChange;

  switch (mode) {
    case DisplayMode.LASER:
      if (!preview.isCleanup) {
        // Etching phase
        if (timeInPhase >= 100) {
          // Find next column with pixels
          do {
            preview.targetX++;
          } while (
            preview.targetX < SCREEN_WIDTH &&
            !hasPixelsInColumn(preview.pixels, preview.targetX)
          );

          preview.lastPhaseChange = timestamp;

          if (preview.targetX >= SCREEN_WIDTH) {
            // Start cleanup after 4s pause
            preview.isCleanup = true;
            preview.targetX = -1;
            pauseUntil = timestamp + 4000;
          }
        }
      } else {
        // Cleanup phase
        if (timeInPhase >= 100) {
          // Find next column with pixels
          do {
            preview.targetX++;
          } while (
            preview.targetX < SCREEN_WIDTH &&
            !hasPixelsInColumn(preview.pixels, preview.targetX)
          );

          preview.lastPhaseChange = timestamp;

          if (preview.targetX >= SCREEN_WIDTH) {
            if (isCycling.value) {
              shouldStop = true;
            } else {
              // Start over after 3s pause
              preview.isCleanup = false;
              preview.targetX = -1;
              pauseUntil = timestamp + 3000;
            }
          }
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
          if (isCycling.value) {
            shouldStop = true;
          } else {
            preview.curtainPhase = "opening";
            preview.curtainPos = 0;
            preview.lastPhaseChange = timestamp;
          }
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
  startAntsAnimation();

  const initialBank = currentBank.value;
  let bank = banks[currentBank.value];
  let bankData = bank.value;

  // Only start blink animation if blinking is enabled
  if (bankData.blink) {
    startBlinkAnimation();
  }

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

    // Laser and Curtain modes always update on each frame, independent of fps
    if (mode === DisplayMode.LASER || mode === DisplayMode.CURTAIN) {
      const preview = { ...previewState.value };
      const { shouldStop, pauseUntil: newPauseUntil } = updateAnimation(
        preview,
        mode,
        timestamp
      );
      pauseUntil = newPauseUntil;
      previewState.value = preview;
      lastFrameTime = timestamp;

      if (shouldStop && isCycling.value) {
        const nextBank = findNextBank(currentBank.value, initialBank);
        pauseUntil = timestamp + 1000;

        if (nextBank !== initialBank && bankHasData.value[nextBank]) {
          currentBank.value = nextBank;
          previewState.value = setupPreviewState(banks[nextBank].value);
        } else {
          currentBank.value = initialBank;
          previewState.value = setupPreviewState(banks[initialBank].value);
        }
      }
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
  cancelAntsAnimation();
  cancelBlinkAnimation();
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

  // Apply post-processing effects
  const effectState = {
    blink: state.blink,
    blinkState: previewState.value?.blinkState ?? blinkState.value,
    ants: currentBankData.value.ants,
  };
  return applyEffects(frame, effectState);
});
