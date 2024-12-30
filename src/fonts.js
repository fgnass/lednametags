import { signal } from "@preact/signals";

// Canvas setup
function setupCanvas() {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = 200;
  canvas.height = 200;

  ctx.textRendering = "geometricPrecision";
  ctx.fontKerning = "none";
  ctx.fontStretch = "normal";
  ctx.letterSpacing = "0px";

  return { canvas, ctx };
}

// Helper to run operations with specific smoothing setting
function withSmoothing(ctx, smoothing, operation) {
  const previous = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = smoothing;
  const result = operation();
  ctx.imageSmoothingEnabled = previous;
  return result;
}

const { canvas, ctx } = setupCanvas();
const charCache = new Map();
const fontMetricsCache = new Map();

export const fonts = signal([]);
export const currentFont = signal("monospace");
export const currentChar = signal("X");

// Font loading
const fontFiles = import.meta.glob("/public/fonts/*.{ttf,otf,woff2}", {
  as: "url",
  eager: true,
});

function isPixelOn(data, i) {
  return data[i] > 90;
}

function findImageBounds(imageData, width, height) {
  let minX = width,
    maxX = 0,
    minY = height,
    maxY = 0;

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

function findSmallestTransition(imageData, minX, maxX, minY, maxY) {
  let smallestDistance = Infinity;

  // Scan horizontal and vertical transitions
  for (const isVertical of [false, true]) {
    for (
      let i = isVertical ? minX : minY;
      i <= (isVertical ? maxX : maxY);
      i++
    ) {
      let lastTransition = -1;
      let lastValue = false;

      for (
        let j = isVertical ? minY : minX;
        j <= (isVertical ? maxY : maxX);
        j++
      ) {
        const idx = isVertical
          ? (j * canvas.width + i) * 4
          : (i * canvas.width + j) * 4;
        const value = isPixelOn(imageData.data, idx);

        if (value !== lastValue) {
          if (lastTransition !== -1) {
            const distance = j - lastTransition;
            if (distance >= 4 && distance < smallestDistance) {
              smallestDistance = distance;
            }
          }
          lastTransition = j;
          lastValue = value;
        }
      }
    }
  }

  return smallestDistance;
}

function detectGrid(imageData, minX, maxX, minY, maxY) {
  const gridSize = findSmallestTransition(imageData, minX, maxX, minY, maxY);
  if (gridSize === Infinity) {
    const height = maxY - minY + 1;
    return Math.max(Math.floor(height / 11), 1);
  }
  return gridSize;
}

function setupCanvasForText(ctx, fontName, fontSize = 160) {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px "${fontName}"`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

function findFontSizeForTargetHeight(fontName, char, targetHeight) {
  let fontSize = 30;
  let lastHeight = 0;

  for (let i = 0; i < 10; i++) {
    const height = withSmoothing(ctx, true, () => {
      setupCanvasForText(ctx, fontName, fontSize);
      ctx.fillText(char, 20, Math.round(canvas.height * 0.7));

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { minY, maxY } = findImageBounds(
        imageData,
        canvas.width,
        canvas.height
      );
      return maxY - minY + 1;
    });

    if (height === targetHeight) return fontSize;

    const newFontSize = Math.round(fontSize * (targetHeight / height));
    if (newFontSize === fontSize || newFontSize === lastHeight) return fontSize;

    lastHeight = fontSize;
    fontSize = newFontSize;
  }

  return fontSize;
}

function renderTestChar(fontName, text = "X") {
  return withSmoothing(ctx, false, () => {
    setupCanvasForText(ctx, fontName);
    let x = 20;
    const y = Math.round(canvas.height * 0.7);

    for (const char of text) {
      ctx.fillText(char, x, y);
      x += Math.ceil(ctx.measureText(char).width) + 1;
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bounds = findImageBounds(imageData, canvas.width, canvas.height);
    const gridSize = detectGrid(
      imageData,
      bounds.minX,
      bounds.maxX,
      bounds.minY,
      bounds.maxY
    );
    const cells = new Set();

    for (let y = bounds.minY; y <= bounds.maxY; y += gridSize) {
      for (let x = bounds.minX; x <= bounds.maxX; x += gridSize) {
        const centerX = x + Math.floor(gridSize / 2);
        const centerY = y + Math.floor(gridSize / 2);
        const i = (centerY * canvas.width + centerX) * 4;

        if (isPixelOn(imageData.data, i)) {
          cells.add(`${Math.floor(x / gridSize)},${Math.floor(y / gridSize)}`);
        }
      }
    }

    const cellBounds = Array.from(cells).reduce(
      (acc, cell) => {
        const [x, y] = cell.split(",").map(Number);
        return {
          minX: Math.min(acc.minX, x),
          maxX: Math.max(acc.maxX, x),
          minY: Math.min(acc.minY, y),
          maxY: Math.max(acc.maxY, y),
        };
      },
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    return {
      gridSize,
      cells,
      minCellX: cellBounds.minX,
      maxCellX: cellBounds.maxX,
      minCellY: cellBounds.minY,
      maxCellY: cellBounds.maxY,
      widthInCells: cellBounds.maxX - cellBounds.minX + 1,
      heightInCells: cellBounds.maxY - cellBounds.minY + 1,
    };
  });
}

function getScaledCharPixels(char, fontName, fontSize) {
  return withSmoothing(ctx, true, () => {
    setupCanvasForText(ctx, fontName, fontSize);
    ctx.fillText(char, 20, Math.round(canvas.height * 0.7));

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { minX, maxX, minY, maxY } = findImageBounds(
      imageData,
      canvas.width,
      canvas.height
    );

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const pixels = Array(height)
      .fill()
      .map(() => Array(width).fill(false));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((y + minY) * canvas.width + (x + minX)) * 4;
        pixels[y][x] = isPixelOn(imageData.data, i);
      }
    }

    return { pixels, width, height };
  });
}

function getCharPixels(char, fontName) {
  const key = `${fontName}:${char}`;
  if (charCache.has(key)) return charCache.get(key);

  return withSmoothing(ctx, false, () => {
    const metrics = getFontMetrics(fontName);
    setupCanvasForText(ctx, fontName);
    ctx.fillText(char, 20, Math.round(canvas.height * 0.7));

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const bounds = findImageBounds(imageData, canvas.width, canvas.height);
    const cells = new Set();

    for (let y = bounds.minY; y <= bounds.maxY; y += metrics.gridSize) {
      for (let x = bounds.minX; x <= bounds.maxX; x += metrics.gridSize) {
        const centerX = x + Math.floor(metrics.gridSize / 2);
        const centerY = y + Math.floor(metrics.gridSize / 2);
        const i = (centerY * canvas.width + centerX) * 4;

        if (isPixelOn(imageData.data, i)) {
          cells.add(
            `${Math.floor(x / metrics.gridSize)},${Math.floor(
              y / metrics.gridSize
            )}`
          );
        }
      }
    }

    const cellBounds = Array.from(cells).reduce(
      (acc, cell) => {
        const [x, y] = cell.split(",").map(Number);
        return {
          minX: Math.min(acc.minX, x),
          maxX: Math.max(acc.maxX, x),
          minY: Math.min(acc.minY, y),
          maxY: Math.max(acc.maxY, y),
        };
      },
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const widthInCells = cellBounds.maxX - cellBounds.minX + 1;
    const heightInCells = cellBounds.maxY - cellBounds.minY + 1;

    if (heightInCells > 11) {
      const fontSize = findFontSizeForTargetHeight(fontName, char, 11);
      const charData = getScaledCharPixels(char, fontName, fontSize);
      charCache.set(key, charData);
      return charData;
    }

    const pixels = Array(heightInCells)
      .fill()
      .map(() => Array(widthInCells).fill(false));
    for (const cell of cells) {
      const [x, y] = cell.split(",").map(Number);
      pixels[y - cellBounds.minY][x - cellBounds.minX] = true;
    }

    const charData = { pixels, width: widthInCells, height: heightInCells };
    charCache.set(key, charData);
    return charData;
  });
}

function getFontMetrics(fontName) {
  if (fontMetricsCache.has(fontName)) return fontMetricsCache.get(fontName);
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

  currentChar.value = text[text.length - 1];
  const chars = text.split("").map((char) => getCharPixels(char, fontName));
  const totalWidth = chars.reduce((sum, char) => sum + char.width + 1, 0) - 1;
  const metrics = getFontMetrics(fontName);
  const result = Array(targetHeight)
    .fill()
    .map(() => Array(totalWidth).fill(false));

  let xOffset = 0;
  for (const char of chars) {
    if (!char.pixels.length) continue;

    const yOffset =
      metrics.heightInCells > 11
        ? targetHeight - char.height
        : (metrics.heightInCells <= 11
            ? metrics.heightInCells - char.height
            : 0) + Math.floor((targetHeight - metrics.heightInCells) / 2);

    for (let y = 0; y < char.pixels.length && y + yOffset < targetHeight; y++) {
      for (let x = 0; x < char.width && xOffset + x < totalWidth; x++) {
        if (y + yOffset >= 0 && y + yOffset < targetHeight) {
          result[y + yOffset][xOffset + x] = char.pixels[y][x];
        }
      }
    }

    xOffset += char.width + 1;
  }

  return result;
}

// Initialize
currentFont.subscribe((fontName) =>
  renderTestChar(fontName, currentChar.value)
);
currentChar.subscribe((char) => renderTestChar(currentFont.value, char));

Promise.all(
  Object.entries(fontFiles).map(([path, url]) => {
    const fontName = path
      .split("/")
      .pop()
      .replace(/\.[^/.]+$/, "");
    return new FontFace(fontName, `url(${url})`).load().then((font) => {
      document.fonts.add(font);
      return fontName;
    });
  })
).then((loadedFonts) => {
  fonts.value = loadedFonts;
  if (loadedFonts.length > 0) setFont(loadedFonts[0]);
});
