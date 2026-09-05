// Newton in the study. Same figure as the meadow, with the same hip/knee/foot
// rig, so he can walk. He does: he goes to whatever he is talking about, says
// his piece, and moves on. Standing behind a desk reciting is not teaching.
//
// His bubble hangs over his head and travels with him.

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { newtonEntrance } from './briefState';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { GEO, Part } from '../world1/toon';
import {
  EYE,
  NEWTON_BREECHES,
  NEWTON_COAT,
  NEWTON_HAIR,
  NEWTON_RIBBON,
  NEWTON_SHIRT,
  NEWTON_STOCKING,
  SHOE,
  SKIN,
} from '../world1/palette';
import { NEWTON_FACING, NEWTON_SPOT, NEWTON_WALK_SPEED, newtonAt } from './study';
import { useWorld } from '../world1/store';
import { local } from '../world1/local';
import { useStudy } from './studyStore';
import { FADE_MS, GAP_MS, HOLD_MS, TYPE_MS, pauseAfter } from './story2';

const THIGH = 0.5;
const SHIN = 0.44;
const FOOT_H = 0.17;
const HIP_Y = THIGH + SHIN + FOOT_H;
const HEAD_TOP = HIP_Y + 1.34 + 0.42;

const STRIDE = 0.46;
const CADENCE = 3.4; // radians of walk phase per unit walked
const ARRIVE = 0.25;

function angleLerp(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}


/** Where he actually is this frame, so a scene can throw from him or hit him. */
export const newtonPos = { x: 0, z: 0 };

