// Where things are in the meadow, and the ground they stand on. One file so
// the ground mesh, grass placement, collision, characters, the apple and
// Newton's walk to the cottage all agree on the same heights and landmarks.

export const MEADOW_HALF = 60; // 120 x 120 units of playable meadow
export const DETAIL_HALF = 65; // the rolling, tessellated plane
export const GROUND_HALF = 115; // flat skirt out to here, so the hills have ground

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

// --- Newton's cottage ----------------------------------------------------
// Thirty units from the tree, on the reachable side, door facing the tree.

export const COTTAGE = { x: 24, z: 0 } as const;
export const COTTAGE_WIDTH = 7; // along its local x
export const COTTAGE_DEPTH = 6; // along its local z; the door is on +z
export const COTTAGE_HEIGHT = 3.2;
export const COTTAGE_RADIUS = 4.3;

// Facing = the unit vector from the cottage toward the tree.
const toTreeX = TREE.x - COTTAGE.x;
const toTreeZ = TREE.z - COTTAGE.z;
const toTreeLen = Math.hypot(toTreeX, toTreeZ);
export const COTTAGE_FACING = { x: toTreeX / toTreeLen, z: toTreeZ / toTreeLen } as const;
export const COTTAGE_YAW = Math.atan2(COTTAGE_FACING.x, COTTAGE_FACING.z);

/** Middle of the doorway, on the front wall. */
export const COTTAGE_DOOR = {
  x: COTTAGE.x + COTTAGE_FACING.x * (COTTAGE_DEPTH / 2),
  z: COTTAGE.z + COTTAGE_FACING.z * (COTTAGE_DEPTH / 2),
} as const;

// The dirt path the player sees, tree to doorstep.
export const DIRT_PATH: [number, number][] = [
  [1.2, -14.2],
  [4.0, -12.4],
  [8.5, -9.8],
  [13.0, -7.2],
  [17.5, -4.6],
  [20.9, -2.4],
];

// Newton's route: up off the trunk, onto the path, through the door, inside.
export const NEWTON_WALK: [number, number][] = [
  [NEWTON.x, NEWTON.z],
  [2.0, -13.6],
  [5.5, -11.4],
  [10.0, -8.8],
  [14.5, -6.2],
  [18.5, -3.8],
  [20.9, -2.4],
  [COTTAGE_DOOR.x, COTTAGE_DOOR.z],
  [COTTAGE.x + 0.2, COTTAGE.z + 0.15],
];

const WALK_LEGS: number[] = [];
let walkTotal = 0;
for (let i = 1; i < NEWTON_WALK.length; i++) {
  const d = Math.hypot(
    NEWTON_WALK[i][0] - NEWTON_WALK[i - 1][0],
    NEWTON_WALK[i][1] - NEWTON_WALK[i - 1][1]
  );
  WALK_LEGS.push(d);
  walkTotal += d;
}
export const NEWTON_WALK_LENGTH = walkTotal;

/** Position and heading a given distance along Newton's route. */
export function walkPoint(distance: number): { x: number; z: number; heading: number } {
  let d = Math.max(0, Math.min(NEWTON_WALK_LENGTH, distance));
  for (let i = 0; i < WALK_LEGS.length; i++) {
    const leg = WALK_LEGS[i];
    if (d <= leg || i === WALK_LEGS.length - 1) {
      const u = leg > 0 ? Math.min(1, d / leg) : 0;
      const [ax, az] = NEWTON_WALK[i];
      const [bx, bz] = NEWTON_WALK[i + 1];
      return {
        x: ax + (bx - ax) * u,
        z: az + (bz - az) * u,
        heading: Math.atan2(bx - ax, bz - az),
      };
    }
    d -= leg;
  }
  const [lx, lz] = NEWTON_WALK[NEWTON_WALK.length - 1];
  return { x: lx, z: lz, heading: COTTAGE_YAW + Math.PI };
}

// --- the ending, in milliseconds from the world_event arriving ------------

export const NEWTON_STAND_MS = 900;
export const NEWTON_WALK_START_MS = 1200;
export const NEWTON_WALK_SPEED = 3.0; // units per second, a purposeful stride
export const NEWTON_WALK_END_MS =
  NEWTON_WALK_START_MS + (NEWTON_WALK_LENGTH / NEWTON_WALK_SPEED) * 1000;
