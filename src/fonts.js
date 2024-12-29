import { signal } from "@preact/signals";

// Create debug canvas
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

// Set canvas size and style
canvas.width = 200;
canvas.height = 200;
canvas.style.cssText =
  "position: fixed; bottom: 20px; right: 20px; background: #000; border: 1px solid #333; image-rendering: pixelated;";
document.body.appendChild(canvas);

// Create a second canvas for character analysis
const charCanvas = document.createElement("canvas");
const charCtx = charCanvas.getContext("2d", { willReadFrequently: true });
charCanvas.width = 200;
charCanvas.height = 200;

// Ensure crisp rendering
ctx.imageSmoothingEnabled = false;
ctx.textRendering = "geometricPrecision";
ctx.fontKerning = "none";
ctx.fontStretch = "normal";
ctx.letterSpacing = "0px";

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

// Export reactive signals for fonts
export const fonts = signal([]);
export const currentFont = signal("monospace");
export const currentChar = signal("X");

// Function to check if a pixel is "on" (avoid anti-aliasing artifacts)
function isPixelOn(data, i) {
  return data[i] > 240; // Only consider nearly white pixels
}

// Function to find smallest transition distance
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

// Function to check if a cell is completely filled
function isCellFilled(imageData, startX, startY, size) {
  for (let y = startY; y < startY + size; y++) {
    for (let x = startX; x < startX + size; x++) {
      const i = (y * canvas.width + x) * 4;
      if (!isPixelOn(imageData.data, i)) {
        return false;
      }
    }
  }
  return true;
}

// Function to check if a cell is completely empty
function isCellEmpty(imageData, startX, startY, size) {
  for (let y = startY; y < startY + size; y++) {
    for (let x = startX; x < startX + size; x++) {
      const i = (y * canvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        return false;
      }
    }
  }
  return true;
}

// Function to detect pixel grid
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

// Function to render test character with current font
function renderTestChar(fontName, text = "X") {
  // Draw test character
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";

  // Set font with explicit settings
  ctx.font = `160px "${fontName}"`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  // Start position
  let x = 20;
  const y = Math.round(canvas.height * 0.7);

  // Draw each character
  for (const char of text) {
    ctx.fillText(char, x, y);

    // Get bounds for this character
    const metrics = ctx.measureText(char);
    const width = Math.ceil(metrics.width);

    // Move to next position with 1px gap
    x += width + 1;
  }

  // Get image data for the whole text
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Find bounds
  let minX = canvas.width;
  let maxX = 0;
  let minY = canvas.height;
  let maxY = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Draw debug visualization
  ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // Draw bounds
  ctx.strokeStyle = "red";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(minX + 0.5, 0);
  ctx.lineTo(minX + 0.5, canvas.height);
  ctx.moveTo(maxX + 0.5, 0);
  ctx.lineTo(maxX + 0.5, canvas.height);
  ctx.moveTo(0, minY + 0.5);
  ctx.lineTo(canvas.width, minY + 0.5);
  ctx.moveTo(0, maxY + 0.5);
  ctx.lineTo(canvas.width, maxY + 0.5);
  ctx.stroke();

  // Detect grid size
  const gridSize = detectGrid(imageData, minX, maxX, minY, maxY);

  // Draw grid
  ctx.strokeStyle = "blue";
  ctx.beginPath();
  for (let x = minX; x <= maxX; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }
  for (let y = minY; y <= maxY; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
  }
  ctx.stroke();

  // Draw sampled points
  for (let y = minY; y <= maxY; y += gridSize) {
    for (let x = minX; x <= maxX; x += gridSize) {
      const centerX = x + Math.floor(gridSize / 2);
      const centerY = y + Math.floor(gridSize / 2);
      const i = (centerY * canvas.width + centerX) * 4;

      ctx.fillStyle = isPixelOn(imageData.data, i) ? "lime" : "red";
      ctx.fillRect(centerX - 1, centerY - 1, 3, 3);
    }
  }
}

// Export function to update current font
export function setFont(fontName) {
  currentFont.value = fontName;
  renderTestChar(fontName);
}

// Subscribe to font and char changes to update debug canvas
currentFont.subscribe((fontName) =>
  renderTestChar(fontName, currentChar.value)
);
currentChar.subscribe((char) => renderTestChar(currentFont.value, char));

// Cache for character pixel data
const charCache = new Map();

// Cache for font metrics (grid size from X)
const fontMetricsCache = new Map();