export function StudyNewton() {
  const root = useRef<Group>(null);
  const hips = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const kneeL = useRef<Group>(null);
  const kneeR = useRef<Group>(null);
  const footL = useRef<Group>(null);
  const footR = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const skirtL = useRef<Group>(null);
  const skirtR = useRef<Group>(null);

  const at = useRef({ x: NEWTON_SPOT.x, z: NEWTON_SPOT.z });
  const facing = useRef(NEWTON_FACING);
  const phase = useRef(0);
  const moving = useRef(0);
  const targetYaw = useRef(0);
  const nextTurn = useRef(0);
  const nextFollow = useRef(0);

  useFrame(({ clock }, rawDt) => {
    // He follows you. Ean's own path walker does the moving so his legs and
    // turning animate properly; this just keeps re-pointing it at you.
    if (root.current) {
      if (newtonEntrance.playing) {
        const k = Math.min(1, (performance.now() - newtonEntrance.startedAt) / 3400);
        root.current.position.x = NEWTON_SPOT.x;
        root.current.position.z = 7 + (NEWTON_SPOT.z - 7) * (k * k * (3 - 2 * k));
        root.current.rotation.y = Math.PI;
        if (k >= 1) newtonEntrance.playing = false;
      }
      newtonPos.x = root.current.position.x;
      newtonPos.z = root.current.position.z;
    }

    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    // Re-aim at the player, but only when he has genuinely fallen behind and
    // only when he is not already walking somewhere. Re-pathing him while he
    // was still arriving is what made him jitter on the spot.
    if (!newtonEntrance.playing && performance.now() > nextFollow.current) {
      const away = Math.hypot(local.x - g.position.x, local.z - g.position.z);
      const idle = useStudy.getState().path.length === 0;
      if (idle && away > 5) {
        nextFollow.current = performance.now() + 1800;
        const back = Math.max(0.001, away);
        // Stop a comfortable 3 units short, clamped to the open floor.
        let tx = local.x - ((local.x - g.position.x) / back) * 3;
        let tz = local.z - ((local.z - g.position.z) / back) * 3;
        tx = Math.max(-8.2, Math.min(8.2, tx));
        tz = Math.max(-3.4, Math.min(6.2, tz));
        useStudy.getState().goTo(tx, tz);
      }
    }

    const path = useStudy.getState().path;
    const target = path[0];

    // --- walking --------------------------------------------------------
    let want = 0;
    if (target) {
      const dx = target.x - at.current.x;
      const dz = target.z - at.current.z;
      const d = Math.hypot(dx, dz);
      if (d > ARRIVE) {
        want = 1;
        const step = Math.min(d, NEWTON_WALK_SPEED * dt);
        at.current.x += (dx / d) * step;
        at.current.z += (dz / d) * step;
        facing.current = angleLerp(facing.current, Math.atan2(dx, dz), 1 - Math.exp(-dt * 6));
      } else if (path.length > 1) {
        useStudy.getState().stepped();
      }
    }
    newtonAt.x = at.current.x;
    newtonAt.z = at.current.z;
    moving.current += (want - moving.current) * (1 - Math.exp(-dt * 9));
    const walk = moving.current;
    phase.current += dt * NEWTON_WALK_SPEED * CADENCE * walk;

    g.position.set(at.current.x, 0, at.current.z);
    g.rotation.y = facing.current;

    const swing = Math.sin(phase.current) * STRIDE * walk;
    const bendL = Math.max(0, -Math.sin(phase.current + 0.9)) * 0.8 * walk;
    const bendR = Math.max(0, Math.sin(phase.current + 0.9)) * 0.8 * walk;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (kneeL.current) kneeL.current.rotation.x = bendL;
    if (kneeR.current) kneeR.current.rotation.x = bendR;
    if (footL.current) footL.current.rotation.x = -(swing + bendL) * 0.75;
    if (footR.current) footR.current.rotation.x = -(-swing + bendR) * 0.75;
    if (armL.current) armL.current.rotation.x = -0.12 - swing * 0.8;
    if (armR.current) armR.current.rotation.x = -0.18 + swing * 0.8;
    if (skirtL.current) skirtL.current.rotation.x = -swing * 0.35;
    if (skirtR.current) skirtR.current.rotation.x = swing * 0.35;

    if (hips.current) {
      hips.current.position.y = HIP_Y + Math.abs(Math.sin(phase.current)) * 0.045 * walk;
    }
    if (torso.current) {
      const breath = 1 + Math.sin(t * 1.3) * 0.02 * (1 - walk);
      torso.current.scale.set(1, breath, 1);
      torso.current.rotation.x = 0.08 * walk;
    }

    // --- head: forward while walking, at whoever is nearest while still ---
    if (walk > 0.4) {
      targetYaw.current = 0;
    } else if (t > nextTurn.current) {
      nextTurn.current = t + 2.4 + Math.random() * 3.2;
      targetYaw.current = yawToNearest(at.current, facing.current);
    }
    if (head.current) {
      const k = 1 - Math.exp(-dt * 3.2);
      head.current.rotation.y += (targetYaw.current - head.current.rotation.y) * k;
      head.current.rotation.x = Math.sin(t * 0.7) * 0.03;
    }
  });

  return (
    <group ref={root} position={[NEWTON_SPOT.x, 0, NEWTON_SPOT.z]} rotation={[0, NEWTON_FACING, 0]}>
      <group ref={hips} position={[0, HIP_Y, 0]}>
        <group ref={legL} position={[0.19, 0, 0]}>
          <Part color={NEWTON_BREECHES} position={[0, -THIGH / 2, 0]} scale={[0.27, THIGH, 0.29]} />
          <group ref={kneeL} position={[0, -THIGH, 0]}>
            <Part color={NEWTON_STOCKING} position={[0, -SHIN / 2, 0]} scale={[0.22, SHIN, 0.24]} />
            <group ref={footL} position={[0, -SHIN, 0]}>
              <Part
                color={SHOE}
                position={[0, -FOOT_H / 2, 0.1]}
                scale={[0.28, FOOT_H, 0.46]}
                outline={0.07}
              />
            </group>
          </group>
        </group>
        <group ref={legR} position={[-0.19, 0, 0]}>
          <Part color={NEWTON_BREECHES} position={[0, -THIGH / 2, 0]} scale={[0.27, THIGH, 0.29]} />
          <group ref={kneeR} position={[0, -THIGH, 0]}>
            <Part color={NEWTON_STOCKING} position={[0, -SHIN / 2, 0]} scale={[0.22, SHIN, 0.24]} />
            <group ref={footR} position={[0, -SHIN, 0]}>
              <Part
                color={SHOE}
                position={[0, -FOOT_H / 2, 0.1]}
                scale={[0.28, FOOT_H, 0.46]}
                outline={0.07}
              />
            </group>
          </group>
        </group>

        <group ref={skirtL} position={[0.3, 0.02, 0]}>
          <Part color={NEWTON_COAT} position={[0, -0.36, 0]} scale={[0.3, 0.74, 0.5]} />
        </group>
        <group ref={skirtR} position={[-0.3, 0.02, 0]}>
          <Part color={NEWTON_COAT} position={[0, -0.36, 0]} scale={[0.3, 0.74, 0.5]} />
        </group>

        <group ref={torso}>
          <Part color={NEWTON_COAT} position={[0, 0.52, 0]} scale={[0.8, 0.92, 0.48]} />
          <Part
            color={NEWTON_SHIRT}
            position={[0, 0.62, 0.25]}
            scale={[0.26, 0.52, 0.06]}
            outline={0.08}
          />
          <Part
            color={NEWTON_SHIRT}
            position={[0, 0.91, 0.27]}
            scale={[0.22, 0.17, 0.1]}
            outline={0.1}
          />
          <group ref={armL} position={[0.52, 0.86, 0.04]} rotation={[-0.12, 0, -0.1]}>
            <Part color={NEWTON_COAT} position={[0, -0.3, 0]} scale={[0.23, 0.6, 0.23]} />
            <Part
              geometry={GEO.sphere}
              color={SKIN}
              position={[0, -0.64, 0]}
              scale={0.14}
              outline={0.08}
            />
          </group>
          <group ref={armR} position={[-0.52, 0.86, 0.04]} rotation={[-0.18, 0, 0.1]}>
            <Part color={NEWTON_COAT} position={[0, -0.3, 0]} scale={[0.23, 0.6, 0.23]} />
            <Part
              geometry={GEO.sphere}
              color={SKIN}
              position={[0, -0.64, 0]}
              scale={0.14}
              outline={0.08}
            />
          </group>

          <group ref={head} position={[0, 0.94, 0]}>
            <Part geometry={GEO.sphere} color={SKIN} position={[0, 0.4, 0]} scale={0.42} />
            <Part
              geometry={GEO.sphereLow}
              color={EYE}
              position={[0.15, 0.44, 0.38]}
              scale={[0.06, 0.08, 0.03]}
              outline={0}
              castShadow={false}
            />
            <Part
              geometry={GEO.sphereLow}
              color={EYE}
              position={[-0.15, 0.44, 0.38]}
              scale={[0.06, 0.08, 0.03]}
              outline={0}
              castShadow={false}
            />
            <Part
              geometry={GEO.sphere}
              color={NEWTON_HAIR}
              position={[0, 0.52, -0.07]}
              scale={[0.47, 0.38, 0.47]}
              outline={0.06}
            />
            <Part
              geometry={GEO.cylinder}
              color={NEWTON_HAIR}
              position={[0, 0.05, -0.44]}
              rotation={[0.28, 0, 0]}
              scale={[0.13, 0.7, 0.13]}
              outline={0.1}
            />
            <Part
              color={NEWTON_RIBBON}
              position={[0, 0.34, -0.42]}
              scale={[0.22, 0.09, 0.14]}
              outline={0.1}
              castShadow={false}
            />
          </group>
        </group>
      </group>

      <StudyBubble />
    </group>
  );
}

