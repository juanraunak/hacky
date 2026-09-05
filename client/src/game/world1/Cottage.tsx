// Newton's house: two storeys of old dark timber, thirty units from the tree,
// door facing back down the path. Leaning chimney, jettied upper floor, a
// porch over a door tall enough to walk through. The only warm thing about it
// is the light in the windows.
//
// The door opens for him at the end of the story and the windows brighten
// once he is inside. It all keys off the same world_event as his walk, so a
// late joiner finds him already home.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part, prismGeometry } from './toon';
import {
  COTTAGE_BEAM,
  COTTAGE_DARK,
  COTTAGE_DOOR_WOOD,
  COTTAGE_ROOF,
  COTTAGE_STONE,
  COTTAGE_UPPER,
  COTTAGE_WALL,
  WINDOW_BRIGHT,
  WINDOW_WARM,
} from './palette';
import {
  COTTAGE,
  COTTAGE_BASE_H,
  COTTAGE_DOOR,
  COTTAGE_DEPTH,
  COTTAGE_DOOR_H,
  COTTAGE_DOOR_W,
  COTTAGE_FLOOR1_H,
  COTTAGE_FLOOR2_H,
  COTTAGE_JETTY,
  COTTAGE_WIDTH,
  COTTAGE_YAW,
  DOOR_CLOSE_MS,
  DOOR_OPEN_MS,
  ENDING_TOTAL_MS,
  WINDOWS_BRIGHT_MS,
  groundHeight,
} from './layout';
import { NEWTON_LEAVES, STUDY_ENTERED, useWorld } from './store';
import { local } from './local';
import { fireWorldEvent } from './sync';

const W = COTTAGE_WIDTH;
const D = COTTAGE_DEPTH;
const J = COTTAGE_JETTY;
const FLOOR1_Y = COTTAGE_BASE_H;
const FLOOR2_Y = FLOOR1_Y + COTTAGE_FLOOR1_H;
const EAVE_Y = FLOOR2_Y + COTTAGE_FLOOR2_H;
const UPPER_W = W + J * 2;
const UPPER_D = D + J * 2;
const FRONT = D / 2; // the lower front wall
const UPPER_FRONT = UPPER_D / 2;

const DOOR_OPEN_ANGLE = 1.95;
const DOOR_SWING_MS = 700;
const BRIGHTEN_MS = 1200;
/** The door swings open as you come up the path... */
const WELCOME_RADIUS = 5.2;
/** ...and this close, you have walked through it. */
const ENTER_RADIUS = 3.1;
// The old timber has settled: everything above the ground floor leans a little.
const LEAN = 0.02;

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function easeInOut(u: number) {
  return u * u * (3 - 2 * u);
}

interface PaneProps {
  x: number;
  y: number;
  z: number;
  size: number;
  material: THREE.Material;
  barred?: boolean;
}

function Window({ x, y, z, size, material, barred = false }: PaneProps) {
  const glass = size * 0.76;
  return (
    <group position={[x, y, z]}>
      <Part color={COTTAGE_BEAM} scale={[size, size, 0.22]} outline={0.06} />
      <mesh geometry={GEO.box} material={material} position={[0, 0, 0.14]} scale={[glass, glass, 0.06]} />
      <Part
        color={COTTAGE_BEAM}
        position={[0, 0, 0.18]}
        scale={[glass + 0.04, 0.1, 0.05]}
        outline={0.12}
        castShadow={false}
      />
      <Part
        color={COTTAGE_BEAM}
        position={[0, 0, 0.18]}
        scale={[0.1, glass + 0.04, 0.05]}
        outline={0.12}
        castShadow={false}
      />
      {barred && (
        <Part
          color={COTTAGE_DOOR_WOOD}
          position={[0, 0, 0.24]}
          rotation={[0, 0, 0.42]}
          scale={[size * 1.35, 0.2, 0.07]}
          outline={0.1}
          castShadow={false}
        />
      )}
    </group>
  );
}