export const DOOR_OPEN_MS = NEWTON_WALK_END_MS - 1800;
export const DOOR_CLOSE_MS = NEWTON_WALK_END_MS + 500;
export const WINDOWS_BRIGHT_MS = NEWTON_WALK_END_MS + 300;
/** After this, the ending is history: he is simply home. */
export const ENDING_TOTAL_MS = DOOR_CLOSE_MS + 2000;

// --- scenery -------------------------------------------------------------

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

// Low rolling hills ringing the meadow, outside the wall. They frame the
// place and are never reachable; the wall still stops you.
export interface Hill {
  x: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  yaw: number;
}

export const HILLS: Hill[] = [
  { x: 0, z: 78, rx: 25, ry: 11, rz: 19, yaw: 0.3 },
  { x: 38, z: 70, rx: 21, ry: 9, rz: 17, yaw: 1.1 },
  { x: 68, z: 42, rx: 23, ry: 12, rz: 19, yaw: 2.0 },
  { x: 80, z: 6, rx: 24, ry: 10, rz: 20, yaw: 0.6 },
  { x: 72, z: -32, rx: 21, ry: 13, rz: 17, yaw: 1.7 },
  { x: 42, z: -60, rx: 24, ry: 11, rz: 19, yaw: 2.5 },
  { x: 6, z: -72, rx: 26, ry: 14, rz: 21, yaw: 0.2 },
  { x: -34, z: -64, rx: 23, ry: 10, rz: 18, yaw: 1.4 },
  { x: -68, z: -36, rx: 22, ry: 12, rz: 19, yaw: 2.2 },
  { x: -82, z: 2, rx: 25, ry: 11, rz: 20, yaw: 0.8 },
  { x: -70, z: 38, rx: 21, ry: 9, rz: 17, yaw: 1.9 },
  { x: -36, z: 72, rx: 24, ry: 12, rz: 19, yaw: 2.7 },
];

/** Height of a hill's surface at a point, or null if the point is off it. */
export function hillSurface(hill: Hill, x: number, z: number): number | null {
  const dx = (x - hill.x) / hill.rx;
  const dz = (z - hill.z) / hill.rz;
  const q = dx * dx + dz * dz;
  if (q >= 1) return null;
  return hillBase(hill) + hill.ry * Math.sqrt(1 - q);
}

export function hillBase(hill: Hill): number {
  return groundHeight(hill.x, hill.z) - hill.ry * 0.42;
}

// Low-frequency rolling so the meadow is not a slab. Flattened around the tree
// so Newton sits level and the apple rolls somewhere sensible, and flattened
// again under the cottage so the walls meet the ground.
export function groundHeight(x: number, z: number): number {
  const rolling =
    0.7 * Math.sin(x * 0.075) * Math.cos(z * 0.068 + 0.4) +
    0.35 * Math.sin(x * 0.19 + 1.3) * Math.sin(z * 0.16 - 0.7) +
    0.2 * Math.cos((x + z) * 0.11);
  const treeFlat = smoothstep(7, 15, Math.hypot(x - TREE.x, z - TREE.z));
  const cottageFlat = smoothstep(5.5, 13, Math.hypot(x - COTTAGE.x, z - COTTAGE.z));
  // Settle to zero before the detailed plane ends, so the flat skirt beyond it
  // meets it exactly and there is no seam under the hills.
  const edge = 1 - smoothstep(48, DETAIL_HALF - 2, Math.max(Math.abs(x), Math.abs(z)));
  return rolling * Math.min(treeFlat, cottageFlat) * edge;
}

export function smoothstep(a: number, b: number, v: number): number {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// Solid things a player cannot walk through. Walls are handled by clamping.
export const SOLIDS: Circle[] = [
  { x: TREE.x, z: TREE.z, r: TRUNK_RADIUS + PLAYER_RADIUS },
  { x: NEWTON.x, z: NEWTON.z, r: 0.9 + PLAYER_RADIUS },
  { x: COTTAGE.x, z: COTTAGE.z, r: COTTAGE_RADIUS + PLAYER_RADIUS },
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
