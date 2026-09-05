// The weapon wall, and the way down.
//
// When the portal shuts, the bookshelf grinds along the wall and there is a
// rack behind it: shields, swords and one thing that has no business being in
// 1687. The rack holds exactly as many of each as there are people in the
// room, and taking one takes it off the wall for everybody, because the rack
// is drawn from the held_item rows rather than from a local count.
//
// The cellar door appears with the rack and stays barred until every last
// person is carrying something.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part, basicMaterial } from '../world1/toon';
import { WeaponMesh } from '../world1/HeldItems';
import {
  BOOK_COLOURS,
  COTTAGE_DARK,
  DESK_WOOD,
  PORTAL_FRAME,
  STUDY_BEAM,
} from '../world1/palette';
import {
  BOOKSHELF,
  BOOKSHELF_OPEN_Z,
  CELLAR,
  CELLAR_H,
  CELLAR_W,
  RACK,
  RACK_ROWS,
  shelf,
} from './study';
import {
  CELLAR_OPEN,
  FIGHT_DONE,
  WEAPONS,
  isWeapon,
  useWorld,
} from '../world1/store';
import { interactables } from '../world1/local';
import { fireWorldEvent } from '../world1/sync';
import { rumble } from './sound';

const SLIDE_MS = 2600;
const DOOR_SWING_MS = 900;

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

function easeInOut(u: number) {
  return u * u * (3 - 2 * u);
}

/** How many of each type there are, and how many are still on the wall. */
function useStock() {
  const party = useWorld(s => Object.values(s.party).filter(p => p.connected).length);
  const held = useWorld(s => Object.values(s.held).join(','));
  return useMemo(() => {
    const total = Math.max(1, party);
    const taken: Record<string, number> = {};
    for (const item of held ? held.split(',') : []) {
      if (isWeapon(item)) taken[item] = (taken[item] ?? 0) + 1;
    }
    const left: Record<string, number> = {};
    for (const w of WEAPONS) left[w] = Math.max(0, total - (taken[w] ?? 0));
    return { total, left };
  }, [party, held]);
}

/** One weapon hanging on the wall, tappable while it is still there. */
function RackedWeapon({ item, x, y, z }: { item: string; x: number; y: number; z: number }) {
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.userData.interact = item;
    interactables.add(g);
    return () => {
      interactables.delete(g);
    };
  }, [item]);

  return (
    <group ref={group} position={[x, y, z]} rotation={[0, Math.PI / 2, 0]} scale={0.85}>
      <WeaponMesh item={item} />
    </group>
  );
}

function Rack() {
  const { total, left } = useStock();
  return (
    <group>
      {/* the rack frame: posts and three rails along the wall */}
      <Part
        color={STUDY_BEAM}
        position={[RACK.x - 0.32, 2.1, -1.0]}
        scale={[0.3, 4.2, 7.6]}
        outline={0.02}
        receiveShadow
      />
      {Object.values(RACK_ROWS).map(row => (
        <Part
          key={row.y}
          color={DESK_WOOD}
          position={[RACK.x - 0.1, row.y - 0.62, (row.z0 + row.z1) / 2]}
          scale={[0.24, 0.14, row.z1 - row.z0 + 0.7]}
          outline={0.05}
          castShadow={false}
        />
      ))}
      {WEAPONS.map(item => {
        const row = RACK_ROWS[item];
        const remaining = left[item] ?? 0;
        const span = row.z1 - row.z0;
        return Array.from({ length: remaining }, (_, i) => {
          const u = total <= 1 ? 0.5 : i / Math.max(1, total - 1);
          return (
            <RackedWeapon
              key={`${item}${i}`}
              item={item}
              x={RACK.x}
              y={row.y}
              z={row.z0 + span * u}
            />
          );
        });
      })}
    </group>
  );
}

function Bookshelf() {
  const group = useRef<THREE.Group>(null);
  const done = useWorld(s => s.events[FIGHT_DONE]);
  const groaned = useRef(false);

  const books = useMemo(() => {
    const random = rng(5150);
    const out: { z: number; y: number; h: number; w: number; colour: string }[] = [];
    for (let s = 0; s < 4; s++) {
      let z = -2.2;
      while (z < 2.2) {
        const w = 0.12 + random() * 0.08;
        out.push({
          z: z + w / 2,
          y: 0.55 + s * 1.02,
          h: 0.46 + random() * 0.3,
          w,
          colour: BOOK_COLOURS[Math.floor(random() * BOOK_COLOURS.length)],
        });
        z += w + 0.015;
      }
    }
    return out;
  }, []);

  useEffect(() => {
    if (done && !groaned.current) {
      groaned.current = true;
      rumble(2.2);
    }
  }, [done]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    let u = 0;
    if (done) {
      u =
        Date.now() - done.firedAt > SLIDE_MS + 4000
          ? 1
          : easeInOut(Math.min(1, Math.max(0, (performance.now() - done.receivedAt) / SLIDE_MS)));
    }
    shelf.z = BOOKSHELF.z + (BOOKSHELF_OPEN_Z - BOOKSHELF.z) * u;
    g.position.z = shelf.z;
  });

  return (
    <group ref={group} position={[BOOKSHELF.x, 0, BOOKSHELF.z]}>
      <Part color={STUDY_BEAM} position={[0.05, 2.2, 0]} scale={[0.6, 4.4, 5.0]} outline={0.02} receiveShadow />
      {[0.5, 1.52, 2.54, 3.56, 4.3].map(y => (
        <Part
          key={y}
          color={DESK_WOOD}
          position={[0.12, y, 0]}
          scale={[0.62, 0.1, 4.9]}
          outline={0.03}
          castShadow={false}
        />
      ))}
      {books.map((b, i) => (
        <Part
          key={i}
          color={b.colour}
          position={[0.2, b.y + b.h / 2, b.z]}
          scale={[0.3, b.h, b.w]}
          outline={0.06}
          castShadow={false}
        />
      ))}
    </group>
  );
}

