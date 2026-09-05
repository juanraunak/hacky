// Straw dummies for the study: something to swing at, shoot, and brace
// against. They use World 3's weapons wholesale — the same reach, the same
// recoil, the same charge meter — by pointing that system at a dummy instead
// of at the boss.

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { GEO, Part } from '../world1/toon';
import { INK } from '../world1/palette';
import { local } from '../world1/local';
import { training } from '../world3/combat';
import { applePos } from '../world3/layout';
import { throwOrb } from '../world3/projectiles';
import { drill } from './briefState';
import { newtonPos } from './StudyNewton';

const STRAW = '#d9a441';
const POST = '#5a3a1e';

const SPOTS: [number, number][] = [
  [-4.2, 1.5],
  [0, 3.2],
  [4.2, 1.5],
];

function Dummy({ x, z, hit }: { x: number; z: number; hit: number }) {
  const group = useRef<Group>(null);
  const seen = useRef(hit);
  const knock = useRef(0);

  useFrame((_s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!group.current) return;
    // React only when the dummy nearest the player is the one being struck.
    const mine = Math.hypot(local.x - x, local.z - z) < 6;
    if (hit !== seen.current) {
      seen.current = hit;
      if (mine) knock.current = 1;
    }
    knock.current = Math.max(0, knock.current - dt * 3.4);
    group.current.rotation.x = -knock.current * 0.55;
    group.current.rotation.z = Math.sin(performance.now() / 260) * 0.03 * knock.current;
  });

  return (
    <group ref={group} position={[x, 0, z]}>
      <Part geometry={GEO.cylinder} color={POST} position={[0, 0.5, 0]} scale={[0.14, 1, 0.14]} outline={0.07} />
      <Part geometry={GEO.box} color={STRAW} position={[0, 1.25, 0]} scale={[0.62, 0.8, 0.42]} outline={0.06} />
      <Part geometry={GEO.box} color={POST} position={[0, 1.45, 0]} scale={[1.3, 0.12, 0.14]} outline={0.07} />
      <Part geometry={GEO.sphereLow} color={STRAW} position={[0, 1.85, 0]} scale={0.3} outline={0.08} />
      <Part geometry={GEO.sphereLow} color={INK} position={[-0.1, 1.88, 0.27]} scale={[0.06, 0.06, 0.02]} outline={0} />
      <Part geometry={GEO.sphereLow} color={INK} position={[0.1, 1.88, 0.27]} scale={[0.06, 0.06, 0.02]} outline={0} />
    </group>
  );
}

export function Dummies() {
  const [hits, setHits] = useState(0);
  const nextShove = useRef(0);
  const spots = useMemo(() => SPOTS, []);

  useFrame(() => {
    training.active = true;

    // Newton is the target and the thrower. World 3's reach ring, gun aim and
    // orb origin all read this one position, so pointing it at him makes the
    // whole system work against him with no special cases.
    applePos.x = newtonPos.x;
    applePos.z = newtonPos.z;
    void spots;

    if (training.hits !== hits) setHits(training.hits);

    // The blocking drill: the middle dummy lobs something slow at you.
    if (drill.shove) {
      const now = performance.now();
      if (now > nextShove.current) {
        nextShove.current = now + 1000;
        throwOrb(1.7, local.x, local.z);
      }
    }
  });

  return (
    <group>
      {spots.map(([x, z]) => (
        <Dummy key={`${x}:${z}`} x={x} z={z} hit={hits} />
      ))}
    </group>
  );
}

export default Dummies;
