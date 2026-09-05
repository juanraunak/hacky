// The room. One large study, dim, with two candles on the desk doing most of
// the lighting. Papers, books, an inkpot, a bookshelf, and Newton behind the
// desk. The far half of the floor is left clear; that is where the portal
// opens later.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part, basicMaterial } from '../world1/toon';
import {
  BOOK_COLOURS,
  CANDLE_FLAME,
  CANDLE_WAX,
  DESK_WOOD,
  INKPOT,
  PAPER,
  STUDY_BEAM,
  STUDY_CEILING,
  STUDY_FLOOR,
  STUDY_RUG,
  STUDY_WALL,
  STUDY_WALL_DARK,
} from '../world1/palette';
import {
  CANDLES,
  CANDLE_Y,
  DESK,
  DESK_D,
  DESK_TOP,
  DESK_W,
  ROOM_X,
  ROOM_Z,
  TORCHES,
  TORCH_Y,
  WALL_H,
  WALL_T,
} from './study';
import { PORTAL_OPEN, useWorld } from '../world1/store';

// Deterministic scatter, so the same papers land in the same places for
// everyone in the party.
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

function Shell() {
  return (
    <group>
      <Part
        color={STUDY_FLOOR}
        position={[0, -0.15, 0]}
        scale={[ROOM_X * 2, 0.3, ROOM_Z * 2]}
        outline={0}
        receiveShadow
      />
      {/* a worn rug over the open half, so the empty floor is not empty */}
      <Part
        color={STUDY_RUG}
        position={[0, 0.015, 2.6]}
        scale={[8.4, 0.03, 6.2]}
        outline={0}
        castShadow={false}
        receiveShadow
      />
      {/* four walls and a low ceiling: the study has to feel shut in */}
      <Part
        color={STUDY_WALL}
        position={[0, WALL_H / 2, -ROOM_Z]}
        scale={[ROOM_X * 2 + WALL_T, WALL_H, WALL_T]}
        outline={0}
        receiveShadow
      />
      <Part
        color={STUDY_WALL_DARK}
        position={[0, WALL_H / 2, ROOM_Z]}
        scale={[ROOM_X * 2 + WALL_T, WALL_H, WALL_T]}
        outline={0}
        receiveShadow
      />
      <Part
        color={STUDY_WALL}
        position={[-ROOM_X, WALL_H / 2, 0]}
        scale={[WALL_T, WALL_H, ROOM_Z * 2]}
        outline={0}
        receiveShadow
      />
      <Part
        color={STUDY_WALL}
        position={[ROOM_X, WALL_H / 2, 0]}
        scale={[WALL_T, WALL_H, ROOM_Z * 2]}
        outline={0}
        receiveShadow
      />
      <Part
        color={STUDY_CEILING}
        position={[0, WALL_H, 0]}
        scale={[ROOM_X * 2, 0.3, ROOM_Z * 2]}
        outline={0}
        castShadow={false}
      />
      {/* ceiling beams */}
      {[-5, -1.5, 2, 5.5].map(z => (
        <Part
          key={z}
          color={STUDY_BEAM}
          position={[0, WALL_H - 0.32, z]}
          scale={[ROOM_X * 2, 0.34, 0.42]}
          outline={0.03}
          castShadow={false}
        />
      ))}
    </group>
  );
}

function Desk() {
  const papers = useMemo(() => {
    const random = rng(77);
    // On the desk, and spilled across the floor around it.
    return Array.from({ length: 22 }, (_, i) => {
      const onDesk = i < 9;
      return {
        x: onDesk
          ? DESK.x + (random() * 2 - 1) * (DESK_W / 2 - 0.4)
          : DESK.x + (random() * 2 - 1) * 5.5,
        y: onDesk ? DESK_TOP + 0.012 + i * 0.004 : 0.035 + (i % 3) * 0.004,
        z: onDesk
          ? DESK.z + (random() * 2 - 1) * (DESK_D / 2 - 0.28)
          : DESK.z + 0.9 + random() * 3.4,
        yaw: random() * Math.PI,
        s: 0.75 + random() * 0.4,
      };
    });
  }, []);

  const books = useMemo(() => {
    const random = rng(1919);
    return Array.from({ length: 7 }, (_, i) => ({
      x: DESK.x - DESK_W / 2 + 0.5 + i * 0.16,
      h: 0.5 + random() * 0.34,
      w: 0.13 + random() * 0.07,
      colour: BOOK_COLOURS[i % BOOK_COLOURS.length],
      lean: (random() - 0.5) * 0.14,
    }));
  }, []);

  return (
    <group>
      <Part
        color={DESK_WOOD}
        position={[DESK.x, DESK_TOP - 0.09, DESK.z]}
        scale={[DESK_W, 0.18, DESK_D]}
        outline={0.03}
        receiveShadow
      />
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <Part
          key={i}
          color={STUDY_BEAM}
          position={[
            DESK.x + sx * (DESK_W / 2 - 0.22),
            (DESK_TOP - 0.18) / 2,
            DESK.z + sz * (DESK_D / 2 - 0.2),
          ]}
          scale={[0.2, DESK_TOP - 0.18, 0.2]}
          outline={0.06}
        />
      ))}

      {papers.map((p, i) => (
        <Part
          key={i}
          color={PAPER}
          position={[p.x, p.y, p.z]}
          rotation={[0, p.yaw, 0]}
          scale={[0.42 * p.s, 0.012, 0.56 * p.s]}
          outline={0.06}
          castShadow={false}
          receiveShadow
        />
      ))}

      {/* inkpot */}
      <Part
        geometry={GEO.cylinder}
        color={INKPOT}
        position={[DESK.x - 1.75, DESK_TOP + 0.11, DESK.z - 0.42]}
        scale={[0.15, 0.22, 0.15]}
        outline={0.07}
      />

      {/* a short row of books standing on the desk */}
      {books.map((b, i) => (
        <Part
          key={i}
          color={b.colour}
          position={[b.x, DESK_TOP + b.h / 2, DESK.z - 0.62]}
          rotation={[0, 0, b.lean]}
          scale={[b.w, b.h, 0.34]}
          outline={0.07}
        />
      ))}
    </group>
  );
}

