// The Giant Apple. It is not a decoration and it is not friendly: it falls out
// of the sky onto the arena, lands hard, and then looms over the middle
// seething at whoever is closest.
//
// Per ART-STYLE.md: flat toon colour, ink outlines, glowing eyes that run
// yellow -> orange -> red as it gets angrier, horns and claws in ink-purple.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, Mesh } from 'three';
import { GEO, Part } from '../world1/toon';
import { INK } from '../world1/palette';
import { local } from '../world1/local';
import { useWorld } from '../world1/store';
import { APPLE_CENTER_Y, APPLE_RADIUS, applePos, groundHeight } from './layout';
import { PHASES, cinematic, damagePlayer, markLanded, phaseOf, readCombat } from './combat';
import { Explosion } from './Explosion';

const RED = '#ff4d4d';
const RED_DARK = '#c9302f';
const BRUISE = '#8f2340';
const SPIKE = '#2a2438'; // ink-purple: horns, claws, teeth roots
const TOOTH = '#fff8e7';
const STEM = '#5a3a1e';
const LEAF = '#4be36b';

const EYE_BY_PHASE = ['#ffc72c', '#ff8c3a', '#ff2d2d'];

const FALL_FROM = 220;
const FALL_DELAY_MS = 11000; // wander first; it arrives when you have settled
const R = APPLE_RADIUS;
const K = R / 7.2; // the model was authored at R = 7.2; keep it proportional

function shake(strength: number, ms: number) {
  useWorld.setState({ shakeUntil: performance.now() + ms, shakeStrength: strength });
}

/** Dust ring thrown out by the landing. */
function Impact({ at }: { at: React.RefObject<number> }) {
  const mesh = useRef<Mesh>(null);
  useFrame(() => {
    const m = mesh.current;
    if (!m || !at.current) return;
    const t = (performance.now() - at.current) / 900;
    if (t > 1) {
      m.visible = false;
      return;
    }
    m.visible = true;
    const s = 1 + t * 9;
    m.scale.set(s, s, s);
    (m.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  });
  return (
    <mesh ref={mesh} visible={false} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3 * K, 0]}>
      <ringGeometry args={[R * 0.9, R * 1.25, 40]} />
      <meshBasicMaterial color="#ff8c3a" transparent opacity={1} />
    </mesh>
  );
}

/**
 * Where the boss should be looking. Computed only from synced player_position
 * rows, so every client works it out identically — the apple faces the party
 * as a group, not whoever happens to be holding the phone.
 */
function partyFocus(): { cx: number; cz: number; nx: number; nz: number; count: number } {
  const positions = useWorld.getState().positions;
  let sx = 0;
  let sz = 0;
  let count = 0;
  let best = Infinity;
  let nx = 0;
  let nz = 1;
  for (const id of Object.keys(positions).sort()) {
    const p = positions[id];
    if (!p) continue;
    sx += p.x;
    sz += p.z;
    count++;
    const d = Math.hypot(p.x - applePos.x, p.z - applePos.z);
    if (d < best) {
      best = d;
      nx = p.x;
      nz = p.z;
    }
  }
  if (!count) return { cx: local.x, cz: local.z, nx: local.x, nz: local.z, count: 0 };
  return { cx: sx / count, cz: sz / count, nx, nz, count };
}

