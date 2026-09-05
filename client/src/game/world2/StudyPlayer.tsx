// You, in the study. Same controls as the meadow — thumb to walk, thumb to
// look, WASD and pointer lock on a desktop — over a flat floor and rectangular
// furniture instead of a heightmap.
//
// A tap does one of three things, in order: lets go of something you picked
// up off the desk, swings the pen once the pen is yours, or picks up whatever
// the tap landed on.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { briefing } from './briefState';
import { ROOM_X, ROOM_Z } from './study';
import { HeldWeapon } from '../world3/HeldWeapon';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { Kid, type KidAnim } from '../world1/Character';
import { lookFor } from '../world1/palette';
import { EYE_HEIGHT, WALK_SPEED, resolveStudy, studySpawn } from './study';
import {
  beginHold,
  consumeLook,
  consumeRelease,
  consumeTaps,
  endHold,
  holdMs,
  input,
  interactables,
  local,
} from '../world1/local';
import {
  FIGHT_DONE,
  FIGHT_READY,
  GUN_ITEM,
  PEN_ITEM,
  PORTAL_OPEN,
  SHIELD_ITEM,
  SWORD_ITEM,
  isWeapon,
  useWorld,
} from '../world1/store';
import { dropItem, equipItem, movePlayer, pickUpItem } from '../world1/sync';
import { dropEventFor, fireDrop, isDroppable } from './DropTest';
import { useStudy } from './studyStore';
import {
  BOB_RADIUS,
  BRACE_MS,
  GUN_COOLDOWN_MS,
  RECOIL,
  RECOIL_MS,
  SHOVE,
  SHOVE_MS,
  SWORD_REACH,
  bites,
  chargeOf,
} from './laws';
import { POST, POST_R, pendulumAt } from './study';
import { beginPush, chipPost, fireBolt, pushDistance, stepBolts, stepPush } from './combat';
import { thud } from './sound';