export function Cottage() {
  const door = useRef<THREE.Group>(null);
  const roof = useMemo(() => prismGeometry(UPPER_W / 2 + 0.55, UPPER_D / 2 + 0.55, 3.4), []);

  // Its own material instance: the panes brighten, and nothing else in the
  // world should brighten with them.
  const paneMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ color: new THREE.Color(WINDOW_WARM) }),
    []
  );
  const warm = useMemo(() => new THREE.Color(WINDOW_WARM), []);
  const bright = useMemo(() => new THREE.Color(WINDOW_BRIGHT), []);
  const insideDark = useMemo(() => new THREE.MeshBasicMaterial({ color: COTTAGE_DARK }), []);
  const welcome = useRef(0);
  const firedAt = useRef(0);

  useFrame((_, rawDt) => {
    const state = useWorld.getState();
    const event = state.events[NEWTON_LEAVES];
    let angle = 0;
    let lit = 0;
    let home = false;

    if (event) {
      home = Date.now() - event.firedAt > ENDING_TOTAL_MS;
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

    // Once he is inside, the door opens again for whoever follows him up the
    // path, and stepping into it takes the whole party through.
    if (home && local.spawned && !state.events[STUDY_ENTERED]) {
      const d = Math.hypot(local.x - COTTAGE_DOOR.x, local.z - COTTAGE_DOOR.z);
      const want = d < WELCOME_RADIUS ? 1 : 0;
      welcome.current += (want - welcome.current) * (1 - Math.exp(-Math.min(rawDt, 0.05) * 6));
      angle = Math.max(angle, DOOR_OPEN_ANGLE * welcome.current);
      if (d < ENTER_RADIUS && performance.now() - firedAt.current > 4000) {
        firedAt.current = performance.now();
        fireWorldEvent(STUDY_ENTERED);
      }
    }

    if (door.current) door.current.rotation.y = -angle;
    paneMaterial.color.lerpColors(warm, bright, lit);
  });

  const y = groundHeight(COTTAGE.x, COTTAGE.z);

  return (
    <group position={[COTTAGE.x, y, COTTAGE.z]} rotation={[0, COTTAGE_YAW, 0]}>
      {/* stone footing */}
      <Part
        color={COTTAGE_STONE}
        position={[0, COTTAGE_BASE_H / 2, 0]}
        scale={[W + 0.5, COTTAGE_BASE_H, D + 0.5]}
        outline={0.03}
        receiveShadow
      />

      {/* ground floor, with the corner posts showing */}
      <Part
        color={COTTAGE_WALL}
        position={[0, FLOOR1_Y + COTTAGE_FLOOR1_H / 2, 0]}
        scale={[W, COTTAGE_FLOOR1_H, D]}
        outline={0.02}
        receiveShadow
      />
      {[
        [W / 2 - 0.14, D / 2 - 0.14],
        [-(W / 2 - 0.14), D / 2 - 0.14],
        [W / 2 - 0.14, -(D / 2 - 0.14)],
        [-(W / 2 - 0.14), -(D / 2 - 0.14)],
      ].map(([px, pz], i) => (
        <Part
          key={i}
          color={COTTAGE_BEAM}
          position={[px, FLOOR1_Y + COTTAGE_FLOOR1_H / 2, pz]}
          scale={[0.44, COTTAGE_FLOOR1_H, 0.44]}
          outline={0.05}
        />
      ))}
      {/* plank seams, so the wall reads as boards and not a slab */}
      {[-3.3, 3.3].map(px => (
        <Part
          key={px}
          color={COTTAGE_BEAM}
          position={[px, FLOOR1_Y + COTTAGE_FLOOR1_H / 2, FRONT + 0.02]}
          scale={[0.16, COTTAGE_FLOOR1_H * 0.94, 0.06]}
          outline={0.1}
          castShadow={false}
        />
      ))}

      {/* everything above the ground floor has settled out of true */}
      <group rotation={[0, 0, LEAN]}>
        <Part
          color={COTTAGE_BEAM}
          position={[0, FLOOR2_Y, 0]}
          scale={[UPPER_W + 0.25, 0.38, UPPER_D + 0.25]}
          outline={0.035}
        />
        <Part
          color={COTTAGE_UPPER}
          position={[0, FLOOR2_Y + COTTAGE_FLOOR2_H / 2 + 0.19, 0]}
          scale={[UPPER_W, COTTAGE_FLOOR2_H, UPPER_D]}
          outline={0.02}
          receiveShadow
        />
        <Part
          geometry={roof}
          color={COTTAGE_ROOF}
          position={[0, EAVE_Y + 0.2, 0]}
          rotation={[0, 0, 0.012]}
          outline={0.02}
        />
        <Window
          x={-2.4}
          y={FLOOR2_Y + 1.75}
          z={UPPER_FRONT - 0.08}
          size={1.35}
          material={paneMaterial}
          barred
        />
        <Window
          x={2.4}
          y={FLOOR2_Y + 1.75}
          z={UPPER_FRONT - 0.08}
          size={1.35}
          material={paneMaterial}
        />
      </group>

      {/* leaning chimney, running the full height of the gable end */}
      <Part
        color={COTTAGE_STONE}
        position={[-5.35, 5.1, -2.2]}
        rotation={[0, 0, 0.035]}
        scale={[1.15, 10.4, 1.15]}
        outline={0.03}
      />
      <Part
        color={COTTAGE_BEAM}
        position={[-5.53, 10.5, -2.2]}
        scale={[1.5, 0.38, 1.5]}
        outline={0.06}
      />

      {/* the doorway: dark inside, heavy lintel, a step, and a porch roof */}
      <mesh
        geometry={GEO.box}
        material={insideDark}
        position={[0, COTTAGE_DOOR_H / 2 + 0.05, FRONT - 0.18]}
        scale={[COTTAGE_DOOR_W, COTTAGE_DOOR_H, 0.14]}
      />
      <Part
        color={COTTAGE_BEAM}
        position={[0, COTTAGE_DOOR_H + 0.24, FRONT + 0.04]}
        scale={[COTTAGE_DOOR_W + 0.7, 0.38, 0.42]}
        outline={0.06}
      />
      <Part
        color={COTTAGE_STONE}
        position={[0, 0.12, FRONT + 0.8]}
        scale={[COTTAGE_DOOR_W + 0.9, 0.26, 1.3]}
        outline={0.05}
        receiveShadow
      />
      {[-1.72, 1.72].map(px => (
        <Part
          key={px}
          color={COTTAGE_BEAM}
          position={[px, 2.0, FRONT + 1.35]}
          scale={[0.24, 4.0, 0.24]}
          outline={0.06}
        />
      ))}
      <Part
        color={COTTAGE_ROOF}
        position={[0, 4.12, FRONT + 0.85]}
        rotation={[-0.16, 0, 0]}
        scale={[4.2, 0.24, 2.0]}
        outline={0.035}
      />

      {/* the door itself, hinged on its left edge, swinging outward */}
      <group ref={door} position={[-COTTAGE_DOOR_W / 2, 0, FRONT - 0.04]}>
        <Part
          color={COTTAGE_DOOR_WOOD}
          position={[COTTAGE_DOOR_W / 2, COTTAGE_DOOR_H / 2 + 0.05, 0]}
          scale={[COTTAGE_DOOR_W, COTTAGE_DOOR_H, 0.16]}
          outline={0.045}
        />
        <Part
          color={COTTAGE_BEAM}
          position={[COTTAGE_DOOR_W / 2, 1.25, 0.11]}
          scale={[COTTAGE_DOOR_W - 0.18, 0.2, 0.07]}
          outline={0.09}
          castShadow={false}
        />
        <Part
          color={COTTAGE_BEAM}
          position={[COTTAGE_DOOR_W / 2, 2.55, 0.11]}
          scale={[COTTAGE_DOOR_W - 0.18, 0.2, 0.07]}
          outline={0.09}
          castShadow={false}
        />
        <Part
          color={COTTAGE_STONE}
          position={[COTTAGE_DOOR_W - 0.3, 1.85, 0.14]}
          scale={[0.16, 0.16, 0.16]}
          outline={0.18}
          castShadow={false}
        />
      </group>

      <Window x={-3.05} y={2.0} z={FRONT - 0.08} size={1.75} material={paneMaterial} />
      <Window x={3.05} y={2.0} z={FRONT - 0.08} size={1.75} material={paneMaterial} />
    </group>
  );
}
