// What is in your hands. Sword, gun with a working slide, or a braced shield.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { GEO, Part } from '../world1/toon';
import { INK } from '../world1/palette';
import { readCombat } from './combat';

const STEEL = '#d8dbe6';
const HANDLE = '#5a3a1e';
const GUN_BODY = '#3a4a6e';
const SHIELD = '#3aa0ff';

export function HeldWeapon() {
  const sword = useRef<Group>(null);
  const gun = useRef<Group>(null);
  const slide = useRef<Group>(null);
  const shield = useRef<Group>(null);
  const flash = useRef<Group>(null);
  const dome = useRef<Group>(null);

  useFrame(({ clock }) => {
    const c = readCombat();
    const t = clock.elapsedTime;

    if (sword.current) {
      sword.current.visible = c.weapon === 'sword';
      // Wind up as you charge, then the swing itself is the snap back.
      const since = (performance.now() - c.lastSwingAt) / 260;
      const swing = since < 1 ? Math.sin(since * Math.PI) : 0;
      sword.current.rotation.x = -0.4 - c.swordCharge * 1.5 + swing * 2.6;
      sword.current.rotation.z = c.swordCharge * 0.4;
    }

    if (gun.current) {
      gun.current.visible = c.weapon === 'gun';
      const since = (performance.now() - c.lastShotAt) / 1000;
      // kick, then the slide cycles back: the reload you can see
      const kick = since < 0.12 ? (0.12 - since) * 6 : 0;
      gun.current.rotation.x = -0.15 - kick;
      if (slide.current) slide.current.position.z = since < 0.22 ? -0.9 + since * 3 : 0;
      if (flash.current) flash.current.visible = c.weapon === 'gun' && since < 0.07;
    }

    if (shield.current) {
      shield.current.visible = c.weapon === 'shield';
      // Braced: up and square. Loose: hanging at your side.
      const want = c.bracing ? 0 : -1.1;
      shield.current.rotation.x += (want - shield.current.rotation.x) * 0.2;
      shield.current.position.z = c.bracing ? 1.05 : 0.5;
      shield.current.position.y = c.bracing ? 0.95 : 0.6 + Math.sin(t * 2) * 0.02;
    }

    if (dome.current) {
      // Visible while braced, and it flares on the frame something bounces off.
      const sinceBlock = (performance.now() - c.playerHitAt) / 420;
      const flare = c.bracing && sinceBlock < 1 ? 1 - sinceBlock : 0;
      dome.current.visible = c.bracing;
      const s2 = 1 + flare * 0.5;
      dome.current.scale.setScalar(s2);
    }
  });

  return (
    <group position={[0.3, 0.64, 0.3]} scale={0.85}>
      {/* sword */}
      <group ref={sword} visible={false}>
        <Part geometry={GEO.box} color={HANDLE} position={[0, -0.22, 0]} scale={[0.11, 0.44, 0.11]} outline={0.1} />
        <Part geometry={GEO.sphereLow} color="#ffd93b" position={[0, -0.46, 0]} scale={0.11} outline={0.12} />
        <Part geometry={GEO.box} color="#ffd93b" position={[0, 0.04, 0]} scale={[0.52, 0.1, 0.14]} outline={0.1} />
        <Part geometry={GEO.box} color={STEEL} position={[0, 0.92, 0]} scale={[0.19, 1.7, 0.06]} outline={0.05} />
        <Part geometry={GEO.box} color="#f3f3f3" position={[0, 0.92, 0.035]} scale={[0.06, 1.6, 0.02]} outline={0} />
        <Part geometry={GEO.cone} color={STEEL} position={[0, 1.86, 0]} scale={[0.13, 0.34, 0.05]} outline={0.07} />
      </group>

      {/* gun: small, per the brief */}
      <group ref={gun} visible={false}>
        <Part geometry={GEO.box} color={GUN_BODY} position={[0, 0, 0.22]} scale={[0.15, 0.18, 0.58]} outline={0.07} />
        <group ref={slide}>
          <Part geometry={GEO.box} color={INK} position={[0, 0.09, 0.26]} scale={[0.12, 0.09, 0.46]} outline={0.07} />
        </group>
        <Part geometry={GEO.box} color={HANDLE} position={[0, -0.17, 0.02]} rotation={[0.3, 0, 0]} scale={[0.13, 0.32, 0.14]} outline={0.08} />
        <Part geometry={GEO.cylinder} color={INK} position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]} scale={[0.06, 0.18, 0.06]} outline={0.09} />
      </group>

      {/* muzzle flash */}
      <group ref={flash} visible={false} position={[0, 0, 0.72]}>
        <Part geometry={GEO.cone} color="#ffd93b" rotation={[Math.PI / 2, 0, 0]} scale={[0.2, 0.34, 0.2]} outline={0} />
      </group>

      {/* the brace itself: a dome that flares when it actually stops something */}
      <group ref={dome} visible={false} position={[-0.5, 0.5, 0.9]}>
        <mesh>
          <sphereGeometry args={[1.5, 12, 9]} />
          <meshBasicMaterial color="#3aa0ff" transparent opacity={0.3} />
        </mesh>
      </group>

      {/* shield */}
      <group ref={shield} visible={false} position={[-0.9, 0.6, 0.5]}>
        <Part geometry={GEO.box} color={SHIELD} scale={[1.2, 1.5, 0.12]} outline={0.06} />
        <Part geometry={GEO.box} color={INK} scale={[1.28, 0.2, 0.08]} outline={0} />
        <Part geometry={GEO.sphereLow} color="#fff8e7" position={[0, 0, 0.09]} scale={[0.2, 0.2, 0.06]} outline={0.08} />
      </group>
    </group>
  );
}

export default HeldWeapon;
