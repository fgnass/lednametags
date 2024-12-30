import { signal } from "@preact/signals";

// ============================================================================
// Canvas Setup and Configuration
// ============================================================================

function setupDebugCanvases() {
  // Create debug canvas
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  // Set canvas size and style
  canvas.width = 200;
  canvas.height = 200;

  // Create second canvas for scaled preview
  const scaledCanvas = document.createElement("canvas");
  const scaledCtx = scaledCanvas.getContext("2d", { willReadFrequently: true });
  scaledCanvas.width = 200;
  scaledCanvas.height = 200;

  // Configure canvas rendering settings
  ctx.imageSmoothingEnabled = false;
  ctx.textRendering = "geometricPrecision";
  ctx.fontKerning = "none";
  ctx.fontStretch = "normal";
  ctx.letterSpacing = "0px";

  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.textRendering = "geometricPrecision";
  scaledCtx.fontKerning = "none";
  scaledCtx.fontStretch = "normal";
  scaledCtx.letterSpacing = "0px";

  return { canvas, ctx, scaledCanvas, scaledCtx };
}

const { canvas, ctx, scaledCanvas, scaledCtx } = setupDebugCanvases();

// ============================================================================
// State Management
// ============================================================================

// Cache for character pixel data and font metrics
const charCache = new Map();
const fontMetricsCache = new Map();

// Reactive signals for font state
export const fonts = signal([]);
export const currentFont = signal("monospace");
export const currentChar = signal("X");

// ============================================================================
// Font Loading
// ============================================================================

// Get all TTF files from /public/fonts
const fontFiles = import.meta.glob("/public/fonts/*.{ttf,otf,woff2}", {
  as: "url",
  eager: true,
});

const getName = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.[^/.]+$/, "");

// Load fonts and track their loading state
const fontLoadingPromises = Object.entries(fontFiles).map(([path, url]) => {
  const fontName = getName(path);
  const font = new FontFace(fontName, `url(${url})`);
  return font.load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    return fontName;
  });
});

// ============================================================================
// Pixel Detection Utilities
// ============================================================================

function isPixelOn(data, i) {
  return data[i] > 90; // Only consider nearly white pixels
}

function findSmallestTransition(imageData, minX, maxX, minY, maxY) {
  let smallestDistance = Infinity;

  // Scan horizontal transitions
  for (let y = minY; y <= maxY; y++) {
    let lastTransition = -1;
    let lastValue = false;

    for (let x = minX; x <= maxX; x++) {
      const i = (y * canvas.width + x) * 4;
      const value = isPixelOn(imageData.data, i);

      if (value !== lastValue) {
        if (lastTransition !== -1) {
          const distance = x - lastTransition;
          if (distance >= 4 && distance < smallestDistance) {
            smallestDistance = distance;
          }
        }
        lastTransition = x;
        lastValue = value;
      }
    }
  }

  // Scan vertical transitions
  for (let x = minX; x <= maxX; x++) {
    let lastTransition = -1;
    let lastValue = false;

    for (let y = minY; y <= maxY; y++) {
      const i = (y * canvas.width + x) * 4;
      const value = isPixelOn(imageData.data, i);

      if (value !== lastValue) {
        if (lastTransition !== -1) {
          const distance = y - lastTransition;
          if (distance >= 4 && distance < smallestDistance) {
            smallestDistance = distance;
          }
        }
        lastTransition = y;
        lastValue = value;
      }
    }
  }

  return smallestDistance;
}

function detectGrid(imageData, minX, maxX, minY, maxY) {
  // Find initial grid size from smallest transition
  let gridSize = findSmallestTransition(imageData, minX, maxX, minY, maxY);

  // If no transitions found, estimate grid size from bounds
  if (gridSize === Infinity) {
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    // Try to fit the height into roughly 11 pixels
    gridSize = Math.max(Math.floor(height / 11), 1);
  }

  return gridSize;
}

// ============================================================================
// Image Processing Utilities
// ============================================================================

function findImageBounds(imageData, width, height) {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, maxX, minY, maxY };
}

function findCellBounds(cells) {
  let minCellX = Infinity,
    maxCellX = -Infinity;
  let minCellY = Infinity,
    maxCellY = -Infinity;

  for (const cellKey of cells) {
    const [x, y] = cellKey.split(",").map(Number);
    minCellX = Math.min(minCellX, x);
    maxCellX = Math.max(maxCellX, x);
    minCellY = Math.min(minCellY, y);
    maxCellY = Math.max(maxCellY, y);
  }

  return { minCellX, maxCellX, minCellY, maxCellY };
}

