// The arena: a wide rock floor inside a cliff ring, a lava plain beyond it,
// volcanoes on the horizon, drifting embers, and the angry apple in the middle.
// Flat toon colour and ink outlines throughout — no gradients, no glow passes.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Group, InstancedMesh } from 'three';
import { GEO, Part, toonMaterial } from '../world1/toon';
import { ARENA_RADIUS, RUBBLE, TERRAIN_RADIUS, groundHeight } from './layout';
import { GiantApple } from './Apple';
import { ShotsView } from './ShotsView';
import { MeleeRing } from './MeleeRing';
import { LawCrates } from './LawCrates';

const FLOOR = '#6b4152';
const FLOOR_DARK = '#5b3a4d';
const CLIFF = '#3d2434';
const CLIFF_LIP = '#2a1826';
const LAVA = '#ff5a1f';
const LAVA_HOT = '#ffb02e';

function Floor() {
  const geometry = useMemo(() => {
    // Rings, not a fan: a CircleGeometry has one vertex ring, so displacement
    // only moves the rim. This gives the ground actual interior detail.
    const g = new THREE.RingGeometry(0.4, TERRAIN_RADIUS, 128, 46);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)) - 0.02);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geometry} material={toonMaterial(FLOOR)} receiveShadow />;
}

/**
 * Molten ground past the walkable ring. Displaced to follow groundHeight and
 * lifted a hair above it: a flat disc here slices straight through the relief
 * and shows up as a bright smear along the horizon.
 */
function lavaRing(inner: number, outer: number, lift: number): THREE.BufferGeometry {
  const g = new THREE.RingGeometry(inner, outer, 128, 12);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)) + lift);
  }
  g.computeVertexNormals();
  return g;
}

function LavaPlain() {
  const outer = useMemo(() => lavaRing(ARENA_RADIUS + 3, ARENA_RADIUS + 34, 0.14), []);
  const hot = useMemo(() => lavaRing(ARENA_RADIUS + 8, ARENA_RADIUS + 19, 0.22), []);
  return (
    <group>
      <mesh geometry={outer}>
        <meshBasicMaterial color={LAVA} polygonOffset polygonOffsetFactor={-2} />
      </mesh>
      <mesh geometry={hot}>
        <meshBasicMaterial color={LAVA_HOT} polygonOffset polygonOffsetFactor={-4} />
      </mesh>
    </group>
  );
}

