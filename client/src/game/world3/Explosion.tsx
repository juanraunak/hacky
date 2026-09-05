// What is left of the apple. Chunks fly out on a ballistic arc, tumble, and
// settle; a white flash and an expanding ring sell the moment it goes.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { InstancedMesh, Mesh } from 'three';
import { groundHeight } from './layout';

const CHUNKS = 44;
const RED = '#ff4d4d';

export function Explosion({ at, origin }: { at: React.RefObject<number>; origin: React.RefObject<THREE.Vector3> }) {
  const chunks = useRef<InstancedMesh>(null);
  const flash = useRef<Mesh>(null);
  const ring = useRef<Mesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: CHUNKS }, () => {
        const a = Math.random() * Math.PI * 2;
        const up = 0.4 + Math.random() * 1.1;
        const out = 8 + Math.random() * 22;
        return {
          vx: Math.cos(a) * out,
          vz: Math.sin(a) * out,
          vy: 14 + up * 16,
          spin: (Math.random() - 0.5) * 9,
          size: 0.6 + Math.random() * 2.1,
        };
      }),
    []
  );

  useFrame(() => {
    const started = at.current;
    const mesh = chunks.current;
    if (!mesh || !started) return;
    const t = (performance.now() - started) / 1000;
    const o = origin.current ?? new THREE.Vector3();

    // white flash
    if (flash.current) {
      const f = Math.max(0, 1 - t * 4);
      flash.current.visible = f > 0.01;
      flash.current.scale.setScalar(12 + t * 40);
      (flash.current.material as THREE.MeshBasicMaterial).opacity = f;
    }
    // shockwave on the floor
    if (ring.current) {
      const r = Math.max(0, 1 - t / 1.4);
      ring.current.visible = r > 0.01;
      const s = 1 + t * 26;
      ring.current.scale.set(s, s, s);
      ring.current.position.set(o.x, groundHeight(o.x, o.z) + 0.3, o.z);
      (ring.current.material as THREE.MeshBasicMaterial).opacity = r;
    }

    mesh.visible = true;
    seeds.forEach((c, i) => {
      const y = o.y + c.vy * t - 15 * t * t;
      const floor = groundHeight(o.x + c.vx * t, o.z + c.vz * t) + c.size * 0.5;
      dummy.position.set(o.x + c.vx * t, Math.max(floor, y), o.z + c.vz * t);
      dummy.rotation.set(t * c.spin, t * c.spin * 0.7, t * c.spin * 0.4);
      dummy.scale.setScalar(c.size * Math.max(0.15, 1 - t * 0.22));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <instancedMesh ref={chunks} args={[undefined, undefined, CHUNKS]} visible={false} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshToonMaterial color={RED} />
      </instancedMesh>
      <mesh ref={flash} visible={false}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#fff8e7" transparent opacity={1} />
      </mesh>
      <mesh ref={ring} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.4, 2.1, 44]} />
        <meshBasicMaterial color="#ffd93b" transparent opacity={1} />
      </mesh>
    </group>
  );
}

export default Explosion;
