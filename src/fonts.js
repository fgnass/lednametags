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

// Function to check if a pixel is "on" (avoid anti-aliasing artifacts)
function isPixelOn(data, i) {
  return data[i] > 240; // Only consider nearly white pixels
}

// Function to find smallest transition
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
          if (distance > 1 && distance < smallestDistance) {
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
          if (distance > 1 && distance < smallestDistance) {
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
  console.log("Initial grid size from transitions:", gridSize);

  // If no transitions found, estimate grid size from bounds
  if (gridSize === Infinity) {
    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    // Try to fit the height into roughly 11 pixels
    gridSize = Math.max(Math.floor(height / 11), 1);
    console.log("Estimated grid size from bounds:", gridSize);
  }

  // Verify grid by checking cells
  let hasPartialCells = false;

  // Check each cell in the grid
  for (let y = minY; y <= maxY - gridSize && !hasPartialCells; y += gridSize) {
    for (
      let x = minX;
      x <= maxX - gridSize && !hasPartialCells;
      x += gridSize
    ) {
      // Skip if cell is completely filled or empty
      if (
        isCellFilled(imageData, x, y, gridSize) ||
        isCellEmpty(imageData, x, y, gridSize)
      ) {
        continue;
      }

      // Found a partial cell - look for transitions within it
      hasPartialCells = true;

      // Look for smallest transition within this cell
      const cellTransition = findSmallestTransition(
        imageData,
        x,
        x + gridSize,
        y,
        y + gridSize
      );
      if (cellTransition < gridSize && cellTransition !== Infinity) {
        gridSize = cellTransition;
      }
    }
  }

  return gridSize;
}

// Function to render test character with current font
function renderTestChar(fontName) {
  // Draw test character
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";

  // Set font with explicit settings
  ctx.font = `160px "${fontName}"`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Position at center
  const x = Math.round(canvas.width / 2);
  const y = Math.round(canvas.height / 2);
  ctx.fillText("X", x, y);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Find bounds with more precise edge detection
  let minX = canvas.width;
  let maxX = 0;
  let minY = canvas.height;
  let maxY = 0;

  // First pass: find rough bounds
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

  // Second pass: refine bounds to align with pixel transitions
  let foundLeft = false;
  let foundRight = false;
  for (let x = minX; x <= maxX && !foundLeft; x++) {
    for (let y = minY; y <= maxY; y++) {
      const i = (y * canvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        minX = x;
        foundLeft = true;
        break;
      }
    }
  }
  for (let x = maxX; x >= minX && !foundRight; x--) {
    for (let y = minY; y <= maxY; y++) {
      const i = (y * canvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        maxX = x;
        foundRight = true;
        break;
      }
    }
  }

  // Create a debug array to visualize what pixels we're detecting
  const debugPixels = Array(canvas.height)
    .fill()
    .map(() => Array(canvas.width).fill(false));

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (isPixelOn(imageData.data, i)) {
        debugPixels[y][x] = true;
      }
    }
  }

  // Draw debug visualization
  ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (debugPixels[y][x]) {
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
  console.log("Grid size:", gridSize, "pixels");

  // Draw grid starting exactly at minX and minY
  ctx.strokeStyle = "blue";
  ctx.beginPath();

  // Draw vertical grid lines
  for (let x = minX; x <= maxX; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
  }

  // Draw horizontal grid lines
  for (let y = minY; y <= maxY; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
  }

  ctx.stroke();
}

// Export function to update current font
export function setFont(fontName) {
  currentFont.value = fontName;
  renderTestChar(fontName);
}

// Subscribe to font changes to update debug canvas
currentFont.subscribe(renderTestChar);

// Cache for character pixel data
const charCache = new Map();

// Function to get character pixel data (from cache or generate)
function getCharPixels(char, fontName) {
  const key = `${fontName}:${char}`;
  if (charCache.has(key)) {
    return charCache.get(key);
  }

  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw character
  ctx.fillStyle = "white";
  ctx.font = `160px "${fontName}"`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(char, canvas.width / 2, canvas.height / 2);

  // Get image data
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

  // If no pixels found, return empty data
  if (minX === canvas.width || maxX === 0) {
    const emptyData = { pixels: [], width: 1 };
    charCache.set(key, emptyData);
    return emptyData;
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

  // Calculate dimensions in grid cells
  const heightInCells = Math.ceil((maxY - minY) / gridSize);
  const widthInCells = Math.ceil((maxX - minX) / gridSize);

  // Create pixel array
  const pixels = Array(heightInCells)
    .fill()
    .map(() => Array(widthInCells).fill(false));

  // Fill pixel array
  for (let cellY = 0; cellY < heightInCells; cellY++) {
    for (let cellX = 0; cellX < widthInCells; cellX++) {
      const startX = minX + cellX * gridSize;
      const startY = minY + cellY * gridSize;

      // Check if any pixel in this cell is on
      pixelCheck: for (let dy = 0; dy < gridSize; dy++) {
        for (let dx = 0; dx < gridSize; dx++) {
          const x = startX + dx;
          const y = startY + dy;
          const i = (y * canvas.width + x) * 4;
          if (isPixelOn(imageData.data, i)) {
            pixels[cellY][cellX] = true;
            break pixelCheck;
          }
        }
      }
    }
  }

  const charData = { pixels, width: widthInCells };
  charCache.set(key, charData);
  return charData;
}

// Function to render text to pixel matrix
export function textToPixels(text, fontName, targetHeight = 11) {
  if (!text) {
    return Array(targetHeight)
      .fill()
      .map(() => Array(1).fill(false));
  }

  // Get pixel data for each character
  const chars = text.split("").map((char) => getCharPixels(char, fontName));

  // Calculate total width
  const totalWidth = chars.reduce((sum, char) => sum + char.width, 0);

  // Create result matrix
  const result = Array(targetHeight)
    .fill()
    .map(() => Array(totalWidth).fill(false));

  // Copy each character's pixels into result
  let xOffset = 0;
  for (const char of chars) {
    const scale = targetHeight / char.pixels.length;

    for (let y = 0; y < targetHeight; y++) {
      const sourceY = Math.floor(y / scale);
      if (sourceY < char.pixels.length) {
        for (let x = 0; x < char.width; x++) {
          result[y][xOffset + x] = char.pixels[sourceY][x];
        }
      }
    }
    xOffset += char.width;
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
