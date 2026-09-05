// Everything in flight. Kept outside React: these are updated per frame and
// rendered from instanced meshes, so no component re-renders while they move.

import { local } from '../world1/local';
import { applePos, groundHeight } from './layout';

export interface Shot {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  hostile: boolean;
}

export const shots: Shot[] = [];

export function fireBullet(fromX: number, fromZ: number, toX: number, toY: number, toZ: number) {
  const dx = toX - fromX;
  const dy = toY - (groundHeight(fromX, fromZ) + 1.5);
  const dz = toZ - fromZ;
  const d = Math.hypot(dx, dy, dz) || 1;
  const speed = 52; // slow enough to actually watch
  shots.push({
    x: fromX,
    y: groundHeight(fromX, fromZ) + 1.5,
    z: fromZ,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    vz: (dz / d) * speed,
    life: 2.2,
    hostile: false,
  });
}

/** The boss throws these. Only a braced shield stops one. */
export function throwOrb(fromY: number, toX: number, toZ: number) {
  const dx = toX - applePos.x;
  const dy = groundHeight(toX, toZ) + 1.4 - fromY;
  const dz = toZ - applePos.z;
  const d = Math.hypot(dx, dy, dz) || 1;
  const speed = 26; // you need time to get the shield up
  shots.push({
    x: applePos.x,
    y: fromY,
    z: applePos.z,
    vx: (dx / d) * speed,
    vy: (dy / d) * speed,
    vz: (dz / d) * speed,
    life: 4,
    hostile: true,
  });
}

/** Returns true if a hostile orb reached the local player this frame. */
export function stepShots(dt: number): boolean {
  let struck = false;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    s.life -= dt;

    if (s.hostile) {
      const d = Math.hypot(s.x - local.x, s.z - local.z);
      if (d < 2.2) {
        struck = true;
        shots.splice(i, 1);
        continue;
      }
    }
    if (s.life <= 0 || s.y < groundHeight(s.x, s.z) - 1) shots.splice(i, 1);
  }
  return struck;
}

export function clearShots() {
  shots.length = 0;
}
