// Per-frame state that must not go through React: the local player's
// position, the camera orbit, and the raw input. The scene reads and writes
// these objects directly inside useFrame; the touch overlay and keyboard
// listeners write to `input`.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Tap {
  x: number; // NDC -1..1
  y: number; // NDC -1..1
}

export const input = {
  /** Walk vector, screen-relative: x right, y forward (up on screen = forward). */
  move: { x: 0, y: 0 } as Vec2,
  /** Accumulated look delta in pixels since last frame. */
  look: { x: 0, y: 0 } as Vec2,
  /** Taps waiting to be resolved against the world. */
  taps: [] as Tap[],
  /** Keyboard state, desktop only. */
  keys: new Set<string>(),
};

export const local = {
  x: 0,
  z: 12,
  heading: Math.PI,
  /** True once the server gave us a spawn point. */
  spawned: false,
  /** Camera orbit for third person. Always heading + PI: the camera sits
   *  behind the player, looking the way they walk. */
  yaw: 0, // heading starts at PI (facing the tree), so the camera starts at 0
  pitch: 0.42,
  /** Walking speed estimate for the animation. */
  speed: 0,
};

export function consumeLook(): Vec2 {
  const v = { x: input.look.x, y: input.look.y };
  input.look.x = 0;
  input.look.y = 0;
  return v;
}

export function consumeTaps(): Tap[] {
  if (input.taps.length === 0) return input.taps;
  const t = input.taps;
  input.taps = [];
  return t;
}

// Objects a tap can land on. Newton and the apple register themselves here.
import type { Object3D } from 'three';

export const interactables = new Set<Object3D>();
