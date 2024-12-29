// Create offscreen canvas for font rendering
const scale = 10; // Render 10x size, then scale down
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

// Ensure crisp pixel rendering
ctx.imageSmoothingEnabled = false;

canvas.width = 44 * scale;
canvas.height = 11 * scale;

// Cache for rendered characters and their widths
const charCache = new Map();

// Get character data (pixels and width)
function getCharData(char, fontName, optimalSize, yOffset) {
  const cacheKey = `${fontName}-${optimalSize}-${char}`;

  if (charCache.has(cacheKey)) {
    return charCache.get(cacheKey);
  }

  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw single character
  ctx.fillStyle = "white";
  ctx.fillText(char, 0, yOffset);

  // Get character width by scanning pixels
  const charData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let maxX = 0;

  for (let x = 0; x < canvas.width; x++) {
    for (let y = 0; y < canvas.height; y++) {
      const i = (y * canvas.width + x) * 4;
      if (charData.data[i] > 127) {
        maxX = x;
      }
    }
  }

  // Convert to character space
  const width = Math.round(maxX / scale);

  // Create character pixel array
  const pixels = Array(11)
    .fill()
    .map(() => Array(width).fill(false));

  // Sample pixels for this character
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < width; x++) {
      const centerX = x * scale + Math.floor(scale / 2);
      const centerY = y * scale + Math.floor(scale / 2);
      const i = (centerY * canvas.width + centerX) * 4;
      pixels[y][x] = charData.data[i] > 127;
    }
  }

  const result = { pixels, width };
  charCache.set(cacheKey, result);
  return result;
}

// Convert rendered text to pixel array
export function textToPixels(text, fontName, size = 11) {
  if (!text)
    return Array(11)
      .fill()
      .map(() => Array(44).fill(false));

  // Clear canvas
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // First pass: measure a representative character to get optimal size
  ctx.fillStyle = "white";
  ctx.font = `${size * scale}px "${fontName}"`;
  ctx.textBaseline = "top";
  ctx.fillText("X", 0, 0);

  // Find the actual text bounds
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let minY = canvas.height;
  let maxY = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      if (imageData.data[i] > 127) {
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // Calculate scaling to fill 11px
  const actualHeight = maxY - minY + 1;
  const scale_factor = (11 * scale) / actualHeight;
  const optimalSize = Math.ceil(size * scale_factor);
  const scaledMinY = minY * scale_factor;
  const yOffset = Math.floor((canvas.height - 11 * scale) / 2) - scaledMinY;

  // Set up final font settings
  ctx.font = `${optimalSize * scale}px "${fontName}"`;

  // First pass: calculate total width
  let totalWidth = 0;
  const charData = [];

  for (const char of text) {
    const data = getCharData(char, fontName, optimalSize, yOffset);
    charData.push(data);
    totalWidth += data.width + 1; // Add 1px spacing between chars
  }
  totalWidth = Math.max(44, totalWidth - 1); // Remove trailing space, ensure minimum width

  // Create result array with calculated width
  const pixels = Array(11)
    .fill()
    .map(() => Array(totalWidth).fill(false));

  // Track current x position
  let xPos = 0;

  // Render each character
  for (const data of charData) {
    const { pixels: charPixels, width } = data;

    // Copy character pixels to result
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < width; x++) {
        pixels[y][xPos + x] = charPixels[y][x];
      }
    }
    xPos += width + 1; // Add 1px spacing between chars
  }

  return pixels;
}

// Get all TTF files from /public/fonts
const fontFiles = import.meta.glob("/public/fonts/*.{ttf,otf,woff2}", {
  as: "url",
  eager: true,
});

const getName = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.[^/]+$/, "");

// Load fonts and track their loading state
const fontLoadingPromises = Object.entries(fontFiles).map(([path, url]) => {
  const fontName = getName(path);
  const font = new FontFace(fontName, `url(${url})`);
  return font.load().then((loadedFont) => {
    document.fonts.add(loadedFont);
    return fontName;
  });
});

// Wait for all fonts to load
await Promise.all(fontLoadingPromises);

// Export list of available fonts
export const fonts = Object.keys(fontFiles).map(getName);
