// Two pieces of melee legibility: a ring on the floor showing where the sword
// can actually reach, and the arc it leaves when you swing.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Mesh } from 'three';
import { SWORD_REACH, readCombat } from './combat';
import { applePos, groundHeight } from './layout';
import { local } from '../world1/local';

export function MeleeRing() {
  const ring = useRef<Mesh>(null);
  const arc = useRef<Mesh>(null);

  useFrame(() => {
    const c = readCombat();
    const inRange = Math.hypot(local.x - applePos.x, local.z - applePos.z) < SWORD_REACH;

    if (ring.current) {
      const show = c.weapon === 'sword' && !c.down && c.landed;
      ring.current.visible = show;
      if (show) {
        ring.current.position.set(applePos.x, groundHeight(applePos.x, applePos.z) + 0.16, applePos.z);
        const m = ring.current.material as THREE.MeshBasicMaterial;
        // Solid when you can hit, faint when you cannot.
        m.color.set(inRange ? '#ffd93b' : '#8a8a9a');
        m.opacity = inRange ? 0.75 : 0.25;
      }
    }

    if (arc.current) {
      const since = (performance.now() - c.lastSwingAt) / 320;
      const on = since < 1 && c.weapon === 'sword';
      arc.current.visible = on;
      if (on) {
        const gy = groundHeight(local.x, local.z) + local.y + 1.0;
        arc.current.position.set(local.x, gy, local.z);
        arc.current.rotation.set(-Math.PI / 2, 0, local.heading + since * 2.4 - 1.2);
        const s = 1 + since * 0.5;
        arc.current.scale.set(s, s, s);
        (arc.current.material as THREE.MeshBasicMaterial).opacity = 1 - since;
      }
    }
  });

  return (
    <group>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[SWORD_REACH - 0.7, SWORD_REACH, 64]} />
        <meshBasicMaterial color="#ffd93b" transparent opacity={0.7} />
      </mesh>
      <mesh ref={arc} visible={false}>
        <ringGeometry args={[1.5, 3.1, 24, 1, 0, Math.PI * 0.9]} />
        <meshBasicMaterial color="#fff8e7" transparent opacity={1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

export default MeleeRing;
