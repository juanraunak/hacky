// Six leaves shaken loose from the canopy when the apple lets go. They
// scatter, tumble, drift down, and are removed. No fades: leaves are opaque
// paint like everything else.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { GEO, toonMaterial } from './toon';
import { LEAF } from './palette';
import { useWorld, type LeafPuff as Puff } from './store';

const LEAF_COUNT = 6;
const LIFE_S = 1.9;

function Leaves({ puff }: { puff: Puff }) {
  const group = useRef<Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const t = (performance.now() - puff.at) / 1000;
    if (t > LIFE_S) {
      g.visible = false;
      return;
    }
    g.children.forEach((leaf, i) => {
      const a = (i / LEAF_COUNT) * Math.PI * 2 + 0.4;
      const out = 0.9 + (i % 3) * 0.35;
      const r = out * Math.min(1, t * 2.2);
      const x = Math.cos(a) * r + Math.sin(t * 4 + i) * 0.15;
      const z = Math.sin(a) * r + Math.cos(t * 3.5 + i) * 0.15;
      const y = 0.35 * Math.min(1, t * 3) - 1.6 * t * t * 0.55 + Math.sin(t * 6 + i) * 0.05;
      leaf.position.set(x, y, z);
      leaf.rotation.set(t * 5 + i, t * 3, t * 4 + i * 0.5);
    });
  });

  return (
    <group ref={group} position={[puff.x, puff.y, puff.z]}>
      {Array.from({ length: LEAF_COUNT }, (_, i) => (
        <mesh key={i} geometry={GEO.sphereLow} material={toonMaterial(LEAF)} scale={[0.22, 0.05, 0.14]} />
      ))}
    </group>
  );
}

export function LeafPuffs() {
  const puffs = useWorld(s => s.puffs);
  useFrame(() => {
    useWorld.getState().prunePuffs(performance.now());
  });
  return (
    <group>
      {puffs.map(p => (
        <Leaves key={p.id} puff={p} />
      ))}
    </group>
  );
}
