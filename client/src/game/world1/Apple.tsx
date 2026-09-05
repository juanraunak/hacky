// The apple. Hangs in the canopy until the world_event row for `apple_fell`
// arrives, then falls, bounces once off Newton's head, rolls to rest. After
// that it is a thing in the world; if a held_item row says someone has it,
// it is drawn in their hand instead (see Character.tsx) and not here.
//
// Everything here keys off the database row, never off local proximity, so
// every phone in the room sees the same fall at the same moment.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { AppleMesh } from './AppleMesh';
import {
  APPLE_HANG,
  APPLE_RADIUS,
  APPLE_REST,
  NEWTON,
  NEWTON_HEAD_Y,
  groundHeight,
} from './layout';
import { interactables } from './local';
import { APPLE_EVENT, APPLE_ITEM, useWorld } from './store';

const FALL_S = 0.7;
const BOUNCE_S = 0.45;
const ROLL_S = 0.6;
const ROLL_DIST = 0.35;
// A row older than this when it arrives is history: skip the animation and the
// monologue, just put the apple on the ground.
const STALE_MS = 6000;

export const APPLE_SETTLED_S = FALL_S + BOUNCE_S + ROLL_S;

function easeOutQuad(u: number) {
  return 1 - (1 - u) * (1 - u);
}

export function Apple() {
  const ref = useRef<Group>(null);
  const event = useWorld(s => s.events[APPLE_EVENT]);
  const heldBy = useWorld(s => {
    for (const [id, item] of Object.entries(s.held)) if (item === APPLE_ITEM) return id;
    return null;
  });
  const impacted = useRef(false);

  const stale = useMemo(() => (event ? Date.now() - event.firedAt > STALE_MS : false), [event]);

  const geometry = useMemo(() => {
    const groundY = groundHeight(APPLE_REST.x, APPLE_REST.z);
    const headTop = groundHeight(NEWTON.x, NEWTON.z) + NEWTON_HEAD_Y + APPLE_RADIUS;
    const restY = groundY + APPLE_RADIUS;
    const dx = APPLE_REST.x - APPLE_HANG.x;
    const dz = APPLE_REST.z - APPLE_HANG.z;
    const len = Math.hypot(dx, dz) || 1;
    const dir = { x: dx / len, z: dz / len };
    const land = { x: APPLE_REST.x - dir.x * ROLL_DIST, z: APPLE_REST.z - dir.z * ROLL_DIST };
    return { headTop, restY, dir, land };
  }, []);

  useEffect(() => {
    const g = ref.current;
    if (!g) return;
    g.userData.interact = 'apple';
    interactables.add(g);
    return () => {
      interactables.delete(g);
    };
  }, []);

  useEffect(() => {
    if (!event) impacted.current = false;
    else if (stale) impacted.current = true;
  }, [event, stale]);

  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    if (heldBy) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const t = clock.elapsedTime;

    if (!event) {
      g.position.set(APPLE_HANG.x, APPLE_HANG.y, APPLE_HANG.z);
      g.rotation.set(Math.sin(t * 1.3) * 0.09, 0, Math.cos(t * 1.1) * 0.09);
      g.scale.setScalar(1);
      return;
    }

    const { headTop, restY, dir, land } = geometry;
    const tau = stale ? APPLE_SETTLED_S + 1 : (performance.now() - event.receivedAt) / 1000;

    if (tau < FALL_S) {
      const u = tau / FALL_S;
      g.position.set(APPLE_HANG.x, APPLE_HANG.y - (APPLE_HANG.y - headTop) * u * u, APPLE_HANG.z);
      g.rotation.set(0, 0, 0);
      g.scale.setScalar(1);
      return;
    }

    if (!impacted.current) {
      impacted.current = true;
      const s = useWorld.getState();
      s.shake(0.16, 380);
      s.puff(APPLE_HANG.x, APPLE_HANG.y + 0.9, APPLE_HANG.z);
      s.setStoryStartedAt(performance.now());
    }

    if (tau < FALL_S + BOUNCE_S) {
      const u = (tau - FALL_S) / BOUNCE_S;
      // squash: full at impact, recovered by u = 0.35
      const sq = u < 0.12 ? 1 : u < 0.35 ? 1 - (u - 0.12) / 0.23 : 0;
      g.scale.set(1 + sq * 0.3, 1 - sq * 0.35, 1 + sq * 0.3);
      const x = APPLE_HANG.x + (land.x - APPLE_HANG.x) * u;
      const z = APPLE_HANG.z + (land.z - APPLE_HANG.z) * u;
      const y = headTop + (restY - headTop) * u + 4 * 0.6 * u * (1 - u);
      g.position.set(x, y, z);
      g.rotation.set(u * 3, 0, 0);
      return;
    }

    if (tau < APPLE_SETTLED_S) {
      const u = easeOutQuad((tau - FALL_S - BOUNCE_S) / ROLL_S);
      g.scale.setScalar(1);
      g.position.set(land.x + dir.x * ROLL_DIST * u, restY, land.z + dir.z * ROLL_DIST * u);
      g.rotation.set(3 + u * 2.5, Math.atan2(dir.x, dir.z), 0);
      return;
    }

    g.scale.setScalar(1);
    g.position.set(APPLE_REST.x, restY, APPLE_REST.z);
    g.rotation.set(5.5, Math.atan2(dir.x, dir.z), 0.3);
  });

  return (
    <group ref={ref}>
      <AppleMesh />
    </group>
  );
}

/** True once the apple is lying on the ground and can be picked up. */
export function appleSettled(): boolean {
  const ev = useWorld.getState().events[APPLE_EVENT];
  if (!ev) return false;
  if (Date.now() - ev.firedAt > STALE_MS) return true;
  return (performance.now() - ev.receivedAt) / 1000 >= APPLE_SETTLED_S;
}