function StudyBubble() {
  const line = useStudy(s => s.line);
  const lineId = useStudy(s => s.lineId);
  const [text, setText] = useState('');
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!line) {
      setVisible(false);
      return;
    }
    let cancelled = false;
    let timer = 0;
    const wait = (ms: number) =>
      new Promise<void>(resolve => {
        timer = window.setTimeout(resolve, ms);
      });

    (async () => {
      setFading(false);
      setVisible(true);
      const chars = Array.from(line);
      for (let i = 1; i <= chars.length; i++) {
        if (cancelled) return;
        setText(chars.slice(0, i).join(''));
        await wait(TYPE_MS + pauseAfter(chars[i - 1]));
      }
      // Hold long enough to read, then hand over to the next line of the beat.
      await wait(HOLD_MS + chars.length * 12);
      if (cancelled) return;
      setFading(true);
      await wait(FADE_MS);
      if (cancelled) return;
      setVisible(false);
      await wait(GAP_MS);
      if (cancelled) return;
      useStudy.getState().advance();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [line, lineId]);

  if (!visible) return null;
  return (
    <Html
      position={[0, HEAD_TOP + 0.25, 0.1]}
      center
      zIndexRange={[40, 0]}
      style={{ pointerEvents: 'none' }}
    >
      {/* shield in the off hand, pistol in the other; he came prepared */}
      <group position={[-0.46, 1.0, 0.26]} rotation={[0, -0.35, 0]} scale={0.85}>
        <mesh>
          <boxGeometry args={[0.52, 0.66, 0.07]} />
          <meshToonMaterial color="#3aa0ff" />
        </mesh>
        <mesh position={[0, 0, 0.05]}>
          <boxGeometry args={[0.56, 0.09, 0.04]} />
          <meshToonMaterial color="#111111" />
        </mesh>
      </group>

      {/* he is holding a pistol, and yes he knows */}
      <group name="newton-gun" position={[0.42, 1.02, 0.3]} rotation={[0, 0.3, 0]} scale={0.8}>
        <mesh position={[0, 0, 0.18]}>
          <boxGeometry args={[0.09, 0.11, 0.34]} />
          <meshToonMaterial color="#3a4a6e" />
        </mesh>
        <mesh position={[0, -0.11, 0.02]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.08, 0.2, 0.09]} />
          <meshToonMaterial color="#5a3a1e" />
        </mesh>
      </group>

      <div className={`bubble${fading ? ' bubble--fade' : ''}`}>{text || ' '}</div>
    </Html>
  );
}

function yawToNearest(at: { x: number; z: number }, facing: number): number {
  const { positions, identity } = useWorld.getState();
  let best = 24;
  let bx = 0;
  let bz = 0;
  const consider = (x: number, z: number) => {
    const d = Math.hypot(x - at.x, z - at.z);
    if (d < best) {
      best = d;
      bx = x;
      bz = z;
    }
  };
  consider(local.x, local.z);
  for (const [id, p] of Object.entries(positions)) {
    if (id !== identity) consider(p.x, p.z);
  }
  if (best >= 24) return 0;
  const yaw = Math.atan2(bx - at.x, bz - at.z) - facing;
  return Math.max(-1.1, Math.min(1.1, ((yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI));
}
