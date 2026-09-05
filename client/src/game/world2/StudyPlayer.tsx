// You, in the study. Same controls as the meadow — thumb to walk, thumb to
// look, WASD and pointer lock on a desktop — over a flat floor and rectangular
// furniture instead of a heightmap.
//
// A tap does one of three things, in order: lets go of something you picked
// up off the desk, swings the pen once the pen is yours, or picks up whatever
// the tap landed on.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { Kid, type KidAnim } from '../world1/Character';
import { lookFor } from '../world1/palette';
import { EYE_HEIGHT, WALK_SPEED, resolveStudy, studySpawn } from './study';
import { consumeLook, consumeTaps, input, interactables, local } from '../world1/local';
import { FIGHT_DONE, FIGHT_READY, PEN_ITEM, PORTAL_OPEN, useWorld } from '../world1/store';
import { dropItem, movePlayer, pickUpItem } from '../world1/sync';
import { dropEventFor, fireDrop, isDroppable } from './DropTest';
import { useStudy } from './studyStore';

const TP_TARGET_HEIGHT = 1.35;
const TP_DISTANCE = 5.2;
const TP_DISTANCE_PORTRAIT = 6.4;
const LOOK_SPEED_TOUCH = 0.0062;
const LOOK_SPEED_MOUSE = 0.0045;
const SEND_INTERVAL_MS = 100;

const KEY_DIRS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

