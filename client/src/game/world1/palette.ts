// Every colour in World 1. All from ART-STYLE.md; the few meadow-specific
// values (sky, grass, trunk, canopy) are the only additions and are listed
// here so nothing else in the world picks a colour on its own.

export const INK = '#111111';
export const PAPER = '#fff8e7';
export const GOLD = '#ffd93b';

// Meadow
export const SKY = '#ffd79b'; // flat warm afternoon
export const GRASS = '#5cc24a';
export const GRASS_BLADE = '#72d65c';
export const TRUNK = '#7a4a2a';
export const ROOT = '#6b3f22';
export const CANOPY = ['#3fae3a', '#4bbd44', '#36a233', '#52c94a', '#43b23d'];
export const STONE = '#8a8a9a';
export const STONE_DARK = '#6f6f80';
export const BUSH = '#3b9d3a';
export const HILL = '#4fae45';
export const HILL_DARK = '#469b3d';
export const DIRT = '#c08a52';

// Newton's house: two storeys of old dark timber. The only warm thing about
// it is the light in the windows, which is the point.
export const COTTAGE_WALL = '#5e4630';
export const COTTAGE_UPPER = '#543d2a';
export const COTTAGE_BEAM = '#3a2b1c';
export const COTTAGE_STONE = '#7d7566';
export const COTTAGE_ROOF = '#3d3946';
export const COTTAGE_DOOR_WOOD = '#4a3520';
export const COTTAGE_DARK = '#1a1512'; // the dark of the doorway
export const WINDOW_WARM = '#ffb03a';
export const WINDOW_BRIGHT = '#fff0b8';

// Apple
export const APPLE = '#ff4d4d';
export const APPLE_STEM = '#5a3a1e';
export const LEAF = '#4be36b';

// Characters
export const SKIN = '#ffd6b0';
export const SHOE = '#2a2a3a';
export const TROUSER = '#3a4a6e';
export const SCARF = '#ff4d4d';
export const EYE = '#111111';

// Jacket + hair colour slots. The first pair is the "current player" look from
// the art doc (navy spikes, yellow jacket); everyone else gets a different
// pair from the same palette, chosen from their identity.
export const JACKETS = [
  '#ffd93b', // gold
  '#3aa0ff', // blue
  '#ff4d4d', // red
  '#4be36b', // green
  '#b06cff', // purple
  '#ff8c3a', // orange
  '#2fd6c4', // teal
  '#ff7ad1', // pink
];
export const HAIRS = [
  '#1d2a5c', // navy
  '#2a2a3a', // black
  '#ff8c3a', // orange
  '#b06cff', // purple
  '#ffc72c', // gold
  '#3aa0ff', // blue
  '#ff4d4d', // red
  '#f3f3f3', // white
];

// Newton
export const NEWTON_COAT = '#5b6b8f';
export const NEWTON_SHIRT = '#fff8e7';
export const NEWTON_BREECHES = '#2a2a3a';
export const NEWTON_STOCKING = '#f3f3f3';
export const NEWTON_HAIR = '#8a6a4a';
export const NEWTON_RIBBON = '#111111';

export interface Look {
  jacket: string;
  hair: string;
}

// Deterministic look from an identity hex string. Jacket and hair are picked
// from different bits so two players rarely share both.
export function lookFor(identity: string): Look {
  let h = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    h ^= identity.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const jacket = JACKETS[h % JACKETS.length];
  const hair = HAIRS[(h >>> 8) % HAIRS.length];
  return { jacket, hair };
}

// --- World 2: Newton's study ---------------------------------------------
export const STUDY_FLOOR = '#6b4a2e';
export const STUDY_RUG = '#7a3340';
export const STUDY_WALL = '#5a4f47';
export const STUDY_WALL_DARK = '#463d37';
export const STUDY_CEILING = '#2f2a26';
export const STUDY_BEAM = '#3a2b1c';
export const DESK_WOOD = '#7a5233';
export const BOOK_COLOURS = ['#8f1420', '#2a5e8f', '#3f7a3a', '#7a5a2a', '#5b3a7a'];
export const CANDLE_WAX = '#f3f3f3';
export const CANDLE_FLAME = '#ffb03a';
export const STONE_ITEM = '#8a8a9a';
export const PEN_BODY = '#3a2b1c';
export const PEN_PLUME = '#f3f3f3';
export const FEATHER_WHITE = '#f7f4ec';
export const INKPOT = '#2a2a3a';

// The portal. Opaque, flat, dark red - it swirls by rotating, not by fading.
export const PORTAL_FRAME = '#6f6f80';
export const PORTAL_DEEP = '#4a0a12';
export const PORTAL_MID = '#8f1420';
export const PORTAL_EDGE = '#c21f2e';
