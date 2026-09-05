// World 3 — the giant apple arena. Same shape of file as world1/layout.ts:
// constants, ground height, solids, and one collision resolver. Everything the
// player can bump into is a circle; the boundary is a clamp.

import { smoothstep } from '../world1/layout';

export const ARENA_RADIUS = 88;      // how far you may walk
export const TERRAIN_RADIUS = 340;   // how far the ground is actually drawn
export const WALL_INSET = 1.4;

/** The apple sits dead centre. Players circle it. */
export const APPLE = { x: 0, z: 0 } as const;
export const APPLE_RADIUS = 10.5; // bigger: it has to loom
export const APPLE_CENTER_Y = 14.5; // raised: it stands on legs now

export const WALK_SPEED = 5;
export const PLAYER_RADIUS = 0.45;

/** Spawn ring: well back from the apple, facing it. */
export const SPAWN_RADIUS = 34;

export interface Circle {
  x: number;
  z: number;
  r: number;
}

// Broken ground around the impact site.
export const RUBBLE: (Circle & { s: [number, number, number]; yaw: number; dark?: boolean })[] = [
  { x: -22, z: -17, r: 2.4, s: [2.9, 1.8, 2.5], yaw: 0.4 },
  { x: 26, z: -14, r: 2.8, s: [3.3, 2.2, 2.8], yaw: 1.1, dark: true },
  { x: -31, z: 15, r: 2.0, s: [2.4, 1.5, 2.2], yaw: 2.2 },
  { x: 21, z: 29, r: 2.6, s: [3.0, 2.0, 2.6], yaw: 0.8, dark: true },
  { x: -13, z: 35, r: 1.8, s: [2.1, 1.4, 2.0], yaw: 1.7 },
  { x: 41, z: 8, r: 2.2, s: [2.6, 1.7, 2.3], yaw: 2.9 },
  { x: -44, z: -9, r: 2.5, s: [3.0, 1.9, 2.6], yaw: 0.2, dark: true },
  { x: 8, z: -37, r: 2.1, s: [2.5, 1.6, 2.2], yaw: 1.4 },
  { x: -55, z: 26, r: 2.7, s: [3.2, 2.1, 2.8], yaw: 2.0, dark: true },
  { x: 58, z: -30, r: 2.3, s: [2.7, 1.8, 2.4], yaw: 0.9 },
  { x: 34, z: 52, r: 2.4, s: [2.8, 1.8, 2.5], yaw: 2.5 },
  { x: -38, z: -48, r: 2.6, s: [3.1, 2.0, 2.7], yaw: 1.3, dark: true },
];

/**
 * A shallow crater: the floor dips toward the apple and lifts into a rim at
 * the boundary, so the arena reads as bowl-shaped rather than a flat disc.
 */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);

  // Walkable ground: broad, shallow swells you can actually walk over. Two
  // octaves only — enough to stop it reading as a plane, gentle enough that
  // the character never looks like it is climbing.
  const swell =
    1.15 * Math.sin(x * 0.031) * Math.cos(z * 0.027 + 0.7) +
    0.55 * Math.sin(x * 0.071 + 1.4) * Math.sin(z * 0.063 - 0.5) +
    0.22 * Math.cos((x + z) * 0.104);

  // A shallow basin so the middle reads as the floor of somewhere.
  const basin = -2.2 * (1 - smoothstep(0, 62, d));

  // Past the walkable ring the land climbs away into broken highlands. This is
  // what stops you ever seeing the edge of the world.
  const rise = smoothstep(ARENA_RADIUS - 10, TERRAIN_RADIUS * 0.82, d);
  const highland =
    rise *
    (52 +
      16 * Math.sin(x * 0.014 + 2.1) * Math.cos(z * 0.013) +
      9 * Math.sin((x - z) * 0.03));

  return basin + swell + highland;
}

/** Where the boss is standing. It lands in the middle and stays there. */
export const applePos = { x: 0, z: 0 };

export const SOLIDS: Circle[] = RUBBLE.map(r => ({ x: r.x, z: r.z, r: r.r + PLAYER_RADIUS }));

export function resolveCollisions(x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  const moving: Circle[] = [
    { x: applePos.x, z: applePos.z, r: APPLE_RADIUS + PLAYER_RADIUS },
    ...SOLIDS,
  ];
  for (const c of moving) {
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
  // Round boundary instead of four walls: it is a crater, not a room.
  const limit = ARENA_RADIUS - WALL_INSET - PLAYER_RADIUS;
  const d = Math.hypot(px, pz);
  if (d > limit) {
    px = (px / d) * limit;
    pz = (pz / d) * limit;
  }
  return { x: px, z: pz };
}