// ============================================================================
// Canvas Utilities
// ============================================================================

function setupCanvasForText(ctx, fontName, fontSize = 160) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px "${fontName}"`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function createPixelArray(height, width) {
  return Array(height)
    .fill()
    .map(() => Array(width).fill(false));
}

function parseCellCoords(cellKey) {
  return cellKey.split(",").map(Number);
}

// ============================================================================
// Character Rendering
// ============================================================================

function findFontSizeForTargetHeight(fontName, char, targetHeight) {
  let fontSize = 30;
  let lastHeight = 0;
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    setupCanvasForText(scaledCtx, fontName, fontSize);
    scaledCtx.fillText(char, 20, Math.round(scaledCanvas.height * 0.7));

    const imageData = scaledCtx.getImageData(
      0,
      0,
      scaledCanvas.width,
      scaledCanvas.height
    );
    const { minY, maxY } = findImageBounds(
      imageData,
      scaledCanvas.width,
      scaledCanvas.height
    );
    const height = maxY - minY + 1;

    if (height === targetHeight) return fontSize;

    const newFontSize = Math.round(fontSize * (targetHeight / height));
    if (newFontSize === fontSize || newFontSize === lastHeight) return fontSize;

    lastHeight = fontSize;
    fontSize = newFontSize;
    iterations++;
  }

  return fontSize;
}

function renderTestChar(fontName, text = "X") {
  setupCanvasForText(ctx, fontName);

  // Draw text
  let x = 20;
  const y = Math.round(canvas.height * 0.7);
  for (const char of text) {
    ctx.fillText(char, x, y);
    const metrics = ctx.measureText(char);
    x += Math.ceil(metrics.width) + 1;
  }

  // Process image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { minX, maxX, minY, maxY } = findImageBounds(
    imageData,
    canvas.width,
    canvas.height
  );

  // Get grid size and collect cells
  const gridSize = detectGrid(imageData, minX, maxX, minY, maxY);
  const cells = new Set();

  // Sample points in grid
  for (let y = minY; y <= maxY; y += gridSize) {
    for (let x = minX; x <= maxX; x += gridSize) {
      const centerX = x + Math.floor(gridSize / 2);
      const centerY = y + Math.floor(gridSize / 2);
      const i = (centerY * canvas.width + centerX) * 4;

      if (isPixelOn(imageData.data, i)) {
        const cellX = Math.floor(x / gridSize);
        const cellY = Math.floor(y / gridSize);
        cells.add(`${cellX},${cellY}`);
      }
    }
  }

  // Calculate dimensions
  const { minCellX, maxCellX, minCellY, maxCellY } = findCellBounds(cells);
  const widthInCells = maxCellX - minCellX + 1;
  const heightInCells = maxCellY - minCellY + 1;

  return {
    gridSize,
    cells,
    minCellX,
    maxCellX,
    minCellY,
    maxCellY,
    widthInCells,
    heightInCells,
  };
}

function getScaledCharPixels(char, fontName, fontSize) {
  setupCanvasForText(scaledCtx, fontName, fontSize);
  scaledCtx.fillText(char, 20, Math.round(scaledCanvas.height * 0.7));

  const imageData = scaledCtx.getImageData(
    0,
    0,
    scaledCanvas.width,
    scaledCanvas.height
  );
  const { minX, maxX, minY, maxY } = findImageBounds(
    imageData,
    scaledCanvas.width,
    scaledCanvas.height
  );

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const pixels = createPixelArray(height, width);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((y + minY) * scaledCanvas.width + (x + minX)) * 4;
      pixels[y][x] = isPixelOn(imageData.data, i);
    }
  }

  return { pixels, width, height };
}

function getCharPixels(char, fontName) {
  const key = `${fontName}:${char}`;
  if (charCache.has(key)) {
    return charCache.get(key);
  }

  // Get grid size from X
  const metrics = getFontMetrics(fontName);
  const gridSize = metrics.gridSize;

  // Draw the character
  setupCanvasForText(ctx, fontName);
  let x = 20;
  const y = Math.round(canvas.height * 0.7);
  ctx.fillText(char, x, y);

  // Process image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { minX, maxX, minY, maxY } = findImageBounds(
    imageData,
    canvas.width,
    canvas.height
  );

  // Collect cells using the grid size from X
  const cells = new Set();
  for (let y = minY; y <= maxY; y += gridSize) {
    for (let x = minX; x <= maxX; x += gridSize) {
      const centerX = x + Math.floor(gridSize / 2);
      const centerY = y + Math.floor(gridSize / 2);
      const i = (centerY * canvas.width + centerX) * 4;

      if (isPixelOn(imageData.data, i)) {
        const cellX = Math.floor(x / gridSize);
        const cellY = Math.floor(y / gridSize);
        cells.add(`${cellX},${cellY}`);
      }
    }
  }

  // Calculate dimensions
  const { minCellX, maxCellX, minCellY, maxCellY } = findCellBounds(cells);
  const widthInCells = maxCellX - minCellX + 1;
  const heightInCells = maxCellY - minCellY + 1;

  // If character is too tall, render it scaled down
  if (heightInCells > 11) {
    const fontSize = findFontSizeForTargetHeight(fontName, char, 11);
    const charData = getScaledCharPixels(char, fontName, fontSize);
    charCache.set(key, charData);
    return charData;
  }

  // For non-scaled characters, create pixel array from original data
  const pixels = createPixelArray(heightInCells, widthInCells);

  // Fill pixel array from cells
  for (const cellKey of cells) {
    const [x, y] = parseCellCoords(cellKey);
    const cellX = x - minCellX;
    const cellY = y - minCellY;
    pixels[cellY][cellX] = true;
  }

  const charData = { pixels, width: widthInCells, height: heightInCells };
  charCache.set(key, charData);
  return charData;
}

// ============================================================================
// Public API
// ============================================================================

// Function to get font metrics using X as reference
function getFontMetrics(fontName) {
  if (fontMetricsCache.has(fontName)) {
    return fontMetricsCache.get(fontName);
  }

  // Use renderTestChar to get grid size from X
  const metrics = renderTestChar(fontName, "X");
  fontMetricsCache.set(fontName, metrics);
  return metrics;
}

export function setFont(fontName) {
  currentFont.value = fontName;
  renderTestChar(fontName);
}

export function textToPixels(text, fontName, targetHeight = 11) {
  if (!text) {
    currentChar.value = "X";
    return Array(targetHeight)
      .fill()
      .map(() => Array(1).fill(false));
  }

  // Update current char to last typed character
  currentChar.value = text[text.length - 1];

  // Get pixel data for each character
  const chars = text.split("").map((char) => getCharPixels(char, fontName));

  // Calculate total width
  const totalWidth = chars.reduce((sum, char) => sum + char.width + 1, 0) - 1; // Add 1px gaps, but not after last char

  const metrics = getFontMetrics(fontName);

  // Create result matrix
  const result = Array(targetHeight)
    .fill()
    .map(() => Array(totalWidth).fill(false));

  // Copy each character's pixels into result
  let xOffset = 0;
  for (const char of chars) {
    if (!char.pixels.length) continue; // Skip empty characters

    // Calculate vertical position based on font height
    let yOffset;
    if (metrics.heightInCells > 11) {
      // For tall fonts, align to bottom
      yOffset = targetHeight - char.height;
    } else {
      // For small fonts, use shift logic to align within their natural height
      const shift =
        metrics.heightInCells <= 11 ? metrics.heightInCells - char.height : 0;
      yOffset = shift + Math.floor((targetHeight - metrics.heightInCells) / 2);
    }

    for (let y = 0; y < char.pixels.length && y + yOffset < targetHeight; y++) {
      for (let x = 0; x < char.width && xOffset + x < totalWidth; x++) {
        if (y + yOffset >= 0 && y + yOffset < targetHeight) {
          result[y + yOffset][xOffset + x] = char.pixels[y][x];
        }
      }
    }

    xOffset += char.width + 1; // Add 1px gap between characters
  }

  return result;
}

// ============================================================================
// Initialization
// ============================================================================

// Subscribe to font and char changes to update debug canvas
currentFont.subscribe((fontName) =>
  renderTestChar(fontName, currentChar.value)
);
currentChar.subscribe((char) => renderTestChar(currentFont.value, char));

// Wait for all fonts to load, then update fonts array and render first font
Promise.all(fontLoadingPromises).then((loadedFonts) => {
  fonts.value = loadedFonts;
  if (loadedFonts.length > 0) {
    setFont(loadedFonts[0]);
  }
});
