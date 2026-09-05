// Newton's cottage: a small stone house thirty units from the tree, door
// facing back down the path. The door opens for him at the end of the story
// and the windows warm up once he is inside. Everything keys off the same
// world_event as his walk, so late joiners find him already home.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part, prismGeometry } from './toon';
import {
  COTTAGE_DARK,
  COTTAGE_DOOR_WOOD,
  COTTAGE_ROOF,
  COTTAGE_STONE,
  COTTAGE_WALL,
  WINDOW_BRIGHT,
  WINDOW_WARM,
} from './palette';
import {
  COTTAGE,
  COTTAGE_DEPTH,
  COTTAGE_HEIGHT,
  COTTAGE_WIDTH,
  COTTAGE_YAW,
  DOOR_CLOSE_MS,
  DOOR_OPEN_MS,
  ENDING_TOTAL_MS,
  WINDOWS_BRIGHT_MS,
  groundHeight,
} from './layout';
import { NEWTON_LEAVES, useWorld } from './store';

const DOOR_W = 1.3;
const DOOR_H = 2.3;
const DOOR_OPEN_ANGLE = 1.95;
const DOOR_SWING_MS = 700;
const BRIGHTEN_MS = 1200;
const FRONT = COTTAGE_DEPTH / 2;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function easeInOut(u: number) {
  return u * u * (3 - 2 * u);
}

function Window({ x, material }: { x: number; material: THREE.Material }) {
  return (
    <group position={[x, 1.9, 0]}>
      <Part
        color={COTTAGE_STONE}
        position={[0, 0, FRONT - 0.06]}
        scale={[1.38, 1.38, 0.18]}
        outline={0.06}
      />
      <mesh geometry={GEO.box} material={material} position={[0, 0, FRONT + 0.05]} scale={[1.04, 1.04, 0.06]} />
      <Part
        color={COTTAGE_DOOR_WOOD}
        position={[0, 0, FRONT + 0.09]}
        scale={[1.06, 0.1, 0.05]}
        outline={0.12}
        castShadow={false}
      />
      <Part
        color={COTTAGE_DOOR_WOOD}
        position={[0, 0, FRONT + 0.09]}
        scale={[0.1, 1.06, 0.05]}
        outline={0.12}
        castShadow={false}
      />
    </group>
  );
}

export function Cottage() {
  const door = useRef<THREE.Group>(null);
  const roof = useMemo(() => prismGeometry(3.9, 3.45, 2.0), []);

  // Its own material instance: the panes brighten, and nothing else in the
  // world should brighten with them.
  const paneMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(WINDOW_WARM) }),
    []
  );
  const warm = useMemo(() => new THREE.Color(WINDOW_WARM), []);
  const bright = useMemo(() => new THREE.Color(WINDOW_BRIGHT), []);
  const insideDark = useMemo(() => new THREE.MeshBasicMaterial({ color: COTTAGE_DARK }), []);

  useFrame(() => {
    const event = useWorld.getState().events[NEWTON_LEAVES];
    let angle = 0;
    let lit = 0;

    if (event) {
      const home = Date.now() - event.firedAt > ENDING_TOTAL_MS;
      if (home) {
        lit = 1;
      } else {
        const t = performance.now() - event.receivedAt;
        const opening = easeInOut(clamp01((t - DOOR_OPEN_MS) / DOOR_SWING_MS));
        const closing = easeInOut(clamp01((t - DOOR_CLOSE_MS) / DOOR_SWING_MS));
        angle = DOOR_OPEN_ANGLE * (opening - closing);
        lit = clamp01((t - WINDOWS_BRIGHT_MS) / BRIGHTEN_MS);
      }
    }

    if (door.current) door.current.rotation.y = -angle;
    paneMaterial.color.lerpColors(warm, bright, lit);
  });

  const y = groundHeight(COTTAGE.x, COTTAGE.z);

  return (
    <group position={[COTTAGE.x, y, COTTAGE.z]} rotation={[0, COTTAGE_YAW, 0]}>
      {/* stone base course, then the walls */}
      <Part
        color={COTTAGE_STONE}
        position={[0, 0.26, 0]}
        scale={[COTTAGE_WIDTH + 0.35, 0.52, COTTAGE_DEPTH + 0.35]}
        outline={0.025}
        receiveShadow
      />
      <Part
        color={COTTAGE_WALL}
        position={[0, COTTAGE_HEIGHT / 2 + 0.35, 0]}
        scale={[COTTAGE_WIDTH, COTTAGE_HEIGHT, COTTAGE_DEPTH]}
        outline={0.022}
        receiveShadow
      />

      {/* pitched roof and chimney */}
      <Part
        geometry={roof}
        color={COTTAGE_ROOF}
        position={[0, COTTAGE_HEIGHT + 0.35, 0]}
        scale={1}
        outline={0.022}
      />
      <Part
        color={COTTAGE_STONE}
        position={[2.3, 4.85, -1.0]}
        scale={[0.9, 2.7, 0.9]}
        outline={0.05}
      />
      <Part
        color={COTTAGE_ROOF}
        position={[2.3, 6.28, -1.0]}
        scale={[1.15, 0.3, 1.15]}
        outline={0.08}
      />

      {/* the dark of the doorway, so an open door shows an inside */}
      <mesh
        geometry={GEO.box}
        material={insideDark}
        position={[0, DOOR_H / 2 + 0.05, FRONT - 0.14]}
        scale={[DOOR_W, DOOR_H, 0.12]}
      />
      <Part
        color={COTTAGE_STONE}
        position={[0, DOOR_H + 0.22, FRONT + 0.02]}
        scale={[1.95, 0.32, 0.34]}
        outline={0.07}
      />
      <Part
        color={COTTAGE_STONE}
        position={[0, 0.09, FRONT + 0.62]}
        scale={[2.1, 0.22, 1.0]}
        outline={0.05}
        receiveShadow
      />

      {/* the door itself, hinged on its left edge, swinging outward */}
      <group ref={door} position={[-DOOR_W / 2, 0, FRONT - 0.02]}>
        <Part
          color={COTTAGE_DOOR_WOOD}
          position={[DOOR_W / 2, DOOR_H / 2 + 0.05, 0]}
          scale={[DOOR_W, DOOR_H, 0.14]}
          outline={0.05}
        />
        <Part
          color={COTTAGE_STONE}
          position={[DOOR_W - 0.22, DOOR_H / 2 + 0.05, 0.1]}
          scale={[0.12, 0.12, 0.12]}
          outline={0.2}
          castShadow={false}
        />
      </group>

      <Window x={-2.15} material={paneMaterial} />
      <Window x={2.15} material={paneMaterial} />
    </group>
  );
}