const TP_TARGET_HEIGHT = 1.35;
const TP_DISTANCE = 5.2;
const TP_DISTANCE_PORTRAIT = 6.4;
const LOOK_SPEED_TOUCH = 0.0034; // gentler on a thumb
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
  void useWorld(s => (s.identity ? (s.held[s.identity] ?? null) : null));
  const look = useMemo(() => lookFor(identity ?? 'nobody'), [identity]);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const camPos = useRef(new THREE.Vector3());
  const camInit = useRef(false);
  const lastSent = useRef({ x: NaN, z: NaN, h: NaN });
  const placed = useRef(false);
  const lastBob = useRef(0);
  const lastShot = useRef(0);

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
    // A click is a tap. Holding the button is a wind-up or a brace, so the
    // press and the release are both events, not just the press.
    const press = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (document.pointerLockElement) input.taps.push({ x: 0, y: 0 });
      beginHold();
    };
    const release = (e: MouseEvent) => {
      if (e.button === 0) endHold();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    document.addEventListener('mousedown', press);
    document.addEventListener('mouseup', release);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      document.removeEventListener('mousedown', press);
      document.removeEventListener('mouseup', release);
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
      const hi = isTouch ? 0.58 : 1.05;
      const lo = isTouch ? 0.14 : 0.08;
      local.pitch = Math.min(hi, Math.max(lo, local.pitch + d.y * k * 0.7));
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

    // Third law: the gun shoves you, and in here you should feel it.
    if (local.recoilX !== 0 || local.recoilZ !== 0) {
      local.x += local.recoilX * dt;
      local.z += local.recoilZ * dt;
      // Stay in the room: a shove is a stagger, not an exit.
      local.x = Math.max(-ROOM_X + 0.8, Math.min(ROOM_X - 0.8, local.x));
      local.z = Math.max(-ROOM_Z + 0.8, Math.min(ROOM_Z - 0.8, local.z));
      const decay = Math.exp(-dt * 5.5);
      local.recoilX *= decay;
      local.recoilZ *= decay;
      if (Math.hypot(local.recoilX, local.recoilZ) < 0.4) {
        local.recoilX = 0;
        local.recoilZ = 0;
      }
    }

    if (group.current) {
      group.current.position.set(local.x, 0, local.z);
      group.current.rotation.y = local.heading;
    }

    // --- camera ---------------------------------------------------------
    const now = performance.now();
    const store = s;
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
      if (briefing.active) return;
      camera.lookAt(local.x + shakeX, TP_TARGET_HEIGHT + shakeY, local.z);
    }

    // --- the three laws ---------------------------------------------------
    const study = useStudy.getState();
    const mine = s.identity ? (s.held[s.identity] ?? null) : null;
    const done = s.events[FIGHT_DONE];
    stepBolts(dt);

    // A push in progress moves you whatever you are doing about it. That is
    // rather the point of both the recoil and the sandbag.
    const shove = stepPush(dt, pushDistance.value);
    if (shove.x !== 0 || shove.z !== 0) {
      const moved = resolveStudy(local.x + shove.x, local.z + shove.z);
      local.x = moved.x;
      local.z = moved.z;
    }

    // FIRST LAW — set your feet and the forces cancel, so nothing happens
    // to you. Stand there and the sandbag keeps its motion, through you.
    const bracing = mine === SHIELD_ITEM && holdMs() > BRACE_MS;
    study.setBracing(bracing);
    if (done && !paused) {
      const bob = pendulumAt(performance.now() - done.receivedAt);
      const reach = Math.hypot(bob.x - local.x, bob.z - local.z);
      if (reach < BOB_RADIUS && bob.speed > 0.3 && now - lastBob.current > 900) {
        lastBob.current = now;
        if (bracing) {
          store.shake(0.12, 240);
          thud(1.2);
          study.markBrace();
        } else {
          beginPush(bob.vx, 0, SHOVE_MS, SHOVE);
          store.shake(0.34, 520);
          thud(1);
        }
      }
    }

    // The wind-up, for the bar on screen.
    study.setCharge(mine === SWORD_ITEM ? chargeOf(holdMs()) : 0);

    const releasedMs = consumeRelease();
    if (releasedMs > 0 && !paused) {
      // SECOND LAW — the damage is the acceleration you gave the blade, so a
      // flick slides off oak and a proper swing takes a chip out of it.
      if (mine === SWORD_ITEM) {
        const charge = chargeOf(releasedMs);
        const tipX = local.x + Math.sin(local.heading) * SWORD_REACH;
        const tipZ = local.z + Math.cos(local.heading) * SWORD_REACH;
        if (Math.hypot(tipX - POST.x, tipZ - POST.z) < POST_R + 1.0) {
          if (bites(charge)) {
            chipPost();
            study.markHit();
            store.shake(0.16 + charge * 0.12, 300);
            thud(1.6);
          } else {
            study.markNothing();
            store.shake(0.04, 140);
            thud(0.35);
          }
        }
      }

      // THIRD LAW — send something that fast away from you and it sends you
      // the other way. The kick is the mechanic, not decoration.
      if (mine === GUN_ITEM && now - lastShot.current > GUN_COOLDOWN_MS) {
        lastShot.current = now;
        const sx = Math.sin(local.heading);
        const sz = Math.cos(local.heading);
        fireBolt(local.x + sx * 0.6, 1.25, local.z + sz * 0.6, local.heading);
        beginPush(-sx, -sz, RECOIL_MS, RECOIL);
        store.shake(0.22, 280);
        thud(1.7);
      }
    }

    // --- taps -------------------------------------------------------------
    const taps = consumeTaps();
    if (!taps.length || paused) return;

    for (const tap of taps) {
      // 1. Carrying something off the desk that has not been dropped yet?
      //    Let go. Once its drop has happened it is kit, not a thing to fumble.
      if (mine && isDroppable(mine) && !s.events[dropEventFor(mine)]) {
        dropItem();
        fireDrop(mine);
        break;
      }

      // 2. Whatever the tap landed on: a weapon off the rack, or a desk item.
      let took = false;
      if (interactables.size) {
        raycaster.setFromCamera(new THREE.Vector2(tap.x, tap.y), camera);
        const hit = raycaster.intersectObjects([...interactables], true)[0];
        if (hit) {
          let o: THREE.Object3D | null = hit.object;
          while (o && !o.userData.interact) o = o.parent;
          const what = o?.userData.interact as string | undefined;
          const near = Math.hypot(hit.point.x - local.x, hit.point.z - local.z);
          if (what && isWeapon(what) && near < 5) {
            equipItem(what);
            took = true;
          } else if (what && isDroppable(what) && !s.events[dropEventFor(what)] && near < 3.2) {
            pickUpItem(what);
            took = true;
          }
        }
      }

      // 3. Nothing to take, pen in hand: swing it.
      if (!took && mine === PEN_ITEM) study.markSwing();
    }
  });

  const first = mode === 'first' && !isTouch;

  return (
    <>
      {first && <PointerLockControls />}
      <group ref={group}>
        {/* No pen: the briefing hands you World 3's weapons, and HeldWeapon
            draws whichever one is in hand. */}
        <Kid look={look} anim={anim} headless={first} holding={null} />
        <HeldWeapon />
      </group>
    </>
  );
}