// Two candles, and the only real light in the room. They gutter when the
// portal opens and steady again when it closes.
function Candles() {
  const lights = useRef<(THREE.PointLight | null)[]>([null, null]);
  const flames = useRef<(THREE.Group | null)[]>([null, null]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const portal = useWorld.getState().events[PORTAL_OPEN];
    // A gutter for a couple of seconds as the portal comes up.
    let gutter = 1;
    if (portal) {
      const since = performance.now() - portal.receivedAt;
      if (since < 2600) gutter = 0.25 + 0.75 * Math.abs(Math.sin(since * 0.011));
    }
    for (let i = 0; i < 2; i++) {
      const flicker = 0.82 + Math.sin(t * (9 + i * 3.1) + i) * 0.1 + Math.sin(t * 23.7 + i * 2) * 0.06;
      const light = lights.current[i];
      if (light) light.intensity = 7.5 * flicker * gutter;
      const flame = flames.current[i];
      if (flame) {
        flame.scale.set(1, 0.85 + flicker * 0.3, 1);
        flame.position.x = Math.sin(t * 7 + i) * 0.008;
      }
    }
  });

  return (
    <group>
      {CANDLES.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <Part
            geometry={GEO.cylinder}
            color={CANDLE_WAX}
            position={[0, DESK_TOP + 0.21, 0]}
            scale={[0.075, 0.42, 0.075]}
            outline={0.09}
          />
          <group ref={el => { flames.current[i] = el; }} position={[0, CANDLE_Y + 0.07, 0]}>
            <mesh
              geometry={GEO.cone}
              material={basicMaterial(CANDLE_FLAME)}
              scale={[0.055, 0.17, 0.055]}
            />
          </group>
          <pointLight
            ref={el => { lights.current[i] = el; }}
            position={[0, CANDLE_Y + 0.12, 0]}
            color="#ffbb66"
            intensity={7.5}
            distance={16}
            decay={1.6}
          />
        </group>
      ))}
    </group>
  );
}

// Two brackets on the side walls. Dead while this is a study; they catch
// when the portal opens and the far half of the room becomes somewhere you
// have to see. Orange, flickering, no shadows: the candles do the shape.
function Torches() {
  const lights = useRef<(THREE.PointLight | null)[]>([null, null]);
  const flames = useRef<(THREE.Group | null)[]>([null, null]);
  const lit = useWorld(s => !!s.events[PORTAL_OPEN]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (let i = 0; i < 2; i++) {
      const flicker = 0.8 + Math.sin(t * (7 + i * 2.3) + i) * 0.13 + Math.sin(t * 19 + i) * 0.07;
      const light = lights.current[i];
      if (light) light.intensity = lit ? 11 * flicker : 0;
      const flame = flames.current[i];
      if (flame) {
        flame.visible = lit;
        flame.scale.set(1, 0.8 + flicker * 0.35, 1);
      }
    }
  });

  return (
    <group>
      {TORCHES.map(([x, z], i) => (
        <group key={i} position={[x, TORCH_Y, z]}>
          <Part
            color={STUDY_BEAM}
            position={[x > 0 ? -0.18 : 0.18, -0.16, 0]}
            rotation={[0, 0, x > 0 ? 0.5 : -0.5]}
            scale={[0.14, 0.5, 0.14]}
            outline={0.12}
            castShadow={false}
          />
          <group ref={el => { flames.current[i] = el; }} position={[x > 0 ? -0.3 : 0.3, 0.18, 0]}>
            <mesh
              geometry={GEO.cone}
              material={basicMaterial(CANDLE_FLAME)}
              scale={[0.13, 0.36, 0.13]}
            />
          </group>
          <pointLight
            ref={el => { lights.current[i] = el; }}
            position={[x > 0 ? -0.5 : 0.5, 0.2, 0]}
            color="#ffa347"
            intensity={0}
            distance={22}
            decay={1.5}
          />
        </group>
      ))}
    </group>
  );
}

export function StudyRoom() {
  return (
    <group>
      <Shell />
      <Desk />
      <Candles />
      <Torches />
    </group>
  );
}
