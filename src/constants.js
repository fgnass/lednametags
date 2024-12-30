export const DisplayMode = {
  STATIC: 0,
  SCROLL_LEFT: 1,
  SCROLL_RIGHT: 2,
  SCROLL_UP: 3,
  SCROLL_DOWN: 4,
  ANIMATION: 5,
  SNOW: 6,
  LASER: 7,
  CURTAIN: 8,
};

// Screen dimensions
export const SCREEN_WIDTH = 44;
export const SCREEN_HEIGHT = 11;

// Speed to FPS mapping (array index is the speed - 1)
export const SPEED_FPS = [1.2, 1.3, 2.0, 2.4, 2.8, 4.5, 7.5, 15];

// Speed labels for UI
export const SPEED_LABELS = SPEED_FPS.map((fps) => `${fps} fps`);

export const Brightness = {
  PERCENT_25: 0x40,
  PERCENT_50: 0x20,
  PERCENT_75: 0x10,
  PERCENT_100: 0x00,
};
