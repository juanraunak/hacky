// Newton, seated against the trunk. Same rig language as the kids, adult
// proportions, long coat, long hair tied back. He breathes, and now and then
// turns his head toward whoever is nearest. He does not get up.

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
import { NEWTON, NEWTON_FACING, groundHeight } from './layout';
import { interactables, local } from './local';
import { useWorld } from './store';

const LOOK_RANGE = 22;

export function Newton() {
  const root = useRef<Group>(null);
  const head = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const targetYaw = useRef(0);
  const nextTurn = useRef(0);

  useEffect(() => {
    const g = root.current;
    if (!g) return;
    g.userData.interact = 'newton';
    interactables.add(g);
    return () => {
      interactables.delete(g);
    };
  }, []);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    if (torso.current) {
      const breath = 1 + Math.sin(t * 1.35) * 0.018;
      torso.current.scale.set(1, breath, 1);
    }
    if (t > nextTurn.current) {
      nextTurn.current = t + 2.5 + Math.random() * 3.5;
      targetYaw.current = yawToNearest();
    }
    if (head.current) {
      const k = 1 - Math.exp(-dt * 3.2);
      const idle = Math.sin(t * 0.9) * 0.04;
      head.current.rotation.y += (targetYaw.current + idle - head.current.rotation.y) * k;
      head.current.rotation.x = Math.sin(t * 0.7) * 0.03;
    }
  });

  const y = groundHeight(NEWTON.x, NEWTON.z);

  return (
    <group ref={root} position={[NEWTON.x, y, NEWTON.z]} rotation={[0, NEWTON_FACING, 0]}>
      {/* legs out in front, knees up a little */}
      {[0.19, -0.19].map(x => (
        <group key={x}>
          <Part
            color={NEWTON_BREECHES}
            position={[x, 0.42, 0.38]}
            rotation={[-0.25, 0, 0]}
            scale={[0.26, 0.26, 0.72]}
          />
          <Part
            color={NEWTON_STOCKING}
            position={[x, 0.26, 0.86]}
            rotation={[0.35, 0, 0]}
            scale={[0.21, 0.5, 0.21]}
          />
          <Part
            color={SHOE}
            position={[x, 0.09, 1.05]}
            scale={[0.28, 0.17, 0.46]}
            outline={0.07}
          />
        </group>
      ))}

      <group ref={torso}>
        {/* coat */}
        <Part color={NEWTON_COAT} position={[0, 0.88, 0]} scale={[0.8, 0.92, 0.48]} />
        <Part color={NEWTON_COAT} position={[0.32, 0.4, 0.26]} scale={[0.26, 0.5, 0.56]} />
        <Part color={NEWTON_COAT} position={[-0.32, 0.4, 0.26]} scale={[0.26, 0.5, 0.56]} />
        {/* shirt front and cravat */}
        <Part color={NEWTON_SHIRT} position={[0, 0.98, 0.25]} scale={[0.26, 0.52, 0.06]} outline={0.08} />
        <Part color={NEWTON_SHIRT} position={[0, 1.27, 0.27]} scale={[0.22, 0.17, 0.1]} outline={0.1} />
        {/* arms resting toward the knees */}
        {[0.52, -0.52].map(x => (
          <group key={x} position={[x, 1.22, 0.06]} rotation={[-0.75, 0, x > 0 ? -0.08 : 0.08]}>
            <Part color={NEWTON_COAT} position={[0, -0.3, 0]} scale={[0.23, 0.6, 0.23]} />
            <Part geometry={GEO.sphere} color={SKIN} position={[0, -0.64, 0]} scale={0.14} outline={0.08} />
          </group>
        ))}

        {/* head */}
        <group ref={head} position={[0, 1.3, 0]}>
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
          {/* hair: cap, and a long tail tied with a ribbon */}
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
