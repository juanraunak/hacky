// Newton. Same rig language as the kids, adult proportions, long coat, long
// hair tied back. He sits against the trunk and breathes, turning his head
// toward whoever is nearest. When the story is over he pushes off the trunk,
// stands, and walks the path home to the cottage.
//
// The whole ending is driven by the newton_leaves world_event, so every phone
// plays it together and a late joiner finds him already indoors.

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { GEO, Part } from './toon';
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
} from './palette';
import {
  ENDING_TOTAL_MS,
  NEWTON,
  NEWTON_FACING,
  NEWTON_STAND_MS,
  NEWTON_WALK_END_MS,
  NEWTON_WALK_LENGTH,
  NEWTON_WALK_SPEED,
  NEWTON_WALK_START_MS,
  groundHeight,
  smoothstep,
  walkPoint,
} from './layout';
import { interactables, local } from './local';
import { NEWTON_LEAVES, useWorld } from './store';

const LOOK_RANGE = 22;

// Skeleton. Seated hips sit low enough that the top of his head lands at
// NEWTON_HEAD_Y, which is where the apple aims.
const THIGH = 0.5;
const SHIN = 0.44;
const FOOT_H = 0.17;
const HIP_SEATED = 0.36;
const HIP_STAND = THIGH + SHIN + FOOT_H;

// Seated pose: legs stretched out in front, arms toward the knees, coat
// skirt fallen forward over the lap.
const SEAT_THIGH = -1.35;
const SEAT_SHIN = 0.25;
const SEAT_ARM = -0.75;
const SEAT_SKIRT = -1.15;

