// Five waves of apples out of the portal.
//
// Every apple, small or big, is in the air for exactly the same time. The big
// ones look like they are arriving first because they are bigger, and they
// are not. That is the entire lesson and nothing in the game says it out loud
// except one line in the notebook after the second wave, which the Director
// writes.
//
// One client in the room conducts: it decides the wave and inserts the rows.
// The conductor is simply whoever has the lowest identity, so there is no
// election, and if they leave the next one picks it up on the following frame.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part } from '../world1/toon';
import { APPLE, APPLE_STEM, LEAF } from '../world1/palette';
import {
  FLIGHT_MS,
  HIT_CEILING,
  HIT_RADIUS,
  PORTAL_MOUTH,
  SPAWN_GAP_MS,
  WAVE_GAP_MS,
  WAVE_SIZES,
  appleAt,
  appleRadius,
  resolveStudy,
} from './study';
import {
  FIGHT_DONE,
  FIGHT_READY,
  PORTAL_OPEN,
  useWorld,
  type Apple,
} from '../world1/store';
import { fireWorldEvent, killApple, spawnWave, type AppleSpec } from '../world1/sync';
import { local } from '../world1/local';
import { useStudy } from './studyStore';
import { THRICE } from './story2';
import { thud } from './sound';

const SIZES = ['small', 'big', 'medium', 'big', 'small', 'medium'];
/** How long a burst apple keeps showing its particles. */
const BURST_MS = 520;
const MAX_ON_SCREEN = 12;

function useConductor(): boolean {
  const identity = useWorld(s => s.identity);
  const party = useWorld(s => Object.keys(s.party).filter(id => s.party[id].connected).sort().join(','));
  return useMemo(() => {
    if (!identity) return false;
    const ids = party ? party.split(',') : [];
    return ids.length === 0 ? true : ids[0] === identity;
  }, [identity, party]);
}

/** Plans one wave: who each apple is thrown at, how big, and when. */
function planWave(wave: number, targets: { id: string; x: number; z: number }[]): AppleSpec[] {
  const count = WAVE_SIZES[wave - 1] ?? 3;
  const specs: AppleSpec[] = [];
  for (let i = 0; i < count; i++) {
    // Round-robin the party rather than picking the single nearest, so the
    // whole room is in the fight and not just whoever stood closest.
    const t = targets[i % targets.length];
    const jitterX = (((i * 37 + wave * 11) % 13) / 13 - 0.5) * 1.6;
    const jitterZ = (((i * 53 + wave * 7) % 11) / 11 - 0.5) * 1.4;
    const spot = resolveStudy(t.x + jitterX, t.z + jitterZ);
    specs.push({
      seq: i,
      size: SIZES[(i + wave) % SIZES.length],
      target: t.id,
      fromX: PORTAL_MOUTH.x + (((i * 29) % 7) / 7 - 0.5) * 2.0,
      fromY: PORTAL_MOUTH.y,
      fromZ: PORTAL_MOUTH.z,
      toX: spot.x,
      toZ: spot.z,
      delayMs: Math.round(i * SPAWN_GAP_MS),
    });
  }
  return specs;
}

function AppleMesh({ radius }: { radius: number }) {
  return (
    <group scale={radius / 0.3}>
      <Part geometry={GEO.sphere} color={APPLE} scale={[0.3, 0.28, 0.3]} outline={0.07} />
      <Part
        geometry={GEO.cylinder}
        color={APPLE_STEM}
        position={[0, 0.3, 0]}
        scale={[0.03, 0.16, 0.03]}
        outline={0.3}
        castShadow={false}
      />
      <Part
        geometry={GEO.sphereLow}
        color={LEAF}
        position={[0.11, 0.33, 0]}
        rotation={[0, 0, -0.5]}
        scale={[0.13, 0.04, 0.07]}
        outline={0.16}
        castShadow={false}
      />
    </group>
  );
}

function FlyingApple({ apple }: { apple: Apple }) {
  const group = useRef<THREE.Group>(null);
  const burst = useRef<THREE.Group>(null);
  const radius = appleRadius(apple.size);
  const deadAt = useRef<number | null>(null);

  useFrame(({ clock }) => {
    const g = group.current;
    const b = burst.current;
    if (!g || !b) return;
    const ms = performance.now() - apple.spawnAt;

    if (apple.dead) {
      if (deadAt.current == null) deadAt.current = performance.now();
      const since = performance.now() - deadAt.current;
      g.visible = false;
      b.visible = since < BURST_MS;
      if (b.visible) {
        const k = since / BURST_MS;
        const at = appleAt(apple.from, apple.to, ms);
        b.position.set(at.x, at.y, at.z);
        b.children.forEach((bit, i) => {
          const a = (i / b.children.length) * Math.PI * 2;
          const lift = Math.sin(a * 2.3) * 0.5 + 0.6;
          bit.position.set(Math.cos(a) * k * 1.5, lift * k * 1.3 - k * k * 1.6, Math.sin(a) * k * 1.5);
          bit.scale.setScalar(Math.max(0.001, (1 - k) * radius * 0.7));
          bit.rotation.set(k * 6 + i, k * 4, 0);
        });
      }
      return;
    }

    deadAt.current = null;
    b.visible = false;
    if (ms < 0 || ms > FLIGHT_MS + 260) {
      g.visible = false;
      return;
    }
    const at = appleAt(apple.from, apple.to, ms);
    g.visible = true;
    g.position.set(at.x, Math.max(radius, at.y), at.z);
    g.rotation.set(clock.elapsedTime * 2.2 + apple.seq, apple.seq, 0);
  });

  return (
    <group>
      <group ref={group}>
        <AppleMesh radius={radius} />
      </group>
      <group ref={burst} visible={false}>
        {Array.from({ length: 9 }, (_, i) => (
          <Part
            key={i}
            geometry={GEO.rock}
            color={i % 3 === 0 ? LEAF : APPLE}
            scale={0.1}
            outline={0.1}
            castShadow={false}
          />
        ))}
      </group>
    </group>
  );
}

