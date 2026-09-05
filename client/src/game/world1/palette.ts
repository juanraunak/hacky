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

// Newton's cottage
export const COTTAGE_WALL = '#a89a86';
export const COTTAGE_STONE = '#8d8071';
export const COTTAGE_ROOF = '#a1543a';
export const COTTAGE_DOOR_WOOD = '#7a4a2a';
export const COTTAGE_DARK = '#241d18'; // the dark of the doorway
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