/** One volcano: dark cone, glowing crater, a plume that keeps puffing. */
function Volcano({ x, z, h, r }: { x: number; z: number; h: number; r: number }) {
  const plume = useRef<Group>(null);
  const seed = useMemo(() => Math.random() * 10, []);
  useFrame(({ clock }) => {
    if (!plume.current) return;
    const t = (clock.elapsedTime * 0.35 + seed) % 1;
    plume.current.position.y = h + t * h * 0.55;
    plume.current.scale.setScalar(0.6 + t * 2.4);
  });
  return (
    <group position={[x, groundHeight(x, z) - 2, z]}>
      {/* wide skirt, steeper cone, then a cut-off crater */}
      <mesh position={[0, h * 0.16, 0]}>
        <coneGeometry args={[r * 1.55, h * 0.34, 9]} />
        <meshToonMaterial color={CLIFF} />
      </mesh>
      <mesh position={[0, h * 0.55, 0]}>
        <cylinderGeometry args={[r * 0.42, r * 1.25, h * 0.72, 9]} />
        <meshToonMaterial color={CLIFF_LIP} />
      </mesh>
      {/* lava spilling down two sides */}
      <mesh position={[r * 0.28, h * 0.55, r * 0.24]} rotation={[0.14, 0.6, 0.1]}>
        <cylinderGeometry args={[r * 0.07, r * 0.16, h * 0.7, 5]} />
        <meshBasicMaterial color={LAVA} />
      </mesh>
      <mesh position={[-r * 0.3, h * 0.5, -r * 0.2]} rotation={[-0.1, -0.4, -0.12]}>
        <cylinderGeometry args={[r * 0.05, r * 0.13, h * 0.62, 5]} />
        <meshBasicMaterial color={LAVA} />
      </mesh>
      {/* glowing crater mouth */}
      <mesh position={[0, h * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[r * 0.4, 9]} />
        <meshBasicMaterial color={LAVA_HOT} polygonOffset polygonOffsetFactor={-3} />
      </mesh>
      <group ref={plume}>
        <mesh>
          <sphereGeometry args={[r * 0.34, 7, 5]} />
          <meshBasicMaterial color={LAVA} />
        </mesh>
      </group>
    </group>
  );
}

/** Dark peaks the whole way round. Cheap, and the horizon is never empty. */
function MountainRing() {
  const peaks = useMemo(
    () =>
      Array.from({ length: TOUCH ? 20 : 34 }, (_, i) => {
        const a = (i / (TOUCH ? 20 : 34)) * Math.PI * 2 + (i % 3) * 0.05;
        const d = 300 + ((i * 37) % 90);
        const h = 70 + ((i * 53) % 70);
        return { x: Math.cos(a) * d, z: Math.sin(a) * d, h, r: 46 + ((i * 29) % 34) };
      }),
    []
  );
  return (
    <group>
      {peaks.map((p, i) => (
        <mesh key={i} position={[p.x, groundHeight(p.x, p.z) - 18 + p.h / 2, p.z]}>
          <coneGeometry args={[p.r, p.h, 6]} />
          <meshToonMaterial color={i % 2 ? CLIFF : CLIFF_LIP} />
        </mesh>
      ))}
    </group>
  );
}

function Volcanoes() {
  const ring = useMemo(
    () =>
      [
        [-1.05, 210, 74, 30],
        [-0.35, 260, 96, 38],
        [0.5, 190, 62, 26],
        [1.25, 300, 110, 44],
        [2.1, 230, 80, 32],
        [2.9, 180, 58, 24],
        [-2.4, 275, 92, 36],
        [-1.75, 165, 52, 22],
      ].map(([a, d, h, r]) => ({
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        h,
        r,
      })),
    []
  );
  return (
    <group>
      {ring.map((v, i) => (
        <Volcano key={i} {...v} />
      ))}
    </group>
  );
}

/** Embers drifting up off the lava. Cheap: one instanced mesh, no physics. */
const TOUCH = typeof window !== 'undefined' && 'ontouchstart' in window;

function Embers({ count = TOUCH ? 40 : 90 }: { count?: number }) {
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        a: Math.random() * Math.PI * 2,
        d: ARENA_RADIUS * (0.25 + Math.random() * 1.4),
        y0: Math.random() * 40,
        speed: 3 + Math.random() * 7,
        s: 0.25 + Math.random() * 0.5,
      })),
    [count]
  );

  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    seeds.forEach((e, i) => {
      const y = ((e.y0 + t * e.speed) % 55) - 8;
      dummy.position.set(
        Math.cos(e.a) * e.d + Math.sin(t * 0.6 + i) * 1.6,
        y,
        Math.sin(e.a) * e.d + Math.cos(t * 0.5 + i) * 1.6
      );
      dummy.scale.setScalar(e.s);
      dummy.rotation.set(t + i, t * 0.7 + i, 0);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={LAVA_HOT} />
    </instancedMesh>
  );
}

function Rubble() {
  return (
    <group>
      {RUBBLE.map((r, i) => (
        <Part
          key={i}
          geometry={GEO.sphereLow}
          color={r.dark ? CLIFF : FLOOR_DARK}
          position={[r.x, groundHeight(r.x, r.z) + r.s[1] * 0.35, r.z]}
          rotation={[0, r.yaw, 0]}
          scale={r.s}
          flat
          receiveShadow
        />
      ))}
    </group>
  );
}

/**
 * The boss. It watches whoever is nearest, breathes, and seethes: the closer
 * you get the harder it shakes and the deeper it scowls.
 */
export function Arena() {
  return (
    <group>
      <LavaPlain />
      <MountainRing />
      <Volcanoes />
      <Embers />
      <Floor />
      <Rubble />
      <GiantApple />
      <ShotsView />
      <MeleeRing />
      <LawCrates />
    </group>
  );
}

export default Arena;