export function Fight() {
  const apples = useWorld(s => s.apples);
  const portal = useWorld(s => s.events[PORTAL_OPEN]);
  const ready = useWorld(s => s.events[FIGHT_READY]);
  const done = useWorld(s => s.events[FIGHT_DONE]);
  const identity = useWorld(s => s.identity);
  const isConductor = useConductor();

  const lastSwing = useRef(0);
  const clearedAt = useRef<Record<number, number>>({});
  const thumped = useRef<Set<string>>(new Set());
  const saidThrice = useRef(false);

  // Only apples still worth drawing, capped so a stalled client cannot end up
  // rendering a hundred of them.
  const live = useMemo(() => {
    const now = performance.now();
    return Object.values(apples)
      .filter(a => now - a.spawnAt < FLIGHT_MS + BURST_MS + 400 && now - a.spawnAt > -8000)
      .sort((a, b) => a.spawnAt - b.spawnAt)
      .slice(0, MAX_ON_SCREEN);
  }, [apples]);

  useFrame(() => {
    const store = useWorld.getState();
    const study = useStudy.getState();
    const fighting = !!portal && !!ready && !done;

    // --- your swing --------------------------------------------------
    if (study.swingAt !== lastSwing.current) {
      lastSwing.current = study.swingAt;
      if (fighting) {
        let best: Apple | null = null;
        let bestD = HIT_RADIUS;
        for (const apple of Object.values(store.apples)) {
          if (apple.dead) continue;
          const ms = performance.now() - apple.spawnAt;
          if (ms < 0 || ms > FLIGHT_MS) continue;
          const at = appleAt(apple.from, apple.to, ms);
          if (at.y > HIT_CEILING) continue;
          const d = Math.hypot(at.x - local.x, at.z - local.z);
          if (d < bestD) {
            bestD = d;
            best = apple;
          }
        }
        if (best) {
          killApple(best.id);
          study.markHit();
          store.shake(0.09, 200);
          thud(1.4);
        }
      }
    }

    // --- apples that got through --------------------------------------
    if (fighting) {
      for (const apple of Object.values(store.apples)) {
        if (apple.dead || thumped.current.has(apple.id)) continue;
        const ms = performance.now() - apple.spawnAt;
        if (ms < FLIGHT_MS) continue;
        thumped.current.add(apple.id);
        const d = Math.hypot(apple.to.x - local.x, apple.to.z - local.z);
        if (d > HIT_RADIUS + 0.3) continue;
        // It thumps you: a bigger shake and half a unit backwards.
        store.shake(0.3, 460);
        thud(1);
        const away = Math.hypot(local.x - apple.to.x, local.z - apple.to.z) || 1;
        const moved = resolveStudy(
          local.x + ((local.x - apple.to.x) / away) * 0.5,
          local.z + ((local.z - apple.to.z) / away) * 0.5
        );
        local.x = moved.x;
        local.z = moved.z;
        const times = study.markThump();
        if (times >= 3 && !saidThrice.current) {
          saidThrice.current = true;
          study.say(...THRICE.lines);
        }
      }
    }

    // --- conducting the waves -----------------------------------------
    if (!isConductor || !portal || !ready || done) return;

    const all = Object.values(store.apples);
    const wave = all.reduce((max, a) => Math.max(max, a.wave), 0);

    if (wave === 0) {
      startWave(1, store);
      return;
    }

    const thisWave = all.filter(a => a.wave === wave);
    const spentAll = thisWave.every(
      a => a.dead || performance.now() - a.spawnAt > FLIGHT_MS + 500
    );
    if (!spentAll) return;

    if (!clearedAt.current[wave]) {
      clearedAt.current[wave] = performance.now();
      return;
    }
    if (performance.now() - clearedAt.current[wave] < WAVE_GAP_MS) return;

    if (wave >= WAVE_SIZES.length) fireWorldEvent(FIGHT_DONE);
    else startWave(wave + 1, store);
  });

  if (!identity) return null;

  return (
    <group>
      {live.map(apple => (
        <FlyingApple key={apple.id} apple={apple} />
      ))}
    </group>
  );
}

function startWave(wave: number, store: ReturnType<typeof useWorld.getState>) {
  const targets: { id: string; x: number; z: number }[] = [];
  for (const [id, member] of Object.entries(store.party)) {
    if (!member.connected) continue;
    const p = id === store.identity ? { x: local.x, z: local.z } : store.positions[id];
    if (p) targets.push({ id, x: p.x, z: p.z });
  }
  if (targets.length === 0 && store.identity) {
    targets.push({ id: store.identity, x: local.x, z: local.z });
  }
  if (targets.length === 0) return;
  spawnWave(wave, planWave(wave, targets));
}
