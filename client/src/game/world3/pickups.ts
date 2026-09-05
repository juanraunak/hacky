// The three laws, lying on the floor. You start with nothing and have to go
// and pick them up, so each law arrives as a thing you found rather than a
// button that was always there.

import { local } from '../world1/local';
import { groundHeight } from './layout';
import type { WeaponId } from './weapons';

export interface Pickup {
  id: WeaponId;
  x: number;
  z: number;
  taken: boolean;
}

export const PICKUPS: Pickup[] = [
  { id: 'shield', x: -26, z: 20, taken: false },
  { id: 'sword', x: 0, z: 34, taken: false },
  { id: 'gun', x: 27, z: 19, taken: false },
];

export const PICKUP_RADIUS = 3.4;

export function pickupY(p: Pickup): number {
  return groundHeight(p.x, p.z) + 1.5;
}

/** Returns the law you just walked into, if any. */
export function collectNearby(): WeaponId | null {
  for (const p of PICKUPS) {
    if (p.taken) continue;
    if (Math.hypot(local.x - p.x, local.z - p.z) < PICKUP_RADIUS) {
      p.taken = true;
      return p.id;
    }
  }
  return null;
}

export function resetPickups() {
  for (const p of PICKUPS) p.taken = false;
}
