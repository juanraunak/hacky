// The place: rolling ground, swaying grass, the tree, the boundary wall,
// rocks and bushes, and the far side you can see but not reach.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, outlineMaterial, Part, toonMaterial } from './toon';
import {
  BUSH,
  CANOPY,
  GRASS,
  GRASS_BLADE,
  HILL,
  ROOT,
  STONE,
  STONE_DARK,
  TRUNK,
} from './palette';
import {
  BUSHES,
  FAR_WALL_Z,
  MEADOW_HALF,
  NEAR_WALL_Z,
  NEWTON,
  ROCKS,
  SIDE_WALL_X,
  TREE,
  TRUNK_RADIUS,
  WALL_DEPTH,
  groundHeight,
} from './layout';

const GRASS_COUNT = 2600;

// Small deterministic RNG so the meadow is the same on every phone.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function Ground() {
  const geometry = useMemo(() => {
    const size = MEADOW_HALF * 2;
    const g = new THREE.PlaneGeometry(size, size, 72, 72);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, groundHeight(pos.getX(i), pos.getZ(i)));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return <mesh geometry={geometry} material={toonMaterial(GRASS)} receiveShadow />;
}

function Grass() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(0.16, 0.75, 1, 2);
    geometry.translate(0, 0.375, 0);
    const material = new THREE.MeshToonMaterial({
      color: GRASS_BLADE,
      gradientMap: toonMaterial(GRASS).gradientMap,
      side: THREE.DoubleSide,
    });
    material.onBeforeCompile = shader => {
      shader.uniforms.uTime = uniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `vec3 transformed = vec3(position);
#ifdef USE_INSTANCING
  float phase = instanceMatrix[3].x * 0.35 + instanceMatrix[3].z * 0.5;
  float sway = sin(uTime * 1.7 + phase) * 0.14 * uv.y;
  transformed.x += sway;
  transformed.z += sway * 0.4;
#endif`
        );
    };
    return { geometry, material };
  }, [uniforms]);

  useEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const random = rng(1337);
    const dummy = new THREE.Object3D();
    let placed = 0;
    let guard = 0;
    while (placed < GRASS_COUNT && guard++ < GRASS_COUNT * 4) {
      const x = (random() * 2 - 1) * (MEADOW_HALF - 1);
      const z = (random() * 2 - 1) * (MEADOW_HALF - 1);
      if (Math.hypot(x - TREE.x, z - TREE.z) < TRUNK_RADIUS + 0.8) continue;
      if (Math.hypot(x - NEWTON.x, z - NEWTON.z) < 2.2) continue;
      if (Math.abs(z - FAR_WALL_Z) < 1.0) continue;
      if (ROCKS.some(r => Math.hypot(x - r.x, z - r.z) < r.r)) continue;
      dummy.position.set(x, groundHeight(x, z) - 0.02, z);
      dummy.rotation.set(0, random() * Math.PI, 0);
      dummy.scale.set(1, 0.7 + random() * 0.7, 1);
      dummy.updateMatrix();
      m.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    m.count = placed;
    m.instanceMatrix.needsUpdate = true;
    m.frustumCulled = false;
  }, []);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, GRASS_COUNT]} />;
}

function Tree() {
  const y = groundHeight(TREE.x, TREE.z);
  const blobs: [number, number, number, number, string][] = [
    [0, 10.2, 0, 5.2, CANOPY[0]],
    [3.8, 9.0, 1.4, 4.2, CANOPY[1]],
    [-3.9, 9.3, -0.9, 4.4, CANOPY[2]],
    [0.9, 8.7, -3.7, 3.9, CANOPY[3]],
    [-0.6, 9.2, 3.2, 3.6, CANOPY[4]],
    [1.6, 12.9, 0.6, 3.5, CANOPY[1]],
  ];
  const roots = [0, 1.2, 2.5, 3.7, 4.9];
  return (
    <group position={[TREE.x, y, TREE.z]}>
      <Part
        geometry={GEO.taperedCylinder}
        color={TRUNK}
        flat
        position={[0, 3.6, 0]}
        scale={[TRUNK_RADIUS, 7.4, TRUNK_RADIUS]}
        outline={0.035}
      />
      {roots.map(a => (
        <Part
          key={a}
          geometry={GEO.cone}
          color={ROOT}
          flat
          position={[Math.sin(a) * (TRUNK_RADIUS + 0.6), 0.3, Math.cos(a) * (TRUNK_RADIUS + 0.6)]}
          rotation={[Math.cos(a) * 1.15, 0, -Math.sin(a) * 1.15]}
          scale={[0.7, 1.9, 0.7]}
          outline={0.06}
        />
      ))}
      {/* three thick branches reaching into the canopy */}
      <Part
        geometry={GEO.cylinder}
        color={TRUNK}
        flat
        position={[1.9, 7.4, 0.7]}
        rotation={[0.2, 0, -0.75]}
        scale={[0.55, 3.6, 0.55]}
        outline={0.06}
      />
      <Part
        geometry={GEO.cylinder}
        color={TRUNK}
        flat
        position={[-1.9, 7.6, -0.4]}
        rotation={[-0.15, 0, 0.8]}
        scale={[0.5, 3.6, 0.5]}
        outline={0.06}
      />
      <Part
        geometry={GEO.cylinder}
        color={TRUNK}
        flat
        position={[0.2, 8.0, -1.8]}
        rotation={[0.85, 0, 0.05]}
        scale={[0.45, 3.2, 0.45]}
        outline={0.06}
      />
      {blobs.map(([x, by, z, s, c], i) => (
        <Part
          key={i}
          geometry={GEO.icosa}
          color={c}
          flat
          position={[x, by, z]}
          rotation={[i * 0.7, i * 1.3, 0]}
          scale={s}
          outline={0.045}
        />
      ))}
    </group>
  );
}

