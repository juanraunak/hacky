// The portal, and the notebook page on the wall.
//
// The portal is a stone doorway that grinds up out of the floor and fills with
// a slow, dark red swirl. The swirl is opaque flat paint that turns, not a
// transparency or a glow: rings at different radii rotating at different
// speeds, which reads as motion without costing a shader or a blend.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { GEO, Part, basicMaterial } from '../world1/toon';
import { PORTAL_DEEP, PORTAL_EDGE, PORTAL_FRAME, PORTAL_MID } from '../world1/palette';
import { NOTEBOOK, PORTAL, PORTAL_H, PORTAL_W } from './study';
import { FIGHT_DONE, PORTAL_OPEN, useWorld } from '../world1/store';
import { useStudy } from './studyStore';
import { rumble } from './sound';

const RISE_MS = 1800;
const SINK_MS = 1500;

export function Portal() {
  const group = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const opened = useWorld(s => s.events[PORTAL_OPEN]);
  const closed = useWorld(s => s.events[FIGHT_DONE]);
  const rumbled = useRef(false);

  const ringSpec = useMemo(
    () => [
      { r: 1.5, tube: 0.34, speed: 0.32, colour: PORTAL_MID },
      { r: 1.02, tube: 0.3, speed: -0.47, colour: PORTAL_EDGE },
      { r: 0.55, tube: 0.26, speed: 0.68, colour: PORTAL_MID },
    ],
    []
  );

  useEffect(() => {
    if (opened && !rumbled.current) {
      rumbled.current = true;
      rumble(2.8);
      useWorld.getState().shake(0.14, 2200);
    }
  }, [opened]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    let open = 0;
    if (opened) {
      const since = performance.now() - opened.receivedAt;
      open = Math.min(1, since / RISE_MS);
      if (Date.now() - opened.firedAt > RISE_MS + 3000) open = 1;
      if (closed) {
        const gone = performance.now() - closed.receivedAt;
        open = Math.max(0, 1 - gone / SINK_MS);
        if (Date.now() - closed.firedAt > SINK_MS + 3000) open = 0;
      }
    }
    g.visible = open > 0.001;
    // Grinds straight up out of the floor: scale on Y only, no fade.
    g.scale.set(1, open, 1);
    const t = clock.elapsedTime;
    ringSpec.forEach((spec, i) => {
      const ring = rings.current[i];
      if (ring) {
        ring.rotation.z = t * spec.speed;
        const wobble = 1 + Math.sin(t * (0.7 + i * 0.3)) * 0.06;
        ring.scale.set(wobble, 1 / wobble, 1);
      }
    });
  });

  const half = PORTAL_W / 2;

  return (
    <group ref={group} position={[PORTAL.x, 0, PORTAL.z]}>
      {/* stone jambs and lintel */}
      <Part
        color={PORTAL_FRAME}
        position={[-half - 0.42, PORTAL_H / 2, 0]}
        scale={[0.84, PORTAL_H, 0.9]}
        outline={0.04}
      />
      <Part
        color={PORTAL_FRAME}
        position={[half + 0.42, PORTAL_H / 2, 0]}
        scale={[0.84, PORTAL_H, 0.9]}
        outline={0.04}
      />
      <Part
        color={PORTAL_FRAME}
        position={[0, PORTAL_H + 0.36, 0]}
        scale={[PORTAL_W + 1.7, 0.72, 1.0]}
        outline={0.04}
      />
      <Part
        color={PORTAL_FRAME}
        position={[0, 0.16, 0.1]}
        scale={[PORTAL_W + 1.7, 0.32, 1.1]}
        outline={0.05}
      />

      {/* the surface: an opaque dark disc with rings turning inside it */}
      <group position={[0, PORTAL_H / 2, -0.12]}>
        <mesh
          geometry={GEO.cylinder}
          material={basicMaterial(PORTAL_DEEP)}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[half, 0.08, PORTAL_H / 2]}
        />
        {ringSpec.map((spec, i) => (
          <mesh
            key={i}
            ref={el => { rings.current[i] = el; }}
            geometry={GEO.torus}
            material={basicMaterial(spec.colour)}
            position={[0, 0, 0.06 + i * 0.02]}
            scale={[spec.r, spec.r * 1.25, spec.tube]}
          />
        ))}
      </group>
    </group>
  );
}

// The page pinned to the wall. Newton writes one line per thing learned, and
// nothing is ever taken off it.
export function Notebook() {
  const notes = useStudy(s => s.notes);
  return (
    <group position={[NOTEBOOK.x, NOTEBOOK.y, NOTEBOOK.z]} rotation={[0, -Math.PI / 2, 0]}>
      <Part
        color={PORTAL_FRAME}
        position={[0, 0, -0.06]}
        scale={[2.1, 2.6, 0.1]}
        outline={0.03}
        castShadow={false}
      />
      <Html
        transform
        distanceFactor={2.4}
        position={[0, 0, 0.02]}
        zIndexRange={[30, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div className="notebook">
          <b>NOTEBOOK</b>
          {notes.length === 0 ? <i>(blank)</i> : notes.map(n => <p key={n}>{n}</p>)}
        </div>
      </Html>
    </group>
  );
}
