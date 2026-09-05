// The universal player controller. This is World 1's movement and camera,
// lifted out so every world runs the identical thing. World 4 gets it free.
//
// How it works, because the details are the feel:
//
//   left 45% of the screen  drag to walk (TouchInput writes input.move)
//   right 55%               drag to orbit the camera
//
//   Movement is CAMERA-RELATIVE: up on the stick is always "away from the
//   camera", whatever the character is facing. The character then turns to
//   face where he is walking.
//
//   The camera is PASSIVE. It sits at a fixed orbit angle `yaw` and only ever
//   changes when the look thumb drags. It never chases the character's
//   heading. The player stays centred and pivots underneath it.
//
// Worlds differ only in the ground under them, what they collide with, and
// how far back the camera sits.

import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { Kid, type KidAnim } from '../world1/Character';
import { lookFor } from '../world1/palette';
import { consumeLook, input, local } from '../world1/local';
import { useWorld } from '../world1/store';
import { movePlayer } from '../world1/sync';

const EYE_HEIGHT = 1.62;
const TP_TARGET_HEIGHT = 1.35;
const LOOK_SPEED_TOUCH = 0.0062;
const LOOK_SPEED_MOUSE = 0.0045;
const PITCH_MIN = 0.08;
const PITCH_MAX = 1.05;
/** ART-STYLE.md: top-down at about 52 degrees. */
const DEFAULT_PITCH = 0.91;
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

export interface PlayerRigProps {
  /** Height of the floor under a point. Flat rooms pass () => 0. */
  ground: (x: number, z: number) => number;
  /** Push a position out of anything solid. */
  collide: (x: number, z: number) => { x: number; z: number };
  walkSpeed: number;
  /** How far the camera sits back, landscape and portrait. */
  distance?: number;
  distancePortrait?: number;
  /**
   * Where to stand. Give a point for rooms you can spawn anywhere in; leave it
   * out to wait for the server's spawn row, which is what World 1 wants.
   */
  spawnAt?: { x: number; z: number; heading: number };
  /**
   * Freeze input and hand the camera to something else (a cutscene).
   * Functions, not booleans: these flip at runtime and the rig re-renders
   * almost never, so a plain boolean is read once and then wrong forever.
   */
  frozen?: () => boolean;
  cameraTakenOver?: () => boolean;
  /** Jump and sprint are opt-in per world. */
  allowJump?: boolean;
  allowSprint?: boolean;
  /** Anything to carry: weapons, tools. */
  children?: ReactNode;
}

