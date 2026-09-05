// Cel shading and ink outlines. Every material in the world is a
// MeshToonMaterial with a three-step gradient (shadow, mid, light) and every
// solid part carries an inverted-hull outline: the same geometry, scaled up,
// drawn back-face in ink. No post-processing anywhere.

import * as THREE from 'three';
import type { ReactNode } from 'react';
import { INK } from './palette';

let gradient: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (!gradient) {
    // Three bands. Values are the light multiplier per band.
    const data = new Uint8Array([72, 165, 255]);
    gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    gradient.minFilter = THREE.NearestFilter;
    gradient.magFilter = THREE.NearestFilter;
    gradient.generateMipmaps = false;
    gradient.needsUpdate = true;
  }
  return gradient;
}

const materials = new Map<string, THREE.MeshToonMaterial>();

export function toonMaterial(color: string): THREE.MeshToonMaterial {
  let mat = materials.get(color);
  if (!mat) {
    mat = new THREE.MeshToonMaterial({ color, gradientMap: toonGradient() });
    materials.set(color, mat);
  }
  return mat;
}

// MeshToonMaterial has no flat-shading switch, so "chunky" parts use a
// non-indexed copy of their geometry whose vertex normals are per-face.
const flatGeometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();

export function flatGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  let flat = flatGeometries.get(geometry);
  if (!flat) {
    flat = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    flat.computeVertexNormals();
    flatGeometries.set(geometry, flat);
  }
  return flat;
}

// Unlit flat colour. Only for surfaces that are meant to read as lit from the
// inside, like a warm window at dusk. Not a glow effect: still flat paint.
const basics = new Map<string, THREE.MeshBasicMaterial>();

export function basicMaterial(color: string): THREE.MeshBasicMaterial {
  let mat = basics.get(color);
  if (!mat) {
    mat = new THREE.MeshBasicMaterial({ color });
    basics.set(color, mat);
  }
  return mat;
}

// A triangular prism, for a pitched roof: profile in the yz plane, extruded
// along x. Non-indexed so the faces stay hard-edged with no shared normals.
export function prismGeometry(halfWidth: number, halfDepth: number, height: number) {
  const w = halfWidth;
  const d = halfDepth;
  const h = height;
  const A: [number, number, number] = [-w, 0, -d];
  const B: [number, number, number] = [-w, 0, d];
  const C: [number, number, number] = [-w, h, 0];
  const D: [number, number, number] = [w, 0, -d];
  const E: [number, number, number] = [w, 0, d];
  const F: [number, number, number] = [w, h, 0];
  const tris = [
    [A, B, C], // left gable
    [D, F, E], // right gable
    [A, F, D], // back slope
    [A, C, F],
    [B, E, F], // front slope
    [B, F, C],
    [A, D, E], // underside
    [A, E, B],
  ];
  const positions = new Float32Array(tris.length * 9);
  let i = 0;
  for (const tri of tris) {
    for (const v of tri) {
      positions[i++] = v[0];
      positions[i++] = v[1];
      positions[i++] = v[2];
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

let outline: THREE.MeshBasicMaterial | null = null;

export function outlineMaterial(): THREE.MeshBasicMaterial {
  if (!outline) {
    outline = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  }
  return outline;
}

// Shared low-poly geometries. Everything is sized with scale, so one of each
// is enough for the whole world.
export const GEO = {
  sphere: new THREE.SphereGeometry(1, 12, 9),
  sphereLow: new THREE.SphereGeometry(1, 8, 6),
  box: new THREE.BoxGeometry(1, 1, 1),
  cone: new THREE.ConeGeometry(1, 1, 6),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  taperedCylinder: new THREE.CylinderGeometry(0.65, 1, 1, 9),
  icosa: new THREE.IcosahedronGeometry(1, 1),
  rock: new THREE.IcosahedronGeometry(1, 0),
  torus: new THREE.TorusGeometry(1, 0.32, 6, 12),
};

export interface PartProps {
  geometry?: THREE.BufferGeometry;
  color: string;
  /** Outline thickness as a fraction of the part's size. 0.05 normal, 0.09 small parts. */
  outline?: number;
  flat?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  children?: ReactNode;
}

export function Part({
  geometry = GEO.box,
  color,
  outline = 0.05,
  flat = false,
  position,
  rotation,
  scale = 1,
  castShadow = true,
  receiveShadow = false,
  children,
}: PartProps) {
  const mat = toonMaterial(color);
  const geo = flat ? flatGeometry(geometry) : geometry;
  const hull = 1 + outline;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} material={mat} castShadow={castShadow} receiveShadow={receiveShadow} />
      {outline > 0 && <mesh geometry={geo} material={outlineMaterial()} scale={hull} />}
      {children}
    </group>
  );
}
