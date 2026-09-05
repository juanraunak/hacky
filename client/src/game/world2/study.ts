// Newton's study: one large room, and where everything in it stands.
// The floor is flat, so unlike the meadow there is no heightmap here.

export const ROOM_X = 10; // half-width, walls at x = +/- 10
export const ROOM_Z = 8; // walls at z = -8 (behind the desk) and z = +8 (portal)
export const WALL_H = 5.2;
export const WALL_T = 0.5;

export const DESK = { x: 0, z: -5.4 } as const;
export const DESK_W = 4.6;
export const DESK_D = 1.9;
export const DESK_TOP = 1.02;

export const NEWTON_SPOT = { x: 0, z: -6.9 } as const;
export const NEWTON_FACING = 0; // faces +z, into the room

export const CANDLES: [number, number][] = [
  [-1.5, DESK.z + 0.15],
  [1.5, DESK.z - 0.1],
];
export const CANDLE_Y = DESK_TOP + 0.42;

// The three things on the desk. The feather sits half under a paper.
export const STONE_SPOT = { x: -1.05, y: DESK_TOP + 0.16, z: DESK.z + 0.35 } as const;
export const PEN_SPOT = { x: 0.3, y: DESK_TOP + 0.05, z: DESK.z + 0.55 } as const;
export const FEATHER_SPOT = { x: 1.85, y: DESK_TOP + 0.04, z: DESK.z + 0.5 } as const;

/** Height a held item is carried at, and therefore dropped from. */
export const HAND_Y = 1.45;

// The far wall. The portal frame rises out of the floor in front of it.
export const PORTAL = { x: 0, z: ROOM_Z - 0.35 } as const;
export const PORTAL_W = 3.4;
export const PORTAL_H = 4.4;
/** Where apples leave the portal. */
export const PORTAL_MOUTH = { x: PORTAL.x, y: 2.1, z: PORTAL.z - 0.6 } as const;

export const NOTEBOOK = { x: ROOM_X - 0.32, y: 2.6, z: -1.5 } as const;
export const BOOKSHELF = { x: -ROOM_X + 0.45, z: -1.0 } as const;

export const PLAYER_RADIUS = 0.45;
export const WALK_SPEED = 4.2;
export const EYE_HEIGHT = 1.62;
/** An apple has to be this close, and this low, for a swing to connect. */
export const HIT_RADIUS = 1.2;
export const HIT_CEILING = 1.75;

export interface Box {
  x: number;
  z: number;
  hx: number;
  hz: number;
}

// Things you cannot walk through. Rectangles, because a study is rectangles.
export const BLOCKERS: Box[] = [
  { x: DESK.x, z: DESK.z, hx: DESK_W / 2 + 0.2, hz: DESK_D / 2 + 0.2 },
  { x: NEWTON_SPOT.x, z: NEWTON_SPOT.z, hx: 0.7, hz: 0.6 },
  { x: BOOKSHELF.x, z: BOOKSHELF.z, hx: 0.5, hz: 2.6 },
];

export function resolveStudy(x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  for (const b of BLOCKERS) {
    const dx = px - b.x;
    const dz = pz - b.z;
    const ox = b.hx + PLAYER_RADIUS - Math.abs(dx);
    const oz = b.hz + PLAYER_RADIUS - Math.abs(dz);
    if (ox > 0 && oz > 0) {
      // Push out along whichever axis needs the smaller nudge.
      if (ox < oz) px = b.x + Math.sign(dx || 1) * (b.hx + PLAYER_RADIUS);
      else pz = b.z + Math.sign(dz || 1) * (b.hz + PLAYER_RADIUS);
    }
  }
  const limitX = ROOM_X - WALL_T / 2 - PLAYER_RADIUS;
  const limitZ = ROOM_Z - WALL_T / 2 - PLAYER_RADIUS;
  return {
    x: Math.min(limitX, Math.max(-limitX, px)),
    z: Math.min(limitZ, Math.max(-limitZ, pz)),
  };
}

/** Where a player stands when the study loads. A loose arc facing the desk. */
export function studySpawn(index: number, count: number): { x: number; z: number } {
  const spread = Math.min(5.5, 1.4 * Math.max(1, count - 1));
  const u = count <= 1 ? 0.5 : index / (count - 1);
  return { x: -spread / 2 + spread * u, z: 1.2 + (index % 2) * 0.7 };
}

// --- the fight ------------------------------------------------------------

export const WAVE_SIZES = [3, 4, 6, 8, 10];
/** Every apple, whatever its size, is in the air exactly this long. */
export const FLIGHT_MS = 2600;
export const ARC_HEIGHT = 3.4;
export const SPAWN_GAP_MS = 720;
export const WAVE_GAP_MS = 1900;

export const APPLE_RADII: Record<string, number> = {
  small: 0.22,
  medium: 0.34,
  big: 0.52,
};

export function appleRadius(size: string): number {
  return APPLE_RADII[size] ?? 0.3;
}

/** Where an apple is, `ms` after it left the portal. Size never enters this. */
export function appleAt(
  from: { x: number; y: number; z: number },
  to: { x: number; z: number },
  ms: number
): { x: number; y: number; z: number; u: number } {
  const u = Math.min(1, Math.max(0, ms / FLIGHT_MS));
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (0.35 - from.y) * u + ARC_HEIGHT * Math.sin(Math.PI * u),
    z: from.z + (to.z - from.z) * u,
    u,
  };
}