export function PlayerRig({
  ground,
  collide,
  walkSpeed,
  distance = 6,
  distancePortrait = 7.6,
  spawnAt,
  frozen,
  cameraTakenOver,
  allowJump = false,
  allowSprint = false,
  children,
}: PlayerRigProps) {
  const { camera, size } = useThree();
  const group = useRef<THREE.Group>(null);
  const anim = useRef<KidAnim>({ speed: 0 });
  const identity = useWorld(s => s.identity);
  const mode = useWorld(s => s.cameraMode);
  const isTouch = useWorld(s => s.isTouch);
  const look = useMemo(() => lookFor(identity ?? 'nobody'), [identity]);
  const sunTarget = useMemo(() => new THREE.Object3D(), []);
  const lastSent = useRef({ x: NaN, z: NaN, h: NaN });
  const camPos = useRef(new THREE.Vector3());
  const camInit = useRef(false);

  // Stand up. A world with a fixed spawn does it now; otherwise wait for the
  // server to say where, which is what World 1 needs.
  useEffect(() => {
    if (spawnAt) {
      local.x = spawnAt.x;
      local.z = spawnAt.z;
      local.heading = spawnAt.heading;
      local.yaw = spawnAt.heading + Math.PI;
      local.pitch = DEFAULT_PITCH;
      local.spawned = true;
      return;
    }
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
  }, [camera, spawnAt]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyV' && !e.repeat && !useWorld.getState().isTouch) {
        const s = useWorld.getState();
        const next = s.cameraMode === 'first' ? 'third' : 'first';
        if (next === 'third' && document.pointerLockElement) document.exitPointerLock();
        s.setCameraMode(next);
        return;
      }
      if (allowJump && e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (local.y <= 0.01) local.vy = 15;
        return;
      }
      if (allowSprint && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) {
        local.sprinting = true;
        return;
      }
      if (KEY_DIRS[e.code]) {
        e.preventDefault();
        input.keys.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') local.sprinting = false;
      input.keys.delete(e.code);
    };
    const blur = () => input.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [allowJump, allowSprint]);

  // 10 Hz position sync, only when it changed.
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

    // --- look: the camera only turns when the look thumb drags -----------
    if (first) {
      const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      local.yaw = e.y;
    } else {
      const d = consumeLook();
      const k = isTouch ? LOOK_SPEED_TOUCH : LOOK_SPEED_MOUSE;
      local.yaw -= d.x * k;
      local.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, local.pitch + d.y * k * 0.7));
    }

    // --- walk: camera-relative, then face where you are going -------------
    const held = frozen?.() ?? false;
    let mx = held ? 0 : input.move.x;
    let my = held ? 0 : input.move.y;
    for (const code of held ? [] : input.keys) {
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
      const step = walkSpeed * (allowSprint && local.sprinting ? 1.85 : 1) * dt;
      const moved = collide(local.x + dx * step, local.z + dz * step);
      local.x = moved.x;
      local.z = moved.z;
      if (!first) local.heading = angleLerp(local.heading, Math.atan2(dx, dz), 1 - Math.exp(-dt * 14));
    }
    if (first) local.heading = local.yaw + Math.PI;
    local.speed += (mag - local.speed) * (1 - Math.exp(-dt * 12));
    anim.current.speed = local.speed;

    // recoil, if a world uses it
    if (local.recoilX !== 0 || local.recoilZ !== 0) {
      const step = collide(local.x + local.recoilX * dt, local.z + local.recoilZ * dt);
      local.x = step.x;
      local.z = step.z;
      const decay = Math.exp(-dt * 5.5);
      local.recoilX *= decay;
      local.recoilZ *= decay;
      if (Math.hypot(local.recoilX, local.recoilZ) < 0.4) {
        local.recoilX = 0;
        local.recoilZ = 0;
      }
    }

    if (allowJump) {
      local.vy -= 38 * dt;
      local.y += local.vy * dt;
      if (local.y <= 0) {
        local.y = 0;
        local.vy = 0;
      }
    }

    const gy = ground(local.x, local.z) + (allowJump ? local.y : 0);
    if (group.current) {
      group.current.position.set(local.x, gy, local.z);
      group.current.rotation.y = local.heading;
    }

    // --- camera: passive, fixed orbit, player always centred --------------
    if (cameraTakenOver?.()) return;

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
      const dist = portrait ? distancePortrait : distance;
      const tx = local.x;
      const ty = gy + TP_TARGET_HEIGHT;
      const tz = local.z;
      const cp = Math.cos(local.pitch);
      const wx = tx + Math.sin(local.yaw) * cp * dist;
      const wz = tz + Math.cos(local.yaw) * cp * dist;
      const wy = Math.max(ty + Math.sin(local.pitch) * dist, ground(wx, wz) + 0.7);
      const want = camPos.current.set(wx, wy, wz);
      if (!camInit.current) {
        camera.position.copy(want);
        camInit.current = true;
      } else {
        camera.position.lerp(want, 1 - Math.exp(-dt * 14));
      }
      camera.lookAt(tx + shakeX, ty + shakeY, tz);
    }
  });

  const first = mode === 'first' && !isTouch;

  return (
    <>
      {first && <PointerLockControls />}
      <group ref={group}>
        <Kid look={look} anim={anim} headless={first} />
        {children}
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

export default PlayerRig;