/** The way down. Barred until everyone is holding something. */
function CellarDoor() {
  const door = useRef<THREE.Group>(null);
  const bar = useRef<THREE.Group>(null);
  const frame = useRef<THREE.Group>(null);
  const done = useWorld(s => s.events[FIGHT_DONE]);
  const open = useWorld(s => s.events[CELLAR_OPEN]);
  const armed = useWorld(s => {
    const party = Object.entries(s.party).filter(([, p]) => p.connected);
    if (party.length === 0) return false;
    return party.every(([id]) => isWeapon(s.held[id] ?? null));
  });
  const dark = useMemo(() => basicMaterial(COTTAGE_DARK), []);

  // Everyone armed unlocks it, once, for the whole room.
  useEffect(() => {
    if (armed && done && !open) fireWorldEvent(CELLAR_OPEN);
  }, [armed, done, open]);

  useFrame(() => {
    const f = frame.current;
    if (!f) return;
    let show = 0;
    if (done) {
      show =
        Date.now() - done.firedAt > SLIDE_MS + 4000
          ? 1
          : easeInOut(Math.min(1, Math.max(0, (performance.now() - done.receivedAt) / SLIDE_MS)));
    }
    f.visible = show > 0.01;
    f.scale.set(1, show, 1);

    let swing = 0;
    if (open) {
      swing =
        Date.now() - open.firedAt > DOOR_SWING_MS + 4000
          ? 1
          : easeInOut(Math.min(1, Math.max(0, (performance.now() - open.receivedAt) / DOOR_SWING_MS)));
    }
    if (door.current) door.current.rotation.y = -swing * 2.1;
    if (bar.current) {
      bar.current.visible = swing < 0.5;
      bar.current.position.y = CELLAR_H * 0.5 + swing * 0.6;
    }
  });

  return (
    <group ref={frame} position={[CELLAR.x, 0, CELLAR.z]} rotation={[0, -Math.PI / 2, 0]}>
      {/* the opening itself is simply dark: there is nothing down there yet */}
      <mesh
        geometry={GEO.box}
        material={dark}
        position={[0, CELLAR_H / 2, -0.18]}
        scale={[CELLAR_W, CELLAR_H, 0.2]}
      />
      <Part color={PORTAL_FRAME} position={[-CELLAR_W / 2 - 0.26, CELLAR_H / 2, 0]} scale={[0.52, CELLAR_H + 0.5, 0.5]} outline={0.05} />
      <Part color={PORTAL_FRAME} position={[CELLAR_W / 2 + 0.26, CELLAR_H / 2, 0]} scale={[0.52, CELLAR_H + 0.5, 0.5]} outline={0.05} />
      <Part color={PORTAL_FRAME} position={[0, CELLAR_H + 0.25, 0]} scale={[CELLAR_W + 1.05, 0.5, 0.55]} outline={0.05} />
      <group ref={door} position={[-CELLAR_W / 2, 0, 0.06]}>
        <Part
          color={DESK_WOOD}
          position={[CELLAR_W / 2, CELLAR_H / 2, 0]}
          scale={[CELLAR_W, CELLAR_H, 0.14]}
          outline={0.04}
        />
        <Part
          color={STUDY_BEAM}
          position={[CELLAR_W - 0.28, CELLAR_H / 2, 0.1]}
          scale={[0.14, 0.14, 0.12]}
          outline={0.18}
          castShadow={false}
        />
      </group>
      <group ref={bar}>
        <Part color={STUDY_BEAM} position={[0, 0, 0.16]} scale={[CELLAR_W + 0.6, 0.26, 0.2]} outline={0.08} />
      </group>
    </group>
  );
}

export function Armoury() {
  const done = useWorld(s => s.events[FIGHT_DONE]);
  return (
    <group>
      <Bookshelf />
      {done && <Rack />}
      <CellarDoor />
    </group>
  );
}
