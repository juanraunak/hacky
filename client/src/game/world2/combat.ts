// The moving parts of the three laws: bolts in flight, chips out of the post,
// and the push that is currently being applied to you.
//
// All of it lives outside React because it changes every frame.

import { BOLT_LIFE_MS, BOLT_SPEED } from './laws';

export interface Bolt {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  firedAt: number;
}

/** A small fixed pool. Nobody fires faster than this. */
export const bolts: Bolt[] = Array.from({ length: 8 }, () => ({
  alive: false,
  x: 0,
  y: 0,
  z: 0,
  heading: 0,
  firedAt: 0,
}));

export function fireBolt(x: number, y: number, z: number, heading: number) {
  const slot = bolts.find(b => !b.alive) ?? bolts[0];
  slot.alive = true;
  slot.x = x;
  slot.y = y;
  slot.z = z;
  slot.heading = heading;
  slot.firedAt = performance.now();
}

export function stepBolts(dt: number) {
  const now = performance.now();
  for (const b of bolts) {
    if (!b.alive) continue;
    if (now - b.firedAt > BOLT_LIFE_MS) {
      b.alive = false;
      continue;
    }
    b.x += Math.sin(b.heading) * BOLT_SPEED * dt;
    b.z += Math.cos(b.heading) * BOLT_SPEED * dt;
  }
}

/** How many chips the oak post has taken. Only charged swings leave one. */
export const postMarks = { count: 0 };

export function chipPost() {
  postMarks.count = Math.min(6, postMarks.count + 1);
}

/** A push being applied to you over time: recoil, or a sandbag. */
export const push = { x: 0, z: 0, until: 0, ms: 1 };

export function applyPush(dx: number, dz: number, ms: number) {
  const len = Math.hypot(dx, dz) || 1;
  push.x = dx / len;
  push.z = dz / len;
  push.ms = ms;
  push.until = performance.now() + ms;
}

/** The distance to move this frame, or zero when nothing is pushing you. */
export function stepPush(dt: number, distance: number): { x: number; z: number } {
  const now = performance.now();
  if (now >= push.until) return { x: 0, z: 0 };
  const rate = distance / (push.ms / 1000);
  return { x: push.x * rate * dt, z: push.z * rate * dt };
}

export const pushDistance = { value: 0 };

export function beginPush(dx: number, dz: number, ms: number, distance: number) {
  applyPush(dx, dz, ms);
  pushDistance.value = distance;
}

export function resetCombat() {
  postMarks.count = 0;
  push.until = 0;
  for (const b of bolts) b.alive = false;
}
