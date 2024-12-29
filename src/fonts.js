// Get all font files
const fontFiles = import.meta.glob("/public/fonts/*.ttf", { eager: true });

// Extract font names from file paths
export const availableFonts = Object.keys(fontFiles).map((path) => {
  const name = path.split("/").pop().replace(".ttf", "");
  return { name, path };
});

// Create canvas for text rendering
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
canvas.width = 440;
canvas.height = 110;
canvas.style.cssText =
  "position: fixed; bottom: 20px; right: 20px; background: #000; border: 1px solid #333; image-rendering: pixelated; width: 440px; height: 110px;";
document.body.appendChild(canvas);

// Function to convert text to pixels
export function textToPixels(text, fontName) {
  // Clear canvas
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set font
  const font = availableFonts.find((f) => f.name === fontName);
  if (!font)
    return Array(11)
      .fill()
      .map(() => Array(44).fill(false));

  ctx.font = `10px "${font.name}"`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "top";
  ctx.fillText(text, 0, 0);

  // Get pixel data
  const imageData = ctx.getImageData(0, 0, 44, 11);
  const pixels = Array(11)
    .fill()
    .map(() => Array(44).fill(false));

  // Convert to boolean array
  for (let y = 0; y < 11; y++) {
    for (let x = 0; x < 44; x++) {
      const i = (y * imageData.width + x) * 4;
      pixels[y][x] = imageData.data[i] > 127;
    }
  }

  return pixels;
}
