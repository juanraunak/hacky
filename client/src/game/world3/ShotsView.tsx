// Bullets and boss orbs, drawn from two instanced meshes.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMesh } from 'three';
import { bossHits, readCombat } from './combat';
import { applePos } from './layout';
import { shots, stepShots } from './projectiles';

const MAX = 90;

export function ShotsView() {
  const friendly = useRef<InstancedMesh>(null);
  const hostile = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const struck = stepShots(dt);
    if (struck) {
      const c = readCombat();
      const dx = 0;
      const dz = 0;
      void dx;
      void dz;
      // An orb only lands if you are not braced. First law, enforced.
      bossHits(18 + 4 * (c.players - 1), (Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26);
    }

    let f = 0;
    let h = 0;
    for (const s of shots) {
      dummy.position.set(s.x, s.y, s.z);
      dummy.rotation.set(0, Math.atan2(s.vx, s.vz), 0);
      if (s.hostile) {
        dummy.scale.setScalar(2.1 + Math.sin(performance.now() / 90) * 0.22);
        dummy.updateMatrix();
        if (hostile.current && h < MAX) hostile.current.setMatrixAt(h++, dummy.matrix);
      } else {
        dummy.scale.set(0.55, 0.55, 3.4);
        dummy.updateMatrix();
        if (friendly.current && f < MAX) friendly.current.setMatrixAt(f++, dummy.matrix);
      }
    }
    if (friendly.current) {
      friendly.current.count = f;
      friendly.current.instanceMatrix.needsUpdate = true;
    }
    if (hostile.current) {
      hostile.current.count = h;
      hostile.current.instanceMatrix.needsUpdate = true;
    }
    void applePos;
  });

  return (
    <group>
      <instancedMesh ref={friendly} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffd93b" />
      </instancedMesh>
      <instancedMesh ref={hostile} args={[undefined, undefined, MAX]} frustumCulled={false}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#ff8c3a" />
      </instancedMesh>
    </group>
  );
}

export default ShotsView;