interface Stone {
  x: number;
  z: number;
  yaw: number;
  h: number;
}

function wallStones(): Stone[] {
  const random = rng(4242);
  const stones: Stone[] = [];
  const step = 2.45;
  const along = (
    from: [number, number],
    to: [number, number],
    yaw: number
  ) => {
    const len = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const n = Math.ceil(len / step);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      stones.push({
        x: from[0] + (to[0] - from[0]) * u,
        z: from[1] + (to[1] - from[1]) * u,
        yaw: yaw + (random() - 0.5) * 0.12,
        h: 1.2 + random() * 0.45,
      });
    }
  };
  along([-MEADOW_HALF, FAR_WALL_Z], [MEADOW_HALF, FAR_WALL_Z], 0);
  along([-SIDE_WALL_X, FAR_WALL_Z], [-SIDE_WALL_X, NEAR_WALL_Z], Math.PI / 2);
  along([SIDE_WALL_X, FAR_WALL_Z], [SIDE_WALL_X, NEAR_WALL_Z], Math.PI / 2);
  along([-SIDE_WALL_X, NEAR_WALL_Z], [SIDE_WALL_X, NEAR_WALL_Z], 0);
  return stones;
}

function Wall() {
  const stones = useMemo(wallStones, []);
  const body = useRef<THREE.InstancedMesh>(null);
  const ink = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const b = body.current;
    const k = ink.current;
    if (!b || !k) return;
    const dummy = new THREE.Object3D();
    stones.forEach((s, i) => {
      const y = groundHeight(s.x, s.z) + s.h / 2 - 0.15;
      dummy.position.set(s.x, y, s.z);
      dummy.rotation.set(0, s.yaw, 0);
      dummy.scale.set(2.6, s.h, WALL_DEPTH);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.scale.multiplyScalar(1.05);
      dummy.updateMatrix();
      k.setMatrixAt(i, dummy.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    k.instanceMatrix.needsUpdate = true;
  }, [stones]);

  return (
    <group>
      <instancedMesh
        ref={body}
        args={[GEO.box, toonMaterial(STONE), stones.length]}
        castShadow
        receiveShadow
      />
      <instancedMesh ref={ink} args={[GEO.box, outlineMaterial(), stones.length]} />
    </group>
  );
}

function Rocks() {
  return (
    <group>
      {ROCKS.map((r, i) => (
        <Part
          key={i}
          geometry={GEO.rock}
          color={r.dark ? STONE_DARK : STONE}
          flat
          position={[r.x, groundHeight(r.x, r.z) - 0.25, r.z]}
          rotation={[0, r.yaw, 0]}
          scale={r.s}
          outline={0.05}
        />
      ))}
    </group>
  );
}

function Bushes() {
  return (
    <group>
      {BUSHES.map((b, i) => {
        const y = groundHeight(b.x, b.z);
        return (
          <group key={i} position={[b.x, y, b.z]} rotation={[0, b.yaw, 0]}>
            <Part geometry={GEO.icosa} color={BUSH} flat position={[0, 0.7, 0]} scale={b.r * 0.75} />
            <Part
              geometry={GEO.icosa}
              color={BUSH}
              flat
              position={[b.r * 0.5, 0.5, b.r * 0.2]}
              scale={b.r * 0.55}
            />
            <Part
              geometry={GEO.icosa}
              color={BUSH}
              flat
              position={[-b.r * 0.45, 0.55, -b.r * 0.25]}
              scale={b.r * 0.6}
            />
          </group>
        );
      })}
    </group>
  );
}

// Beyond the wall: hills and a few small trees. Visible from the meadow,
// never reachable.
function FarSide() {
  const hills: [number, number, number][] = [
    [-34, -54, 22],
    [8, -58, 26],
    [44, -52, 20],
  ];
  const trees: [number, number, number][] = [
    [-22, -44, 0.55],
    [16, -47, 0.6],
    [36, -42, 0.45],
    [-48, -40, 0.5],
  ];
  return (
    <group>
      {hills.map(([x, z, s], i) => (
        <Part
          key={`h${i}`}
          geometry={GEO.icosa}
          color={HILL}
          flat
          position={[x, -s * 0.55, z]}
          scale={[s, s * 0.5, s * 0.8]}
          outline={0.02}
          castShadow={false}
          receiveShadow
        />
      ))}
      {trees.map(([x, z, s], i) => (
        <group key={`t${i}`} position={[x, groundHeight(x, z), z]} scale={s}>
          <Part
            geometry={GEO.taperedCylinder}
            color={TRUNK}
            flat
            position={[0, 3, 0]}
            scale={[1.3, 6, 1.3]}
            outline={0.05}
          />
          <Part geometry={GEO.icosa} color={CANOPY[2]} flat position={[0, 7.5, 0]} scale={3.8} />
          <Part
            geometry={GEO.icosa}
            color={CANOPY[0]}
            flat
            position={[2.2, 6.4, 0.8]}
            scale={2.8}
          />
        </group>
      ))}
    </group>
  );
}

export function Meadow() {
  return (
    <group>
      <Ground />
      <Grass />
      <Tree />
      <Wall />
      <Rocks />
      <Bushes />
      <FarSide />
    </group>
  );
}
