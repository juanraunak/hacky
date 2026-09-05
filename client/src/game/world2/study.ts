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

// Wall torches over the open half of the room. Unlit while this is a study;
// they catch when the portal opens, which is when that end starts to matter.
export const TORCHES: [number, number][] = [
  [-ROOM_X + 0.5, 4.2],
  [ROOM_X - 0.5, 4.2],
];
export const TORCH_Y = 3.1;

// Where Newton stands to explain a thing. He walks to the thing he is
// explaining, because that is what a man explaining something does.
export const STATIONS: Record<string, { x: number; z: number }> = {
  desk: { x: 0, z: -6.9 },
  front: { x: 1.7, z: -3.4 },
  floor: { x: -0.6, z: -1.6 },
  notebook: { x: ROOM_X - 2.4, z: -1.5 },
  aside: { x: -5.2, z: 1.6 },
  rack: { x: -7.4, z: 0.2 },
  cellar: { x: 6.8, z: 3.4 },
};

export const NEWTON_WALK_SPEED = 1.7;

/** Where Newton is right now. Written every frame, outside React. */
export const newtonAt = { x: NEWTON_SPOT.x, z: NEWTON_SPOT.z };

/** Anything past this line is out in the room; behind it is the desk nook. */
export const DESK_LINE = DESK.z + DESK_D / 2 + 0.7;

/**
 * A route from where Newton is to where he is going. He cannot walk through
 * his own desk, so crossing the desk line routes him around the end of it.
 */
export function newtonRoute(x: number, z: number): { x: number; z: number }[] {
  const behindNow = newtonAt.z < DESK_LINE;
  const behindThen = z < DESK_LINE;
  if (behindNow === behindThen) return [{ x, z }];
  const side = (behindThen ? newtonAt.x : x) >= 0 ? 1 : -1;
  const corner = side * (DESK_W / 2 + 0.95);
  return [
    { x: corner, z: DESK.z },
    { x: corner, z: DESK_LINE },
    { x, z },
  ];
}
export const BOOKSHELF = { x: -ROOM_X + 0.45, z: -1.0 } as const;
/** Where the bookshelf ends up once it has slid aside. */
export const BOOKSHELF_OPEN_Z = 4.6;
/** Its live z, so collision follows it as it moves. Written every frame. */
export const shelf: { z: number } = { z: BOOKSHELF.z };

// The weapon rack behind the bookshelf: three rows along the same wall.
export const RACK = { x: -ROOM_X + 0.62 } as const;
export const RACK_ROWS: Record<string, { z0: number; z1: number; y: number }> = {
  shield: { z0: -3.3, z1: -1.6, y: 1.5 },
  sword: { z0: -0.9, z1: 0.9, y: 1.4 },
  gun: { z0: 1.6, z1: 3.3, y: 1.25 },
};

// --- the practice floor ---------------------------------------------------
// Two things to try the laws on. Neither is a target in a menu; they are
// objects in the room that behave the way the laws say they behave.

/** An oak post. A tap will not mark it. An accelerated blade will. */
export const POST = { x: 3.0, z: 0.4 } as const;
export const POST_H = 1.9;
export const POST_R = 0.3;

/** A sandbag on a beam, swinging. It has momentum and does not care. */
export const PENDULUM = { x: 0, z: 5.2 } as const;
export const PENDULUM_ARM = 2.4;
export const PENDULUM_PERIOD_MS = 3400;
export const PENDULUM_BOB_R = 0.38;
/** Hung from the ceiling beams, so nothing stands in the middle of the room. */
export const PENDULUM_PIVOT_Y = 4.6;

/** Where the bob is, and how fast it is going, at a given moment. */
export function pendulumAt(ms: number): {
  x: number;
  y: number;
  z: number;
  speed: number;
  vx: number;
} {
  const phase = (ms / PENDULUM_PERIOD_MS) * Math.PI * 2;
  const angle = Math.sin(phase) * 0.85;
  return {
    x: PENDULUM.x + Math.sin(angle) * PENDULUM_ARM,
    y: PENDULUM_PIVOT_Y - Math.cos(angle) * PENDULUM_ARM,
    z: PENDULUM.z,
    speed: Math.abs(Math.cos(phase)),
    vx: Math.sign(Math.cos(phase)) || 1,
  };
}

// The way down. Appears on the far side wall once the fight is over, and
// stays barred until every last person is holding something.
export const CELLAR = { x: ROOM_X - 0.28, z: 3.6 } as const;
export const CELLAR_W = 2.0;
export const CELLAR_H = 3.1;

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
// The bookshelf is not in the list because it slides; it is added live.
export const BLOCKERS: Box[] = [
  { x: DESK.x, z: DESK.z, hx: DESK_W / 2 + 0.2, hz: DESK_D / 2 + 0.2 },
];

export function resolveStudy(x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;
  const boxes = [...BLOCKERS, { x: BOOKSHELF.x, z: shelf.z, hx: 0.5, hz: 2.6 }];
  for (const b of boxes) {
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
