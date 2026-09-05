// The drop test. A stone, a pen, and a feather half under the papers.
//
// The lesson is the stone and the pen: they leave your hand at the same height
// and hit the floor at the same moment, whatever they weigh. The feather is
// the exception nobody is told about, and it teaches nothing on purpose.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part } from '../world1/toon';
import { FEATHER_WHITE, PAPER, PEN_BODY, PEN_PLUME, STONE_ITEM } from '../world1/palette';
import { FEATHER_SPOT, HAND_Y, PEN_SPOT, STONE_SPOT } from './study';
import { interactables } from '../world1/local';
import {
  FEATHER_DROPPED,
  PEN_DROPPED,
  PEN_ITEM,
  STONE_DROPPED,
  useWorld,
  type WorldEvent,
} from '../world1/store';
import { equipItem, fireWorldEvent } from '../world1/sync';
import { useStudy } from './studyStore';
import { SAY, NOTE_SAME_FALL } from './story2';
import { thud } from './sound';

export const STONE_ITEM_ID = 'stone';
export const FEATHER_ITEM_ID = 'feather';

// Stone and pen fall together, because that is the whole point. The feather
// takes its time, because that is a different lecture.
const FALL_MS = 620;
const FEATHER_FALL_MS = 4200;

interface ItemDef {
  id: string;
  event: string;
  spot: { x: number; y: number; z: number };
  restY: number;
  fallMs: number;
}

const ITEMS: ItemDef[] = [
  { id: STONE_ITEM_ID, event: STONE_DROPPED, spot: STONE_SPOT, restY: 0.17, fallMs: FALL_MS },
  { id: PEN_ITEM, event: PEN_DROPPED, spot: PEN_SPOT, restY: 0.05, fallMs: FALL_MS },
  {
    id: FEATHER_ITEM_ID,
    event: FEATHER_DROPPED,
    spot: FEATHER_SPOT,
    restY: 0.04,
    fallMs: FEATHER_FALL_MS,
  },
];

function StoneMesh() {
  return <Part geometry={GEO.rock} color={STONE_ITEM} flat scale={[0.2, 0.16, 0.18]} outline={0.08} />;
}

function PenMesh() {
  return (
    <group rotation={[0, 0, 0.35]}>
      <Part
        geometry={GEO.cylinder}
        color={PEN_BODY}
        scale={[0.022, 0.42, 0.022]}
        outline={0.3}
      />
      <Part
        geometry={GEO.cone}
        color={PEN_PLUME}
        position={[0, 0.3, 0]}
        rotation={[0, 0, Math.PI]}
        scale={[0.055, 0.34, 0.03]}
        outline={0.16}
      />
    </group>
  );
}

function FeatherMesh() {
  return (
    <group rotation={[0, 0, 0.5]}>
      <Part
        geometry={GEO.cylinder}
        color={PEN_BODY}
        scale={[0.012, 0.34, 0.012]}
        outline={0.4}
        castShadow={false}
      />
      <Part
        geometry={GEO.sphereLow}
        color={FEATHER_WHITE}
        position={[0, 0.06, 0]}
        scale={[0.07, 0.2, 0.02]}
        outline={0.14}
        castShadow={false}
      />
    </group>
  );
}

function mesh(id: string) {
  if (id === STONE_ITEM_ID) return <StoneMesh />;
  if (id === PEN_ITEM) return <PenMesh />;
  return <FeatherMesh />;
}

/** Where a dropped item landed: under whoever let go of it. */
function landingOf(event: WorldEvent, fallback: { x: number; z: number }) {
  const p = useWorld.getState().positions[event.firedBy];
  return p ? { x: p.x, z: p.z } : fallback;
}

