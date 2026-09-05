// Your own character, the camera, the sun that follows you, and everything
// you can do: walk, look, tap Newton or the apple, walk into the apple.
// Position goes to the database at 10 Hz, only when it changed.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { Kid, type KidAnim } from './Character';
import { lookFor } from './palette';
import {
  APPLE_PICKUP_RADIUS,
  APPLE_REST,
  APPLE_TRIGGER_RADIUS,
  NEWTON,
  WALK_SPEED,
  groundHeight,
  resolveCollisions,
} from './layout';
import { consumeLook, consumeTaps, input, interactables, local } from './local';
import { APPLE_EVENT, APPLE_ITEM, useWorld } from './store';
import { fireWorldEvent, movePlayer, pickUpItem } from './sync';
import { appleSettled } from './Apple';

const EYE_HEIGHT = 1.62;
const TP_TARGET_HEIGHT = 1.35;
const TP_DISTANCE = 6;
const TP_DISTANCE_PORTRAIT = 7.6;
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

export function LocalPlayer() {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const anim = useRef<KidAnim>({ speed: 0 });
  const identity = useWorld(s => s.identity);
  const mode = useWorld(s => s.cameraMode);
  const isTouch = useWorld(s => s.isTouch);
  const holding = useWorld(s => (s.identity ? (s.held[s.identity] ?? null) : null));
  const look = useMemo(() => lookFor(identity ?? 'nobody'), [identity]);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const firedAt = useRef(0);
  const pickAt = useRef(0);
  const lastSent = useRef({ x: NaN, z: NaN, h: NaN });
  const camPos = useRef(new THREE.Vector3());
  const camInit = useRef(false);

  // Spawn point from the database, once.
  useEffect(() => {
    const apply = () => {
      const s = useWorld.getState();
      if (local.spawned || !s.identity) return;
      const p = s.positions[s.identity];
      if (!p) return;
      local.x = p.x;
      local.z = p.z;
      local.heading = p.heading;
      local.yaw = p.heading + Math.PI;
      local.spawned = true;
      camera.rotation.set(0, p.heading + Math.PI, 0, 'YXZ');
    };
    apply();
    return useWorld.subscribe(apply);
  }, [camera]);

  // Keyboard. Desktop only in practice, harmless on a phone.
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
    const up = (e: KeyboardEvent) => {
      input.keys.delete(e.code);
    };
    const blur = () => input.keys.clear();
    // In first person the pointer is locked and the crosshair is the finger:
    // a click is a tap on whatever is under it.
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

  // 10 Hz position sync, only on change.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!local.spawned) return;
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
    const now = performance.now();
    const first = mode === 'first' && !isTouch;

    // --- look ---------------------------------------------------------
    if (first) {
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      local.yaw = e.y;
    } else {
      const d = consumeLook();
      const k = isTouch ? LOOK_SPEED_TOUCH : LOOK_SPEED_MOUSE;
      local.yaw -= d.x * k;
      local.pitch = Math.min(1.05, Math.max(0.08, local.pitch + d.y * k * 0.7));
    }

    // --- walk ---------------------------------------------------------
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
    const fx = -Math.sin(local.yaw);
    const fz = -Math.cos(local.yaw);
    const rx = -fz;
    const rz = fx;
    if (mag > 0.02 && local.spawned) {
      const dx = fx * my + rx * mx;
      const dz = fz * my + rz * mx;
      const step = WALK_SPEED * dt;
      const moved = resolveCollisions(local.x + dx * step, local.z + dz * step);
      local.x = moved.x;
      local.z = moved.z;
      if (!first) local.heading = angleLerp(local.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 14));
    }
    if (first) local.heading = local.yaw + Math.PI;
    local.speed += (mag - local.speed) * (1 - Math.exp(-dt * 12));
    anim.current.speed = local.speed;

    const gy = groundHeight(local.x, local.z);
    if (group.current) {
      group.current.position.set(local.x, gy, local.z);
      group.current.rotation.y = local.heading;
    }

    // --- camera -------------------------------------------------------
    const s = useWorld.getState();
    let shakeX = 0;
    let shakeY = 0;
    if (now < s.shakeUntil) {
      const a = s.shakeStrength * ((s.shakeUntil - now) / 380);
      shakeX = (Math.random() * 2 - 1) * a;
      shakeY = (Math.random() * 2 - 1) * a;
    }
    if (first) {
      camera.position.set(local.x + shakeX, gy + EYE_HEIGHT + shakeY, local.z);
    } else {
      const portrait = size.height > size.width;
      const dist = portrait ? TP_DISTANCE_PORTRAIT : TP_DISTANCE;
      const tx = local.x;
      const ty = gy + TP_TARGET_HEIGHT;
      const tz = local.z;
      const cp = Math.cos(local.pitch);
      const wx = tx + Math.sin(local.yaw) * cp * dist;
      const wz = tz + Math.cos(local.yaw) * cp * dist;
      const wy = Math.max(ty + Math.sin(local.pitch) * dist, groundHeight(wx, wz) + 0.7);
      const want = camPos.current.set(wx, wy, wz);
      if (!camInit.current) {
        camera.position.copy(want);
        camInit.current = true;
      } else {
        camera.position.lerp(want, 1 - Math.exp(-dt * 14));
      }
      camera.lookAt(tx + shakeX, ty + shakeY, tz);
    }

    // --- the apple ----------------------------------------------------
    if (local.spawned && s.identity) {
      const dNewton = Math.hypot(local.x - NEWTON.x, local.z - NEWTON.z);
      if (!s.events[APPLE_EVENT] && dNewton < APPLE_TRIGGER_RADIUS && now - firedAt.current > 3000) {
        firedAt.current = now;
        fireWorldEvent(APPLE_EVENT);
      }
      const someoneHolds = Object.values(s.held).includes(APPLE_ITEM);
      if (!someoneHolds && appleSettled()) {
        const dApple = Math.hypot(local.x - APPLE_REST.x, local.z - APPLE_REST.z);
        if (dApple < APPLE_PICKUP_RADIUS && now - pickAt.current > 1500) {
          pickAt.current = now;
          pickUpItem(APPLE_ITEM);
        }
      }

      // Taps: Newton or the apple, when you are close enough to matter.
      const taps = consumeTaps();
      if (taps.length && interactables.size) {
        const targets = [...interactables];
        for (const tap of taps) {
          raycaster.setFromCamera(new THREE.Vector2(tap.x, tap.y), camera);
          const hit = raycaster.intersectObjects(targets, true)[0];
          if (!hit) continue;
          let o: THREE.Object3D | null = hit.object;
          while (o && !o.userData.interact) o = o.parent;
          const what = o?.userData.interact as string | undefined;
          if (what === 'newton' && dNewton < APPLE_TRIGGER_RADIUS && !s.events[APPLE_EVENT]) {
            firedAt.current = now;
            fireWorldEvent(APPLE_EVENT);
          } else if (what === 'apple' && !someoneHolds && appleSettled()) {
            const dApple = Math.hypot(local.x - APPLE_REST.x, local.z - APPLE_REST.z);
            if (dApple < 3) {
              pickAt.current = now;
              pickUpItem(APPLE_ITEM);
            }
          }
        }
      }
    }
  });

  const first = mode === 'first' && !isTouch;

  return (
    <>
      {first && <PointerLockControls />}
      <group ref={group}>
        <Kid look={look} anim={anim} headless={first} holding={holding} />
        {/* The one shadow-casting light rides with the player so its 1024
            shadow map only has to cover the ground you can actually see. */}
        <directionalLight
          castShadow
          position={[18, 30, 12]}
          intensity={2.6}
          color="#fff1c8"
          target={sunTarget}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-28}
          shadow-camera-right={28}
          shadow-camera-top={28}
          shadow-camera-bottom={-28}
          shadow-camera-near={1}
          shadow-camera-far={90}
          shadow-bias={-0.0006}
          shadow-normalBias={0.035}
        />
        <primitive object={sunTarget} position={[0, 0, 0]} />
      </group>
    </>
  );
}