const STRIDE = 0.5;
const CADENCE = 2.6; // radians of walk phase per unit walked

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function angleLerp(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

export function Newton() {
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

  const targetYaw = useRef(0);
  const nextTurn = useRef(0);
  const phase = useRef(0);
  const facing = useRef(NEWTON_FACING);

  useEffect(() => {
    const g = root.current;
    if (!g) return;
    g.userData.interact = 'newton';
    interactables.add(g);
    return () => {
      interactables.delete(g);
    };
  }, []);

  useFrame(({ clock }, rawDt) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const event = useWorld.getState().events[NEWTON_LEAVES];

    // --- where he is in the ending -------------------------------------
    let stand = 0;
    let walked = 0;
    let moving = 0;
    let home = false;

    if (event) {
      if (Date.now() - event.firedAt > ENDING_TOTAL_MS) {
        home = true;
      } else {
        const ms = performance.now() - event.receivedAt;
        stand = smoothstep(0, NEWTON_STAND_MS, ms);
        if (ms > NEWTON_WALK_START_MS) {
          walked = Math.min(
            NEWTON_WALK_LENGTH,
            ((ms - NEWTON_WALK_START_MS) / 1000) * NEWTON_WALK_SPEED
          );
          moving = walked < NEWTON_WALK_LENGTH ? 1 : 0;
        }
        if (ms > NEWTON_WALK_END_MS + 120) home = true;
      }
    }

    g.visible = !home;
    if (home) return;

    // --- root: position along the path, turned the way he is going ------
    const spot = walked > 0 ? walkPoint(walked) : { x: NEWTON.x, z: NEWTON.z, heading: NEWTON_FACING };
    g.position.set(spot.x, groundHeight(spot.x, spot.z), spot.z);
    const wantFacing = moving > 0 ? spot.heading : facing.current;
    facing.current = angleLerp(facing.current, wantFacing, 1 - Math.exp(-dt * 4));
    g.rotation.y = facing.current;

    // --- walk cycle -----------------------------------------------------
    phase.current += dt * NEWTON_WALK_SPEED * CADENCE * moving;
    const swing = Math.sin(phase.current) * STRIDE * moving;
    const bendL = Math.max(0, -Math.sin(phase.current + 0.9)) * 0.85 * moving;
    const bendR = Math.max(0, Math.sin(phase.current + 0.9)) * 0.85 * moving;

    const thighL = lerp(SEAT_THIGH, swing, stand);
    const thighR = lerp(SEAT_THIGH, -swing, stand);
    const shinL = lerp(SEAT_SHIN, bendL, stand);
    const shinR = lerp(SEAT_SHIN, bendR, stand);

    if (legL.current) legL.current.rotation.x = thighL;
    if (legR.current) legR.current.rotation.x = thighR;
    if (kneeL.current) kneeL.current.rotation.x = shinL;
    if (kneeR.current) kneeR.current.rotation.x = shinR;
    // Feet level out most of the way, so he never walks on his toes.
    if (footL.current) footL.current.rotation.x = -(thighL + shinL) * 0.75;
    if (footR.current) footR.current.rotation.x = -(thighR + shinR) * 0.75;

    // --- hips, lean, breathing -----------------------------------------
    const bob = Math.abs(Math.sin(phase.current)) * 0.05 * moving;
    if (hips.current) hips.current.position.y = lerp(HIP_SEATED, HIP_STAND, stand) + bob;
    if (torso.current) {
      // A push off the trunk: he leans into standing, then straightens.
      const pushOff = Math.sin(stand * Math.PI) * 0.28;
      torso.current.rotation.x = pushOff + 0.09 * moving;
      const breath = 1 + Math.sin(t * 1.35) * 0.018 * (1 - moving);
      torso.current.scale.set(1, breath, 1);
    }

    // --- arms and coat ---------------------------------------------------
    const armSwing = -swing * 0.85;
    if (armL.current) armL.current.rotation.x = lerp(SEAT_ARM, armSwing, stand);
    if (armR.current) armR.current.rotation.x = lerp(SEAT_ARM, -armSwing, stand);
    const sway = -swing * 0.4;
    if (skirtL.current) skirtL.current.rotation.x = lerp(SEAT_SKIRT, sway, stand);
    if (skirtR.current) skirtR.current.rotation.x = lerp(SEAT_SKIRT, -sway, stand);

    // --- head -------------------------------------------------------------
    if (stand < 0.5 && t > nextTurn.current) {
      nextTurn.current = t + 2.5 + Math.random() * 3.5;
      targetYaw.current = yawToNearest();
    }
    if (stand >= 0.5) targetYaw.current = 0; // walking: eyes front
    if (head.current) {
      const k = 1 - Math.exp(-dt * 3.2);
      const idle = Math.sin(t * 0.9) * 0.04 * (1 - moving);
      head.current.rotation.y += (targetYaw.current + idle - head.current.rotation.y) * k;
      head.current.rotation.x = Math.sin(t * 0.7) * 0.03 - 0.05 * moving;
    }
  });

  const y = groundHeight(NEWTON.x, NEWTON.z);

  return (
    <group ref={root} position={[NEWTON.x, y, NEWTON.z]} rotation={[0, NEWTON_FACING, 0]}>
      <group ref={hips} position={[0, HIP_SEATED, 0]}>
        {/* legs: hip -> knee -> foot, so one rig covers sitting and walking */}
        <group ref={legL} position={[0.19, 0, 0]} rotation={[SEAT_THIGH, 0, 0]}>
          <Part
            color={NEWTON_BREECHES}
            position={[0, -THIGH / 2, 0]}
            scale={[0.27, THIGH, 0.29]}
          />
          <group ref={kneeL} position={[0, -THIGH, 0]} rotation={[SEAT_SHIN, 0, 0]}>
            <Part
              color={NEWTON_STOCKING}
              position={[0, -SHIN / 2, 0]}
              scale={[0.22, SHIN, 0.24]}
            />
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
        <group ref={legR} position={[-0.19, 0, 0]} rotation={[SEAT_THIGH, 0, 0]}>
          <Part
            color={NEWTON_BREECHES}
            position={[0, -THIGH / 2, 0]}
            scale={[0.27, THIGH, 0.29]}
          />
          <group ref={kneeR} position={[0, -THIGH, 0]} rotation={[SEAT_SHIN, 0, 0]}>
            <Part
              color={NEWTON_STOCKING}
              position={[0, -SHIN / 2, 0]}
              scale={[0.22, SHIN, 0.24]}
            />
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

        {/* coat skirt: hangs when he stands, lies over the lap when he sits */}
        <group ref={skirtL} position={[0.3, 0.02, 0]} rotation={[SEAT_SKIRT, 0, 0]}>
          <Part color={NEWTON_COAT} position={[0, -0.36, 0]} scale={[0.3, 0.74, 0.5]} />
        </group>
        <group ref={skirtR} position={[-0.3, 0.02, 0]} rotation={[SEAT_SKIRT, 0, 0]}>
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

          <group ref={armL} position={[0.52, 0.86, 0.04]} rotation={[SEAT_ARM, 0, -0.08]}>
            <Part color={NEWTON_COAT} position={[0, -0.3, 0]} scale={[0.23, 0.6, 0.23]} />
            <Part
              geometry={GEO.sphere}
              color={SKIN}
              position={[0, -0.64, 0]}
              scale={0.14}
              outline={0.08}
            />
          </group>
          <group ref={armR} position={[-0.52, 0.86, 0.04]} rotation={[SEAT_ARM, 0, 0.08]}>
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
    </group>
  );
}

// Head yaw (relative to his facing) toward the nearest player within range.
function yawToNearest(): number {
  const { positions, identity } = useWorld.getState();
  let best = LOOK_RANGE;
  let bx = 0;
  let bz = 0;
  const consider = (x: number, z: number) => {
    const d = Math.hypot(x - NEWTON.x, z - NEWTON.z);
    if (d < best) {
      best = d;
      bx = x;
      bz = z;
    }
  };
  if (local.spawned) consider(local.x, local.z);
  for (const [id, p] of Object.entries(positions)) {
    if (id !== identity) consider(p.x, p.z);
  }
  if (best >= LOOK_RANGE) return 0;
  const yaw = Math.atan2(bx - NEWTON.x, bz - NEWTON.z) - NEWTON_FACING;
  return Math.max(-1.1, Math.min(1.1, yaw));
}