export function GiantApple() {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const face = useRef<Group>(null);
  const jaw = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftEye = useRef<Mesh>(null);
  const rightEye = useRef<Mesh>(null);
  const eyes = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const impactAt = useRef(0);

  const fall = useRef({ y: FALL_FROM, v: 0, landed: false });
  const walkSpeed = useRef(0);
  const mounted = useRef(performance.now());
  const blewAt = useRef(0);
  const blowOrigin = useRef(new THREE.Vector3());
  const flash = useRef(0);
  const recoil = useRef(0);
  const hitsSeen = useRef(0);
  const sink = useRef(0);
  const eyeMats = useMemo(
    () => [new THREE.MeshBasicMaterial({ color: EYE_BY_PHASE[0] }), new THREE.MeshBasicMaterial({ color: EYE_BY_PHASE[0] })],
    []
  );

  const ground = groundHeight(0, 0);

  useFrame((state, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const c = readCombat();
    const phase = phaseOf(c.hp);
    const rageBase = phase / (PHASES - 1);

    // --- the entrance --------------------------------------------------
    // Lock the screen from the shout until just after it lands.
    const since = performance.now() - mounted.current;
    if (!fall.current.landed) {
      cinematic.active = since > FALL_DELAY_MS - 2600;
      if (since < FALL_DELAY_MS) return;
      fall.current.v += 120 * dt; // heavier, slower descent
      fall.current.y -= fall.current.v * dt;
      if (fall.current.y <= 0) {
        fall.current.y = 0;
        fall.current.landed = true;
        impactAt.current = performance.now();
        shake(1.9, 800);
        markLanded();
        window.setTimeout(() => {
          cinematic.active = false;
        }, 1400);
      }
      g.rotation.y += dt * 2.2;
      g.rotation.z = Math.sin(t * 7) * 0.12;
    }

    // --- react to hits --------------------------------------------------
    if (c.hits !== hitsSeen.current) {
      hitsSeen.current = c.hits;
      flash.current = 1;
      recoil.current = 1;
      shake(0.5 + rageBase * 0.5, 220);
    }
    flash.current = Math.max(0, flash.current - dt * 4.5);
    recoil.current = Math.max(0, recoil.current - dt * 3.2);

    // --- pose ------------------------------------------------------------
    const focus = partyFocus();
    const dx = focus.cx - applePos.x;
    const dz = focus.cz - applePos.z;
    const dist = Math.hypot(focus.nx - applePos.x, focus.nz - applePos.z) || 1;
    const near = Math.max(0, Math.min(1, (48 - dist) / 36));
    const rage = Math.min(1, rageBase * 0.6 + near * 0.6);

    // --- defeat ---------------------------------------------------------
    if (c.down && !blewAt.current) {
      cinematic.active = true;
      blowOrigin.current.set(applePos.x, g.position.y, applePos.z);
      // a beat of swelling, then it goes
      window.setTimeout(() => {
        blewAt.current = performance.now();
        shake(2.4, 900);
      }, 620);
      window.setTimeout(() => {
        cinematic.active = false;
      }, 4200);
    }
    if (c.down) {
      const held = (performance.now() - c.downAt) / 620;
      if (!blewAt.current) {
        // swell and glow white just before it bursts
        const swell = 1 + Math.min(1, held) * 0.34;
        g.scale.setScalar(swell);
        flash.current = Math.min(1, held);
      } else {
        g.visible = false;
      }
    }

    if (c.down) sink.current = 0;

    // Walk. It closes on the party but keeps its distance once it is in range,
    // so it looms rather than shoving you around.
    if (fall.current.landed && !c.down && focus.count > 0) {
      const toX = focus.cx - applePos.x;
      const toZ = focus.cz - applePos.z;
      const away = Math.hypot(toX, toZ) || 1;
      const hold = R + 11;
      const drive = away > hold ? 1 : away < hold * 0.7 ? -0.7 : 0;
      const speed = (3.2 + rageBase * 3.4) * drive;
      applePos.x += (toX / away) * speed * dt;
      applePos.z += (toZ / away) * speed * dt;
      const ad = Math.hypot(applePos.x, applePos.z);
      const limit = 62;
      if (ad > limit) {
        applePos.x = (applePos.x / ad) * limit;
        applePos.z = (applePos.z / ad) * limit;
      }
      walkSpeed.current += (Math.abs(drive) - walkSpeed.current) * (1 - Math.exp(-dt * 6));
    } else {
      walkSpeed.current += (0 - walkSpeed.current) * (1 - Math.exp(-dt * 6));
    }

    const seethe = Math.sin(t * (1.4 + rage * 3.2));
    const hover = fall.current.landed ? 0.5 + seethe * (0.3 + rage * 0.55) : 0;
    g.position.set(
      applePos.x - c.fromX * recoil.current * 1.8,
      ground + APPLE_CENTER_Y + fall.current.y + hover - sink.current * R * 2.1,
      applePos.z - c.fromZ * recoil.current * 1.8
    );

    if (fall.current.landed) {
      // Face the party as a whole. Every client computes this from the same
      // synced rows, so everyone sees it looking the same way.
      const want = Math.atan2(dx, dz);
      let d = want - g.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      g.rotation.y += d * (1 - Math.exp(-dt * 5));
      g.rotation.z = Math.sin(t * (1.1 + rage * 2.6)) * (0.02 + rage * 0.06);
      g.rotation.x = recoil.current * 0.2;
    }

    // breathing squash, harder as it gets angrier; a sharp puff when hit
    const squash = 1 + seethe * (0.015 + rage * 0.035) + flash.current * 0.14;
    if (body.current) body.current.scale.set(squash, 1 / squash, squash);

    // jaw snarls open and shut
    if (jaw.current) {
      jaw.current.rotation.x = 0.12 + (0.1 + rage * 0.4) * (0.5 + 0.5 * Math.sin(t * (2.2 + rage * 4)));
    }

    // fists clench and swing
    const swing = Math.sin(t * (2.4 + rage * 5.5)) * (0.3 + rage * 1.0);
    if (leftArm.current) leftArm.current.rotation.x = swing - recoil.current * 0.8;
    if (rightArm.current) rightArm.current.rotation.x = -swing - recoil.current * 0.8;

    // eyes glow hotter with the phase, and flare white on a hit
    const colour = flash.current > 0.4 ? '#ffffff' : EYE_BY_PHASE[phase] ?? EYE_BY_PHASE[2];
    eyeMats.forEach(m => m.color.set(colour));
    const squint = 1 - rage * 0.32;
    if (leftEye.current) leftEye.current.scale.set(1.05, 0.62 * squint, 0.2);
    if (rightEye.current) rightEye.current.scale.set(1.05, 0.62 * squint, 0.2);

    // Eyes pick out the nearest player and follow them, independent of where
    // the body is pointing.
    if (eyes.current) {
      const eyeWant = Math.atan2(focus.nx - applePos.x, focus.nz - applePos.z) - g.rotation.y;
      let e = eyeWant;
      while (e > Math.PI) e -= Math.PI * 2;
      while (e < -Math.PI) e += Math.PI * 2;
      const clamped = Math.max(-0.55, Math.min(0.55, e));
      eyes.current.rotation.y += (clamped - eyes.current.rotation.y) * (1 - Math.exp(-dt * 8));
    }

    // It swings back. Standing inside its reach costs you health.
    if (fall.current.landed && !c.down) {
      const myDist = Math.hypot(local.x - applePos.x, local.z - applePos.z);
      if (myDist < R + 6.5 && damagePlayer(8 + phase * 3)) {
        shake(0.7, 260);
      }
    }

    // Legs: a real stride when it is walking, an impatient shift when it is not.
    const stride = 0.2 + walkSpeed.current * 0.75 + rage * 0.25;
    const stomp = Math.sin(t * (2.4 + walkSpeed.current * 5 + rage * 3));
    if (leftLeg.current) leftLeg.current.rotation.x = stomp * stride;
    if (rightLeg.current) rightLeg.current.rotation.x = -stomp * stride;
    // bob with the stride so the weight reads
    if (body.current) body.current.position.y = Math.abs(stomp) * walkSpeed.current * 0.5;

    if (face.current) face.current.position.x = flash.current * (Math.random() - 0.5) * 0.5;
  });

  return (
    <group>
      <Impact at={impactAt} />
      <Explosion at={blewAt} origin={blowOrigin} />
      <group ref={root} position={[0, ground + APPLE_CENTER_Y + FALL_FROM, 0]}>
        <group ref={body}>
          {/* body */}
          <Part geometry={GEO.sphere} color={RED} scale={[R, R * 1.05, R * 0.95]} outline={0.035} />
          <Part geometry={GEO.sphereLow} color={BRUISE} position={[-4.4 * K, -2.4 * K, -3.6 * K]} scale={2.3} outline={0} />
          <Part geometry={GEO.sphereLow} color={RED_DARK} position={[4.1 * K, -3.6 * K, -3.9 * K]} scale={1.9} outline={0} />

          {/* stem and leaf, on top of the body */}
          <Part geometry={GEO.cylinder} color={STEM} position={[0, 8.3 * K, 0]} scale={[0.45, 2.4, 0.45]} outline={0.09} />
          <Part geometry={GEO.sphereLow} color={LEAF} position={[2.6 * K, 9.3 * K, 0]} rotation={[0, 0, -0.5]} scale={[2.5, 0.45, 1.2]} outline={0.07} />

          {/* horns, sitting proud on the crown */}
          <Part geometry={GEO.cone} color={SPIKE} position={[-3.0 * K, 7.0 * K, 0.6 * K]} rotation={[0.12, 0, 0.5]} scale={[0.62, 2.3, 0.62]} outline={0.1} />
          <Part geometry={GEO.cone} color={SPIKE} position={[3.0 * K, 7.0 * K, 0.6 * K]} rotation={[0.12, 0, -0.5]} scale={[0.62, 2.3, 0.62]} outline={0.1} />

          {/* arms, clear of the body */}
          <group ref={leftArm} position={[-7.6 * K, 0.4 * K, 0]}>
            <Part geometry={GEO.cylinder} color={RED_DARK} position={[0, -2.1 * K, 0]} scale={[0.85, 4.4, 0.85]} outline={0.07} />
            <Part geometry={GEO.sphereLow} color={RED_DARK} position={[0, -4.5 * K, 0]} scale={1.7} outline={0.08} />
            <Part geometry={GEO.cone} color={SPIKE} position={[0, -5.6 * K, 0.8 * K]} rotation={[2.5, 0, 0]} scale={[0.3, 1.1, 0.3]} outline={0.12} />
            <Part geometry={GEO.cone} color={SPIKE} position={[0.7 * K, -5.6 * K, 0.2 * K]} rotation={[2.9, 0, 0.3]} scale={[0.28, 1.0, 0.28]} outline={0.12} />
          </group>
          <group ref={rightArm} position={[7.6 * K, 0.4 * K, 0]}>
            <Part geometry={GEO.cylinder} color={RED_DARK} position={[0, -2.1 * K, 0]} scale={[0.85, 4.4, 0.85]} outline={0.07} />
            <Part geometry={GEO.sphereLow} color={RED_DARK} position={[0, -4.5 * K, 0]} scale={1.7} outline={0.08} />
            <Part geometry={GEO.cone} color={SPIKE} position={[0, -5.6 * K, 0.8 * K]} rotation={[2.5, 0, 0]} scale={[0.3, 1.1, 0.3]} outline={0.12} />
            <Part geometry={GEO.cone} color={SPIKE} position={[-0.7 * K, -5.6 * K, 0.2 * K]} rotation={[2.9, 0, -0.3]} scale={[0.28, 1.0, 0.28]} outline={0.12} />
          </group>

          {/* legs, wide and planted */}
          <group ref={leftLeg} position={[-3.1 * K, -6.4 * K, 0]}>
            <Part geometry={GEO.cylinder} color={RED_DARK} position={[0, -1.9 * K, 0]} scale={[1.15, 4.0, 1.15]} outline={0.07} />
            <Part geometry={GEO.sphereLow} color={SPIKE} position={[0, -3.9 * K, 0.7 * K]} scale={[1.5, 0.9, 2.2]} outline={0.08} />
          </group>
          <group ref={rightLeg} position={[3.1 * K, -6.4 * K, 0]}>
            <Part geometry={GEO.cylinder} color={RED_DARK} position={[0, -1.9 * K, 0]} scale={[1.15, 4.0, 1.15]} outline={0.07} />
            <Part geometry={GEO.sphereLow} color={SPIKE} position={[0, -3.9 * K, 0.7 * K]} scale={[1.5, 0.9, 2.2]} outline={0.08} />
          </group>

          {/* the face, every piece pushed out onto the surface */}
          <group ref={face}>
            <Part geometry={GEO.box} color={INK} position={[-2.5 * K, 3.3 * K, 6.3 * K]} rotation={[0, 0, -0.62]} scale={[2.4, 0.6, 0.3]} outline={0} />
            <Part geometry={GEO.box} color={INK} position={[2.5 * K, 3.3 * K, 6.3 * K]} rotation={[0, 0, 0.62]} scale={[2.4, 0.6, 0.3]} outline={0} />

            <group ref={eyes}>
              <Part geometry={GEO.sphereLow} color={INK} position={[-2.4 * K, 1.4 * K, 6.6 * K]} scale={[1.55, 1.05, 0.25]} outline={0} />
              <Part geometry={GEO.sphereLow} color={INK} position={[2.4 * K, 1.4 * K, 6.6 * K]} scale={[1.55, 1.05, 0.25]} outline={0} />
              <mesh ref={leftEye} geometry={GEO.sphereLow} material={eyeMats[0]} position={[-2.4 * K, 1.4 * K, 6.85 * K]} />
              <mesh ref={rightEye} geometry={GEO.sphereLow} material={eyeMats[1]} position={[2.4 * K, 1.4 * K, 6.85 * K]} />
            </group>

            <Part geometry={GEO.sphereLow} color={RED_DARK} position={[-4.3 * K, -1.2 * K, 5.1 * K]} scale={[1.1, 0.85, 0.5]} outline={0} />
            <Part geometry={GEO.sphereLow} color={RED_DARK} position={[4.3 * K, -1.2 * K, 5.1 * K]} scale={[1.1, 0.85, 0.5]} outline={0} />

            {/* snarling jaw, sitting on the front of the face */}
            <group ref={jaw} position={[0, -2.4 * K, 5.9 * K]}>
              <Part geometry={GEO.box} color={SPIKE} position={[0, -0.7 * K, 0.5 * K]} scale={[4.6, 2.3, 1.3]} outline={0.05} />
              {[-1.6, -0.8, 0, 0.8, 1.6].map((x, i) => (
                <Part key={`t${i}`} geometry={GEO.cone} color={TOOTH} position={[x, 0.1, 1.1]} rotation={[Math.PI, 0, 0]} scale={[0.32, 0.8, 0.28]} outline={0.06} />
              ))}
              {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
                <Part key={`b${i}`} geometry={GEO.cone} color={TOOTH} position={[x, -1.6, 1.1]} scale={[0.3, 0.75, 0.26]} outline={0.06} />
              ))}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

export default GiantApple;