function Item({ def }: { def: ItemDef }) {
  const group = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Group>(null);
  const event = useWorld(s => s.events[def.event]);
  const holder = useWorld(s => {
    for (const [id, item] of Object.entries(s.held)) if (item === def.id) return id;
    return null;
  });
  const identity = useWorld(s => s.identity);
  const landed = useRef<{ x: number; z: number } | null>(null);
  const thudded = useRef(false);

  useEffect(() => {
    const g = group.current;
    if (!g) return;
    g.userData.interact = def.id;
    interactables.add(g);
    return () => {
      interactables.delete(g);
    };
  }, [def.id]);

  // Freeze the landing spot the first time the drop is seen, so it does not
  // trail the player who let go of it.
  useEffect(() => {
    if (!event) {
      landed.current = null;
      thudded.current = false;
      return;
    }
    if (!landed.current) landed.current = landingOf(event, { x: def.spot.x, z: def.spot.z });
  }, [event, def.spot.x, def.spot.z]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;

    if (event && landed.current) {
      const stale = Date.now() - event.firedAt > def.fallMs + 4000;
      const ms = stale ? def.fallMs : performance.now() - event.receivedAt;
      const u = Math.min(1, ms / def.fallMs);
      const spot = landed.current;
      if (def.id === FEATHER_ITEM_ID) {
        // It does not fall so much as decline to stay up.
        const drift = Math.sin(u * Math.PI * 3.2) * 0.28 * (1 - u);
        g.position.set(spot.x + drift, HAND_Y + (def.restY - HAND_Y) * u, spot.z + drift * 0.6);
        g.rotation.set(Math.sin(u * 9) * 0.5, u * 2.2, Math.cos(u * 7) * 0.6);
      } else {
        // Ease in: it is slow leaving your hand and quick arriving.
        g.position.set(spot.x, HAND_Y + (def.restY - HAND_Y) * u * u, spot.z);
        g.rotation.set(u * 2.4, 0, 0);
      }
      if (u >= 1 && !thudded.current) {
        thudded.current = true;
        if (def.id !== FEATHER_ITEM_ID) {
          thud(0.8);
          useWorld.getState().shake(0.05, 180);
        }
      }
      if (dust.current) {
        const since = (ms - def.fallMs) / 700;
        dust.current.visible = def.id !== FEATHER_ITEM_ID && since > 0 && since < 1;
        if (dust.current.visible) {
          const k = Math.max(0, since);
          dust.current.children.forEach((puff, i) => {
            const a = (i / 5) * Math.PI * 2;
            puff.position.set(Math.cos(a) * k * 0.5, 0.04 + k * 0.14, Math.sin(a) * k * 0.5);
            puff.scale.setScalar(Math.max(0.001, (1 - k) * 0.13));
          });
        }
      }
      g.visible = true;
      return;
    }

    if (holder) {
      // In a hand: follow that player, at hand height.
      const s = useWorld.getState();
      const p = holder === identity ? null : s.positions[holder];
      const hx = p ? p.x : localHandX();
      const hz = p ? p.z : localHandZ();
      g.position.set(hx, HAND_Y, hz);
      g.rotation.set(0, 0, 0);
      g.visible = true;
      if (dust.current) dust.current.visible = false;
      return;
    }

    g.position.set(def.spot.x, def.spot.y, def.spot.z);
    g.rotation.set(0, def.id === FEATHER_ITEM_ID ? 0.7 : 0.2, 0);
    g.visible = true;
    if (dust.current) dust.current.visible = false;
  });

  return (
    <group>
      <group ref={group}>{mesh(def.id)}</group>
      <group ref={dust} visible={false}>
        {Array.from({ length: 5 }, (_, i) => (
          <Part key={i} geometry={GEO.sphereLow} color={PAPER} scale={0.1} outline={0} castShadow={false} />
        ))}
      </group>
    </group>
  );
}

// The local player's hand, read straight off the movement singleton so the
// item in your own hand never lags a network tick behind you.
import { local } from '../world1/local';
function localHandX() {
  return local.x + Math.sin(local.heading) * 0.35;
}
function localHandZ() {
  return local.z + Math.cos(local.heading) * 0.35;
}

export function DropTest() {
  const stone = useWorld(s => s.events[STONE_DROPPED]);
  const pen = useWorld(s => s.events[PEN_DROPPED]);
  const feather = useWorld(s => s.events[FEATHER_DROPPED]);
  const items = useMemo(() => ITEMS, []);

  // Newton reacts, the notebook writes, and the pen becomes everyone's.
  useEffect(() => {
    if (!stone) return;
    if (Date.now() - stone.firedAt > 8000) {
      useStudy.getState().addNote(NOTE_SAME_FALL);
      return;
    }
    const t = window.setTimeout(() => {
      useStudy.getState().say(SAY.stone);
      useStudy.getState().addNote(NOTE_SAME_FALL);
    }, 700);
    return () => window.clearTimeout(t);
  }, [stone]);

  useEffect(() => {
    if (!pen) return;
    equipItem(PEN_ITEM);
    if (Date.now() - pen.firedAt > 8000) return;
    const t = window.setTimeout(() => useStudy.getState().say(SAY.pen), 700);
    return () => window.clearTimeout(t);
  }, [pen]);

  useEffect(() => {
    if (!feather || Date.now() - feather.firedAt > 12000) return;
    const t = window.setTimeout(() => useStudy.getState().say(SAY.feather), 2600);
    return () => window.clearTimeout(t);
  }, [feather]);

  return (
    <group>
      {items.map(def => (
        <Item key={def.id} def={def} />
      ))}
    </group>
  );
}

/** Called by the player controller when a tap lands on one of these. */
export function isDroppable(id: string): boolean {
  return id === STONE_ITEM_ID || id === PEN_ITEM || id === FEATHER_ITEM_ID;
}

export function dropEventFor(id: string): string {
  if (id === STONE_ITEM_ID) return STONE_DROPPED;
  if (id === PEN_ITEM) return PEN_DROPPED;
  return FEATHER_DROPPED;
}

export function fireDrop(id: string) {
  fireWorldEvent(dropEventFor(id));
}
