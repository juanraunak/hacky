// Newton, standing behind his desk. Same figure as the meadow, built standing
// rather than seated: the walk rig from World 1 stays where it is so nothing
// in the meadow changes. He breathes, and turns his head toward the nearest
// player. His thought bubble types out whatever line the study has queued.

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
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
import { NEWTON_FACING, NEWTON_SPOT } from './study';
import { useWorld } from '../world1/store';
import { local } from '../world1/local';
import { useStudy } from './studyStore';
import { FADE_MS, HOLD_MS, TYPE_MS, pauseAfter } from './story2';

const THIGH = 0.5;
const SHIN = 0.44;
const FOOT_H = 0.17;
const HIP_Y = THIGH + SHIN + FOOT_H;
const HEAD_TOP = HIP_Y + 1.34 + 0.42;

function Leg({ side }: { side: number }) {
  return (
    <group position={[0.19 * side, 0, 0]}>
      <Part color={NEWTON_BREECHES} position={[0, -THIGH / 2, 0]} scale={[0.27, THIGH, 0.29]} />
      <group position={[0, -THIGH, 0]}>
        <Part color={NEWTON_STOCKING} position={[0, -SHIN / 2, 0]} scale={[0.22, SHIN, 0.24]} />
        <Part
          color={SHOE}
          position={[0, -SHIN - FOOT_H / 2, 0.1]}
          scale={[0.28, FOOT_H, 0.46]}
          outline={0.07}
        />
      </group>
    </group>
  );
}

export function StudyNewton() {
  const torso = useRef<Group>(null);
  const head = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const targetYaw = useRef(0);
  const nextTurn = useRef(0);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    if (torso.current) {
      const breath = 1 + Math.sin(t * 1.3) * 0.02;
      torso.current.scale.set(1, breath, 1);
      torso.current.rotation.x = Math.sin(t * 0.6) * 0.012;
    }
    if (armL.current) armL.current.rotation.x = -0.12 + Math.sin(t * 0.8) * 0.05;
    if (armR.current) armR.current.rotation.x = -0.18 + Math.sin(t * 0.7 + 1) * 0.05;
    if (t > nextTurn.current) {
      nextTurn.current = t + 2.4 + Math.random() * 3.2;
      targetYaw.current = yawToNearest();
    }
    if (head.current) {
      const k = 1 - Math.exp(-dt * 3.2);
      head.current.rotation.y += (targetYaw.current - head.current.rotation.y) * k;
      head.current.rotation.x = Math.sin(t * 0.7) * 0.03;
    }
  });

  return (
    <group position={[NEWTON_SPOT.x, 0, NEWTON_SPOT.z]} rotation={[0, NEWTON_FACING, 0]}>
      <group position={[0, HIP_Y, 0]}>
        <Leg side={1} />
        <Leg side={-1} />
        <Part color={NEWTON_COAT} position={[0.3, -0.34, 0]} scale={[0.3, 0.74, 0.5]} />
        <Part color={NEWTON_COAT} position={[-0.3, -0.34, 0]} scale={[0.3, 0.74, 0.5]} />

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
      await wait(HOLD_MS);
      if (cancelled) return;
      setFading(true);
      await wait(FADE_MS);
      if (cancelled) return;
      setVisible(false);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [line, lineId]);

  if (!visible) return null;
  return (
    <Html position={[0, HEAD_TOP + 0.2, 0.1]} center zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className={`bubble${fading ? ' bubble--fade' : ''}`}>{text || ' '}</div>
    </Html>
  );
}

function yawToNearest(): number {
  const { positions, identity } = useWorld.getState();
  let best = 24;
  let bx = 0;
  let bz = 0;
  const consider = (x: number, z: number) => {
    const d = Math.hypot(x - NEWTON_SPOT.x, z - NEWTON_SPOT.z);
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
  const yaw = Math.atan2(bx - NEWTON_SPOT.x, bz - NEWTON_SPOT.z) - NEWTON_FACING;
  return Math.max(-1.1, Math.min(1.1, yaw));
}
