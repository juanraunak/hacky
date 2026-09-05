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
  /** True while a finger or the mouse button is down. The sword charges on
   *  this and the shield braces on it, so it is not a tap, it is a hold. */
  held: false,
  /** performance.now() when the current hold began. */
  heldSince: 0,
  /** Set on release: how long the hold lasted, in ms. Consumed by the game. */
  released: 0,
};

export function beginHold() {
  if (input.held) return;
  input.held = true;
  input.heldSince = performance.now();
}

export function endHold() {
  if (!input.held) return;
  input.held = false;
  input.released = performance.now() - input.heldSince;
}

export function consumeRelease(): number {
  const ms = input.released;
  input.released = 0;
  return ms;
}

/** How long the current hold has lasted, or 0 if nothing is held. */
export function holdMs(): number {
  return input.held ? performance.now() - input.heldSince : 0;
}

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
  /** Impulse from gun recoil or a boss hit; decays in LocalPlayer. */
  recoilX: 0,
  recoilZ: 0,
  /** Height above the ground, and vertical speed. */
  y: 0,
  vy: 0,
  sprinting: false,
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
