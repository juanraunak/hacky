// The place: rolling ground, swaying grass, the tree, the dirt path to the
// cottage, the boundary wall, rocks and bushes, and a ring of low hills that
// closes the horizon without ever being reachable.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, outlineMaterial, Part, toonMaterial } from './toon';
import {
  BUSH,
  CANOPY,
  DIRT,
  GRASS,
  GRASS_BLADE,
  HILL,
  HILL_DARK,
  INK,
  ROOT,
  STONE,
  STONE_DARK,
  TRUNK,
} from './palette';
import {
  BUSHES,
  DETAIL_HALF,
  DIRT_PATH,
  FAR_WALL_Z,
  GROUND_HALF,
  HILLS,
  MEADOW_HALF,
  NEAR_WALL_Z,
  NEWTON,
  ROCKS,
  SIDE_WALL_X,
  TREE,
  TRUNK_RADIUS,
  WALL_DEPTH,
  groundHeight,
  hillBase,
  hillSurface,
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
    const size = DETAIL_HALF * 2;
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

// Four flat quads framing the detailed plane, so the hills stand on ground.
// The heightmap is zero at the seam, so the join is exact.
function Skirt() {
  const geometry = useMemo(() => {
    const a = DETAIL_HALF;
    const b = GROUND_HALF;
    const quads: [number, number, number, number][] = [
      [-b, a, b, b], // beyond +z
      [-b, -b, b, -a], // beyond -z
      [a, -a, b, a], // beyond +x
      [-b, -a, -a, a], // beyond -x
    ];
    const positions: number[] = [];
    for (const [x0, z0, x1, z1] of quads) {
      // Two triangles per quad, wound so the normal points up.
      positions.push(x0, 0, z0, x0, 0, z1, x1, 0, z1);
      positions.push(x0, 0, z0, x1, 0, z1, x1, 0, z0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
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
      if (nearPath(x, z, 1.6)) continue;
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

// --- the dirt path ------------------------------------------------------

function resample(points: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [ax, az] = points[i - 1];
    const [bx, bz] = points[i];
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(d / step));
    for (let k = 1; k <= n; k++) {
      out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
  }
  return out;
}

const PATH_SAMPLES = resample(DIRT_PATH, 1.2);

function nearPath(x: number, z: number, radius: number): boolean {
  for (const [px, pz] of PATH_SAMPLES) {
    if (Math.abs(px - x) < radius && Math.abs(pz - z) < radius) return true;
  }
  return false;
}

function ribbon(width: number, lift: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const n = PATH_SAMPLES.length;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const prev = PATH_SAMPLES[Math.max(0, i - 1)];
    const next = PATH_SAMPLES[Math.min(n - 1, i + 1)];
    let tx = next[0] - prev[0];
    let tz = next[1] - prev[1];
    const len = Math.hypot(tx, tz) || 1;
    tx /= len;
    tz /= len;
    const [px, pz] = PATH_SAMPLES[i];
    // Slight taper at both ends so the path fades into the grass.
    const endFade = Math.min(1, Math.min(i, n - 1 - i) / 3 + 0.45);
    const w = (width / 2) * endFade;
    left.push([px + tz * w, pz - tx * w]);
    right.push([px - tz * w, pz + tx * w]);
  }
  for (let i = 0; i < n - 1; i++) {
    const a = left[i];
    const b = right[i];
    const c = left[i + 1];
    const d = right[i + 1];
    const y = (p: [number, number]) => groundHeight(p[0], p[1]) + lift;
    positions.push(a[0], y(a), a[1], b[0], y(b), b[1], d[0], y(d), d[1]);
    positions.push(a[0], y(a), a[1], d[0], y(d), d[1], c[0], y(c), c[1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.computeVertexNormals();
  return g;
}

function DirtPath() {
  const edge = useMemo(() => ribbon(2.3, 0.06), []);
  const fill = useMemo(() => ribbon(1.9, 0.1), []);
  const inkMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: INK }), []);
  return (
    <group>
      <mesh geometry={edge} material={inkMaterial} />
      <mesh geometry={fill} material={toonMaterial(DIRT)} receiveShadow />
    </group>
  );
}

// --- the hills ----------------------------------------------------------

function Hills() {
  const body = useRef<THREE.InstancedMesh>(null);
  const ink = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const b = body.current;
    const k = ink.current;
    if (!b || !k) return;
    const dummy = new THREE.Object3D();
    HILLS.forEach((hill, i) => {
      dummy.position.set(hill.x, hillBase(hill), hill.z);
      dummy.rotation.set(0, hill.yaw, 0);
      dummy.scale.set(hill.rx, hill.ry, hill.rz);
      dummy.updateMatrix();
      b.setMatrixAt(i, dummy.matrix);
      dummy.scale.multiplyScalar(1.015);
      dummy.updateMatrix();
      k.setMatrixAt(i, dummy.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    k.instanceMatrix.needsUpdate = true;
    b.frustumCulled = false;
    k.frustumCulled = false;
  }, []);

  return (
    <group>
      <instancedMesh ref={body} args={[GEO.icosa, toonMaterial(HILL), HILLS.length]} receiveShadow />
      <instancedMesh ref={ink} args={[GEO.icosa, outlineMaterial(), HILLS.length]} />
    </group>
  );
}

interface Placed {
  x: number;
  y: number;
  z: number;
  s: number;
  yaw: number;
}

// Chunky rocks and bushes scattered over the hills, instanced so the whole
// horizon costs four draw calls.
function hillDecor(): { rocks: Placed[]; bushes: Placed[] } {
  const random = rng(90210);
  const rocks: Placed[] = [];
  const bushes: Placed[] = [];
  for (const hill of HILLS) {
    const count = 2 + Math.floor(random() * 2);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2;
      const r = 0.3 + random() * 0.45;
      const x = hill.x + Math.cos(a) * hill.rx * r;
      const z = hill.z + Math.sin(a) * hill.rz * r;
      const y = hillSurface(hill, x, z);
      if (y === null) continue;
      const spot: Placed = {
        x,
        y: y - 0.6,
        z,
        s: 1.6 + random() * 2.4,
        yaw: random() * Math.PI,
      };
      if (random() < 0.55) rocks.push(spot);
      else bushes.push(spot);
    }
  }
  return { rocks, bushes };
}

function HillDecor() {
  const { rocks, bushes } = useMemo(hillDecor, []);
  const rockMesh = useRef<THREE.InstancedMesh>(null);
  const rockInk = useRef<THREE.InstancedMesh>(null);
  const bushMesh = useRef<THREE.InstancedMesh>(null);
  const bushInk = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    const fill = (
      list: Placed[],
      mesh: THREE.InstancedMesh | null,
      outline: THREE.InstancedMesh | null,
      squash: number
    ) => {
      if (!mesh || !outline) return;
      list.forEach((p, i) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.yaw, 0);
        dummy.scale.set(p.s, p.s * squash, p.s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        dummy.scale.multiplyScalar(1.05);
        dummy.updateMatrix();
        outline.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      outline.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      outline.frustumCulled = false;
    };
    fill(rocks, rockMesh.current, rockInk.current, 0.8);
    fill(bushes, bushMesh.current, bushInk.current, 0.9);
  }, [rocks, bushes]);

  return (
    <group>
      <instancedMesh ref={rockMesh} args={[GEO.rock, toonMaterial(STONE_DARK), rocks.length]} />
      <instancedMesh ref={rockInk} args={[GEO.rock, outlineMaterial(), rocks.length]} />
      <instancedMesh ref={bushMesh} args={[GEO.rock, toonMaterial(HILL_DARK), bushes.length]} />
      <instancedMesh ref={bushInk} args={[GEO.rock, outlineMaterial(), bushes.length]} />
    </group>
  );
}

// --- the tree, the wall, and the close scenery --------------------------

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
  const along = (from: [number, number], to: [number, number], yaw: number) => {
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

// A few trees beyond the far wall. Visible from the meadow, never reachable.
function FarTrees() {
  const trees: [number, number, number][] = [
    [-22, -44, 0.55],
    [16, -47, 0.6],
    [36, -42, 0.45],
    [-48, -40, 0.5],
  ];
  return (
    <group>
      {trees.map(([x, z, s], i) => (
        <group key={i} position={[x, groundHeight(x, z), z]} scale={s}>
          <Part
            geometry={GEO.taperedCylinder}
            color={TRUNK}
            flat
            position={[0, 3, 0]}
            scale={[1.3, 6, 1.3]}
            outline={0.05}
          />
          <Part geometry={GEO.icosa} color={CANOPY[2]} flat position={[0, 7.5, 0]} scale={3.8} />
          <Part geometry={GEO.icosa} color={CANOPY[0]} flat position={[2.2, 6.4, 0.8]} scale={2.8} />
        </group>
      ))}
    </group>
  );
}

export function Meadow() {
  return (
    <group>
      <Ground />
      <Skirt />
      <Grass />
      <DirtPath />
      <Tree />
      <Wall />
      <Rocks />
      <Bushes />
      <Hills />
      <HillDecor />
      <FarTrees />
    </group>
  );
}
