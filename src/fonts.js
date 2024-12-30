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

// Create second canvas for scaled preview
const scaledCanvas = document.createElement("canvas");
const scaledCtx = scaledCanvas.getContext("2d", { willReadFrequently: true });
scaledCanvas.width = 200;
scaledCanvas.height = 200;
scaledCanvas.style.cssText =
  "position: fixed; bottom: 20px; right: 240px; background: #000; border: 1px solid #333; image-rendering: pixelated;";
document.body.appendChild(scaledCanvas);

// Cache for character pixel data
const charCache = new Map();

// Cache for font metrics (grid size from X)
const fontMetricsCache = new Map();

// Ensure crisp rendering
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
  return data[i] > 90; // Only consider nearly white pixels
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

// Function to render test character with current font and return cell data
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

  // Get grid size - only detect from "X" and cache it, use cached value for other chars
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

  // Collect occupied cells and draw sample points
  const cells = new Set();
  for (let y = minY; y <= maxY; y += gridSize) {
    for (let x = minX; x <= maxX; x += gridSize) {
      const centerX = x + Math.floor(gridSize / 2);
      const centerY = y + Math.floor(gridSize / 2);
      const i = (centerY * canvas.width + centerX) * 4;
      const isOn = isPixelOn(imageData.data, i);

      // Draw sample point
      ctx.fillStyle = isOn ? "lime" : "red";
      ctx.fillRect(centerX - 1, centerY - 1, 3, 3);

      // Store cell if occupied
      if (isOn) {
        const cellX = Math.floor(x / gridSize);
        const cellY = Math.floor(y / gridSize);
        cells.add(`${cellX},${cellY}`);
      }
    }
  }

  // Find cell bounds
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

  // Calculate dimensions
  const widthInCells = maxCellX - minCellX + 1;
  const heightInCells = maxCellY - minCellY + 1;

  // Return all the data we gathered
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

// Function to get font metrics using X as reference
function getFontMetrics(fontName) {
  if (fontMetricsCache.has(fontName)) {
    return fontMetricsCache.get(fontName);
  }

  // Use renderTestChar to get grid size
  const metrics = renderTestChar(fontName, "X");
  fontMetricsCache.set(fontName, metrics);
  return metrics;
}

// Function to get character pixel data (from cache or generate)
function getCharPixels(char, fontName) {
  const key = `${fontName}:${char}`;
  if (charCache.has(key)) {
    return charCache.get(key);
  }

  // Get data from renderTestChar
  const data = renderTestChar(fontName, char);
  const { widthInCells, heightInCells, cells, minCellX, minCellY } = data;

  // If character is too tall, render it scaled down
  if (heightInCells > 11) {
    // Find the right font size to make it 11px tall
    const fontSize = findFontSizeForTargetHeight(fontName, char, 11);

    // Draw scaled version
    scaledCtx.fillStyle = "black";
    scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
    scaledCtx.fillStyle = "white";
    scaledCtx.font = `${fontSize}px "${fontName}"`;
    scaledCtx.textBaseline = "alphabetic";
    scaledCtx.textAlign = "left";
    scaledCtx.fillText(char, 20, Math.round(scaledCanvas.height * 0.7));

    // Get scaled image data
    const imageData = scaledCtx.getImageData(
      0,
      0,
      scaledCanvas.width,
      scaledCanvas.height
    );

    // Find bounds
    let minX = scaledCanvas.width;
    let maxX = 0;
    let minY = scaledCanvas.height;
    let maxY = 0;

    for (let y = 0; y < scaledCanvas.height; y++) {
      for (let x = 0; x < scaledCanvas.width; x++) {
        const i = (y * scaledCanvas.width + x) * 4;
        if (isPixelOn(imageData.data, i)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    // Create pixel array directly from image data
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const pixels = Array(heightInCells)
      .fill()
      .map(() => Array(width).fill(false));

    // Fill pixel array directly from image data
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((y + minY) * scaledCanvas.width + (x + minX)) * 4;
        pixels[y][x] = isPixelOn(imageData.data, i);
      }
    }

    const charData = { pixels, width, height };
    charCache.set(key, charData);
    return charData;
  }

  // For non-scaled characters, create pixel array from original data
  const pixels = Array(heightInCells)
    .fill()
    .map(() => Array(widthInCells).fill(false));

  // Fill pixel array from cells
  for (const cellKey of cells) {
    const [x, y] = cellKey.split(",").map(Number);
    const cellX = x - minCellX;
    const cellY = y - minCellY;
    pixels[cellY][cellX] = true;
  }

  const charData = { pixels, width: widthInCells, height: heightInCells };
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

  const metrics = getFontMetrics(fontName);
  console.log({ metrics });
  // Create result matrix
  const result = Array(targetHeight)
    .fill()
    .map(() => Array(totalWidth).fill(false));

  // Copy each character's pixels into result
  let xOffset = 0;
  for (const char of chars) {
    if (!char.pixels.length) continue; // Skip empty characters

    const shift =
      metrics.heightInCells <= 11 ? metrics.heightInCells - char.height : 0;
    const yOffset =
      shift +
      Math.floor(Math.max(0, (targetHeight - metrics.heightInCells) / 2));

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

// Function to find font size that makes X match target height
function findFontSizeForTargetHeight(fontName, char, targetHeight) {
  // Start with a reasonable size
  let fontSize = 30;
  let lastHeight = 0;
  let iterations = 0;
  const maxIterations = 10;

  while (iterations < maxIterations) {
    // Draw character with current font size
    scaledCtx.fillStyle = "black";
    scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
    scaledCtx.fillStyle = "white";
    scaledCtx.font = `${fontSize}px "${fontName}"`;
    scaledCtx.textBaseline = "alphabetic";
    scaledCtx.textAlign = "left";
    scaledCtx.fillText(char, 20, Math.round(scaledCanvas.height * 0.7));

    // Get image data and find bounds
    const imageData = scaledCtx.getImageData(
      0,
      0,
      scaledCanvas.width,
      scaledCanvas.height
    );
    let minY = scaledCanvas.height;
    let maxY = 0;

    for (let y = 0; y < scaledCanvas.height; y++) {
      for (let x = 0; x < scaledCanvas.width; x++) {
        const i = (y * scaledCanvas.width + x) * 4;
        if (isPixelOn(imageData.data, i)) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    const height = maxY - minY + 1;
    console.log(`Font size ${fontSize}px -> height ${height}px`);

    // Check if we hit the target
    if (height === targetHeight) {
      return fontSize;
    }

    // Adjust font size proportionally
    const newFontSize = Math.round(fontSize * (targetHeight / height));

    // If we're oscillating or not making progress, exit
    if (newFontSize === fontSize || newFontSize === lastHeight) {
      return fontSize;
    }

    lastHeight = fontSize;
    fontSize = newFontSize;
    iterations++;
  }

  return fontSize;
}