// Function to get font metrics using X as reference
function getFontMetrics(fontName) {
  if (fontMetricsCache.has(fontName)) {
    return fontMetricsCache.get(fontName);
  }

  // Clear canvas
  charCtx.fillStyle = "black";
  charCtx.fillRect(0, 0, charCanvas.width, charCanvas.height);

  // Draw X character
  charCtx.fillStyle = "white";
  charCtx.font = `160px "${fontName}"`;
  charCtx.textBaseline = "middle";
  charCtx.textAlign = "center";
  charCtx.fillText("X", charCanvas.width / 2, charCanvas.height / 2);

  // Get image data
  const imageData = charCtx.getImageData(
    0,
    0,
    charCanvas.width,
    charCanvas.height
  );

  // Find bounds
  let minX = charCanvas.width;
  let maxX = 0;
  let minY = charCanvas.height;
  let maxY = 0;

  for (let y = 0; y < charCanvas.height; y++) {
    for (let x = 0; x < charCanvas.width; x++) {
      const i = (y * charCanvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Detect grid size from X
  const gridSize = detectGrid(imageData, minX, maxX, minY, maxY);
  console.log(`Font ${fontName}: ${gridSize}px grid`);

  fontMetricsCache.set(fontName, gridSize);
  return gridSize;
}

// Function to get character pixel data (from cache or generate)
function getCharPixels(char, fontName) {
  const key = `${fontName}:${char}`;
  if (charCache.has(key)) {
    return charCache.get(key);
  }

  // Get grid size from font metrics
  const gridSize = getFontMetrics(fontName);

  // Clear canvas
  charCtx.fillStyle = "black";
  charCtx.fillRect(0, 0, charCanvas.width, charCanvas.height);

  // Draw character
  charCtx.fillStyle = "white";
  charCtx.font = `160px "${fontName}"`;
  charCtx.textBaseline = "middle";
  charCtx.textAlign = "center";
  charCtx.fillText(char, charCanvas.width / 2, charCanvas.height / 2);

  // Get image data
  const imageData = charCtx.getImageData(
    0,
    0,
    charCanvas.width,
    charCanvas.height
  );

  // Find bounds
  let minX = charCanvas.width;
  let maxX = 0;
  let minY = charCanvas.height;
  let maxY = 0;

  for (let y = 0; y < charCanvas.height; y++) {
    for (let x = 0; x < charCanvas.width; x++) {
      const i = (y * charCanvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no pixels found, return empty data
  if (minX === charCanvas.width || maxX === 0) {
    const emptyData = { pixels: [], width: 1 };
    charCache.set(key, emptyData);
    return emptyData;
  }

  // Find the grid cells that contain pixels by sampling their centers
  const cells = new Set(); // Store occupied cell coordinates as "x,y"

  for (let y = minY; y <= maxY; y += gridSize) {
    for (let x = minX; x <= maxX; x += gridSize) {
      const cellX = Math.floor(x / gridSize);
      const cellY = Math.floor(y / gridSize);
      const centerX = x + Math.floor(gridSize / 2);
      const centerY = y + Math.floor(gridSize / 2);
      const i = (centerY * charCanvas.width + centerX) * 4;

      if (isPixelOn(imageData.data, i)) {
        cells.add(`${cellX},${cellY}`);
      }
    }
  }

  // Find the bounds of occupied cells
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

  // Calculate dimensions from occupied cells (max - min, no +1)
  const widthInCells = maxCellX - minCellX + 1;
  const heightInCells = maxCellY - minCellY + 1;

  // Calculate snapped bounds from cell positions
  const snappedMinX = minCellX * gridSize;
  const snappedMaxX = (maxCellX + 1) * gridSize;
  const snappedMinY = minCellY * gridSize;
  const snappedMaxY = (maxCellY + 1) * gridSize;

  console.log(`${fontName} "${char}": ${widthInCells}x${heightInCells} cells`);

  // Create pixel array
  const pixels = Array(heightInCells)
    .fill()
    .map(() => Array(widthInCells).fill(false));

  // Fill pixel array by sampling at grid centers
  for (let cellY = 0; cellY < heightInCells; cellY++) {
    for (let cellX = 0; cellX < widthInCells; cellX++) {
      // Calculate center of the current grid cell
      const centerX = minX + cellX * gridSize + Math.floor(gridSize / 2);
      const centerY = minY + cellY * gridSize + Math.floor(gridSize / 2);

      // Sample the pixel at the center
      const i = (centerY * charCanvas.width + centerX) * 4;
      pixels[cellY][cellX] = isPixelOn(imageData.data, i);
    }
  }

  const charData = { pixels, width: widthInCells };
  charCache.set(key, charData);
  return charData;
}

// Function to render text to pixel matrix
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

  // Create result matrix
  const result = Array(targetHeight)
    .fill()
    .map(() => Array(totalWidth).fill(false));

  // Copy each character's pixels into result
  let xOffset = 0;
  for (const char of chars) {
    if (!char.pixels.length) continue; // Skip empty characters

    // Copy character pixels at original height, aligned to bottom
    const yOffset = Math.max(0, targetHeight - char.pixels.length);

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

// Wait for all fonts to load, then update fonts array and render first font
Promise.all(fontLoadingPromises).then((loadedFonts) => {
  fonts.value = loadedFonts;
  if (loadedFonts.length > 0) {
    setFont(loadedFonts[0]);
  }
});