function angleLerp(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

export function StudyPlayer() {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const anim = useRef<KidAnim>({ speed: 0 });
  const identity = useWorld(s => s.identity);
  const mode = useWorld(s => s.cameraMode);
  const isTouch = useWorld(s => s.isTouch);
  const holding = useWorld(s => (s.identity ? (s.held[s.identity] ?? null) : null));
  const look = useMemo(() => lookFor(identity ?? 'nobody'), [identity]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const camPos = useRef(new THREE.Vector3());
  const camInit = useRef(false);
  const lastSent = useRef({ x: NaN, z: NaN, h: NaN });
  const placed = useRef(false);

  // Everyone lands in a loose arc facing the desk. Ordered by identity so the
  // party does not shuffle between clients.
  useEffect(() => {
    if (placed.current || !identity) return;
    const s = useWorld.getState();
    const ids = Object.keys(s.party).sort();
    const index = Math.max(0, ids.indexOf(identity));
    const spot = studySpawn(index, Math.max(1, ids.length));
    local.x = spot.x;
    local.z = spot.z;
    local.heading = Math.PI; // face the desk
    local.yaw = 0;
    local.spawned = true;
    placed.current = true;
    camera.rotation.set(0, Math.PI, 0, 'YXZ');
  }, [identity, camera]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyV' && !e.repeat && !useWorld.getState().isTouch) {
        const s = useWorld.getState();
        const next = s.cameraMode === 'first' ? 'third' : 'first';
        if (next === 'third' && document.pointerLockElement) document.exitPointerLock();
        s.setCameraMode(next);
        return;
      }
      if (KEY_DIRS[e.code]) {
        e.preventDefault();
        input.keys.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => input.keys.delete(e.code);
    const blur = () => input.keys.clear();
    // Pointer locked: the crosshair is the finger, so a click is a tap.
    const click = () => {
      if (document.pointerLockElement) input.taps.push({ x: 0, y: 0 });
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('mousedown', click);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('mousedown', click);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const prev = lastSent.current;
      if (
        Math.abs(prev.x - local.x) < 0.02 &&
        Math.abs(prev.z - local.z) < 0.02 &&
        Math.abs(prev.h - local.heading) < 0.03
      ) {
        return;
      }
      lastSent.current = { x: local.x, z: local.z, h: local.heading };
      movePlayer(local.x, local.z, local.heading);
    }, SEND_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const first = mode === 'first' && !isTouch;
    const s = useWorld.getState();
    // The card holds everyone still until somebody presses Ready.
    const paused = !!s.events[PORTAL_OPEN] && !s.events[FIGHT_READY] && !s.events[FIGHT_DONE];

    if (first) {
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      local.yaw = e.y;
    } else {
      const d = consumeLook();
      const k = isTouch ? LOOK_SPEED_TOUCH : LOOK_SPEED_MOUSE;
      local.yaw -= d.x * k;
      local.pitch = Math.min(1.05, Math.max(0.08, local.pitch + d.y * k * 0.7));
    }

    let mx = input.move.x;
    let my = input.move.y;
    for (const code of input.keys) {
      const dir = KEY_DIRS[code];
      if (dir) {
        mx += dir[0];
        my += dir[1];
      }
    }
    let mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
      mag = 1;
    }
    if (paused) mag = 0;

    const fx = -Math.sin(local.yaw);
    const fz = -Math.cos(local.yaw);
    if (mag > 0.02) {
      const dx = fx * my - fz * mx;
      const dz = fz * my + fx * mx;
      const step = WALK_SPEED * dt;
      const moved = resolveStudy(local.x + dx * step, local.z + dz * step);
      local.x = moved.x;
      local.z = moved.z;
      if (!first) {
        local.heading = angleLerp(local.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 14));
      }
    }
    if (first) local.heading = local.yaw + Math.PI;
    local.speed += (mag - local.speed) * (1 - Math.exp(-dt * 12));
    anim.current.speed = local.speed;

    if (group.current) {
      group.current.position.set(local.x, 0, local.z);
      group.current.rotation.y = local.heading;
    }

    // --- camera ---------------------------------------------------------
    const now = performance.now();
    let shakeX = 0;
    let shakeY = 0;
    if (now < s.shakeUntil) {
      const a = s.shakeStrength * ((s.shakeUntil - now) / 400);
      shakeX = (Math.random() * 2 - 1) * a;
      shakeY = (Math.random() * 2 - 1) * a;
    }
    if (first) {
      camera.position.set(local.x + shakeX, EYE_HEIGHT + shakeY, local.z);
    } else {
      const portrait = size.height > size.width;
      const dist = portrait ? TP_DISTANCE_PORTRAIT : TP_DISTANCE;
      const cp = Math.cos(local.pitch);
      // Keep the camera out of the walls: it is a room, not a meadow.
      const raw = camPos.current.set(
        local.x + Math.sin(local.yaw) * cp * dist,
        TP_TARGET_HEIGHT + Math.sin(local.pitch) * dist,
        local.z + Math.cos(local.yaw) * cp * dist
      );
      const inside = resolveStudy(raw.x, raw.z);
      raw.set(inside.x, Math.min(raw.y, 4.4), inside.z);
      if (!camInit.current) {
        camera.position.copy(raw);
        camInit.current = true;
      } else {
        camera.position.lerp(raw, 1 - Math.exp(-dt * 14));
      }
      camera.lookAt(local.x + shakeX, TP_TARGET_HEIGHT + shakeY, local.z);
    }

    // --- taps -------------------------------------------------------------
    const taps = consumeTaps();
    if (!taps.length || paused) return;
    const mine = s.identity ? s.held[s.identity] : null;

    for (const tap of taps) {
      // 1. Carrying something off the desk that has not been dropped yet?
      //    Let go of it. Once its drop has happened the pen is kit, and a tap
      //    means something else.
      if (mine && isDroppable(mine) && !s.events[dropEventFor(mine)]) {
        dropItem();
        fireDrop(mine);
        break;
      }
      // 2. Pen in hand? Swing it. Swinging at nothing is allowed.
      if (mine === PEN_ITEM) {
        useStudy.getState().markSwing();
        continue;
      }
      // 3. Otherwise, pick up whatever is under the tap.
      if (!interactables.size) continue;
      raycaster.setFromCamera(new THREE.Vector2(tap.x, tap.y), camera);
      const hit = raycaster.intersectObjects([...interactables], true)[0];
      if (!hit) continue;
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.interact) o = o.parent;
      const what = o?.userData.interact as string | undefined;
      if (!what || !isDroppable(what)) continue;
      if (s.events[dropEventFor(what)]) continue; // already dropped
      const near = Math.hypot(hit.point.x - local.x, hit.point.z - local.z);
      if (near > 3.2) continue;
      pickUpItem(what);
    }
  });

  const first = mode === 'first' && !isTouch;

  return (
    <>
      {first && <PointerLockControls />}
      <group ref={group}>
        <Kid look={look} anim={anim} headless={first} holding={holding} />
      </group>
    </>
  );
}
