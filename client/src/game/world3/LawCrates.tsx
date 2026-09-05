// The law crates: a floating icon over a plinth, with the law written on the
// floor beneath it. They spin, they bob, and they vanish when collected.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { GEO, Part } from '../world1/toon';
import { INK } from '../world1/palette';
import { collectNearby, PICKUPS, pickupY } from './pickups';
import { grantWeapon, readCombat } from './combat';
import { LAWS } from './weapons';

const LOOK: Record<string, { colour: string }> = {
  shield: { colour: '#3aa0ff' },
  sword: { colour: '#d8dbe6' },
  gun: { colour: '#3a4a6e' },
};

export function LawCrates() {
  const group = useRef<Group>(null);

  useFrame(({ clock }) => {
    const got = collectNearby();
    if (got) grantWeapon(got);
    const t = clock.elapsedTime;
    if (!group.current) return;
    group.current.children.forEach((child, i) => {
      const p = PICKUPS[i];
      if (!p) return;
      child.visible = !p.taken && !readCombat().owned.includes(p.id);
      child.rotation.y = t * 1.1 + i;
      child.position.y = pickupY(p) + Math.sin(t * 2 + i) * 0.28;
    });
  });

  const owned = readCombat().owned;

  return (
    <group ref={group}>
      {PICKUPS.map(p => {
        const law = LAWS.find(l => l.id === p.id);
        return (
          <group key={p.id} position={[p.x, pickupY(p), p.z]}>
            <Part geometry={GEO.box} color={LOOK[p.id].colour} scale={[1.5, 1.5, 1.5]} outline={0.07} />
            <Part geometry={GEO.box} color={INK} position={[0, -1.6, 0]} scale={[2.4, 0.4, 2.4]} outline={0.05} />
            <Html position={[0, 2.2, 0]} center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
              <div className="pickup-tag">
                <b>{law?.law}</b>
                <span>{law?.short}</span>
              </div>
            </Html>
          </group>
        );
      })}
      {owned.length === 0 && null}
    </group>
  );
}

export default LawCrates;
