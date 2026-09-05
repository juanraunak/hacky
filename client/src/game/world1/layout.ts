// Where things are in the meadow, and the ground they stand on. One file so
// the ground mesh, grass placement, collision, characters and the apple all
// agree on the same heights and the same landmarks.

export const MEADOW_HALF = 60; // 120 x 120 units, centred on the origin

// The far wall runs across z = FAR_WALL_Z. Beyond it is visible, not reachable.
export const FAR_WALL_Z = -34;
export const NEAR_WALL_Z = 57;
export const SIDE_WALL_X = 57;
export const WALL_DEPTH = 1.2;

export const TREE = { x: 0, z: -18 } as const;
export const TRUNK_RADIUS = 2.1;
export const NEWTON = { x: 0, z: TREE.z + TRUNK_RADIUS + 0.55 } as const;
export const NEWTON_FACING = 0; // radians around +Y; 0 faces +z, toward the party

// Top of Newton's head, where the apple lands, relative to his root.
export const NEWTON_HEAD_Y = 2.1;
// Where the apple hangs before it falls (just under the canopy blob above
// him), and where it comes to rest after.
export const APPLE_HANG = { x: NEWTON.x + 0.12, y: 5.4, z: NEWTON.z - 0.05 } as const;
export const APPLE_REST = { x: NEWTON.x + 1.05, z: NEWTON.z + 0.65 } as const;
export const APPLE_RADIUS = 0.17;

export const APPLE_TRIGGER_RADIUS = 8;
export const APPLE_PICKUP_RADIUS = 1.1;

export const WALK_SPEED = 5;
export const PLAYER_RADIUS = 0.45;

export interface Circle {
  x: number;
  z: number;
  r: number;
}

export const ROCKS: (Circle & { s: [number, number, number]; yaw: number; dark?: boolean })[] = [
  { x: -14, z: 4, r: 1.5, s: [1.6, 1.0, 1.3], yaw: 0.4 },
  { x: 17, z: -6, r: 1.2, s: [1.3, 0.9, 1.1], yaw: 1.9, dark: true },
  { x: 9, z: 20, r: 0.9, s: [1.0, 0.7, 0.9], yaw: 0.9 },
  { x: -24, z: -22, r: 2.1, s: [2.3, 1.5, 1.9], yaw: 2.6 },
  { x: 30, z: 14, r: 1.7, s: [1.9, 1.2, 1.5], yaw: 0.2, dark: true },
  { x: -34, z: 26, r: 1.3, s: [1.4, 1.0, 1.2], yaw: 1.2 },
  { x: 24, z: -24, r: 1.1, s: [1.2, 0.8, 1.0], yaw: 2.2 },
  { x: -6, z: 34, r: 1.0, s: [1.1, 0.8, 1.0], yaw: 0.7, dark: true },
];

export const BUSHES: (Circle & { yaw: number })[] = [
  { x: -8, z: -8, r: 1.4, yaw: 0.3 },
  { x: 10, z: -12, r: 1.3, yaw: 1.1 },
  { x: -20, z: 14, r: 1.5, yaw: 2.0 },
  { x: 22, z: 4, r: 1.2, yaw: 0.6 },
  { x: -28, z: -8, r: 1.6, yaw: 1.5 },
  { x: 36, z: -14, r: 1.4, yaw: 2.4 },
  { x: 4, z: 40, r: 1.3, yaw: 0.1 },
  { x: -40, z: 40, r: 1.5, yaw: 1.8 },
  { x: 40, z: 36, r: 1.4, yaw: 0.9 },
];

// Low-frequency rolling so the meadow is not a slab. Flattened around the tree
// so Newton sits level and the apple rolls somewhere sensible.
export function groundHeight(x: number, z: number): number {
  const rolling =
    0.7 * Math.sin(x * 0.075) * Math.cos(z * 0.068 + 0.4) +
    0.35 * Math.sin(x * 0.19 + 1.3) * Math.sin(z * 0.16 - 0.7) +
    0.2 * Math.cos((x + z) * 0.11);
  const dx = x - TREE.x;
  const dz = z - TREE.z;
  const d = Math.hypot(dx, dz);
  const flat = smoothstep(7, 15, d);
  return rolling * flat;
}

export function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Solid things a player cannot walk through. Walls are handled by clamping.
export const SOLIDS: Circle[] = [
  { x: TREE.x, z: TREE.z, r: TRUNK_RADIUS + PLAYER_RADIUS },
  { x: NEWTON.x, z: NEWTON.z, r: 0.9 + PLAYER_RADIUS },
  ...ROCKS.map(r => ({ x: r.x, z: r.z, r: r.r + PLAYER_RADIUS })),
  ...BUSHES.map(b => ({ x: b.x, z: b.z, r: b.r * 0.8 + PLAYER_RADIUS })),
];

export function resolveCollisions(x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const c of SOLIDS) {
    const dx = px - c.x;
    const dz = pz - c.z;
    const d = Math.hypot(dx, dz);
    if (d < c.r && d > 1e-5) {
      px = c.x + (dx / d) * c.r;
      pz = c.z + (dz / d) * c.r;
    } else if (d <= 1e-5) {
      px = c.x + c.r;
    }
  }
  const inset = WALL_DEPTH / 2 + PLAYER_RADIUS;
  px = Math.min(SIDE_WALL_X - inset, Math.max(-SIDE_WALL_X + inset, px));
  pz = Math.min(NEAR_WALL_Z - inset, Math.max(FAR_WALL_Z + inset, pz));
  return { x: px, z: pz };
}
