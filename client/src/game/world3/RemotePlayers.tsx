// Everyone else in the room. Positions come from the player_position rows at
// ~10 Hz; each character lerps toward its latest row, never snaps. Name tags
// float above them (not above you).

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { Group } from 'three';
import { Kid, type KidAnim } from '../world1/Character';
import { lookFor } from '../world1/palette';
import { WALK_SPEED, groundHeight } from './layout';
import { useWorld } from '../world1/store';

function angleLerp(a: number, b: number, k: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

function RemoteKid({ id, name }: { id: string; name: string }) {
  const group = useRef<Group>(null);
  const anim = useRef<KidAnim>({ speed: 0 });
  const look = useMemo(() => lookFor(id), [id]);
  const holding = useWorld(s => s.held[id] ?? null);
  const cur = useRef<{ x: number; z: number; h: number; ready: boolean }>({
    x: 0,
    z: 0,
    h: 0,
    ready: false,
  });

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = useWorld.getState().positions[id];
    const g = group.current;
    if (!p || !g) return;
    const c = cur.current;
    if (!c.ready) {
      c.x = p.x;
      c.z = p.z;
      c.h = p.heading;
      c.ready = true;
    }
    const k = 1 - Math.exp(-dt * 9);
    const nx = c.x + (p.x - c.x) * k;
    const nz = c.z + (p.z - c.z) * k;
    const moved = Math.hypot(nx - c.x, nz - c.z) / Math.max(dt, 1e-4);
    const target = Math.min(1, moved / WALK_SPEED);
    anim.current.speed += (target - anim.current.speed) * (1 - Math.exp(-dt * 10));
    c.x = nx;
    c.z = nz;
    c.h = angleLerp(c.h, p.heading, 1 - Math.exp(-dt * 12));
    g.position.set(nx, groundHeight(nx, nz), nz);
    g.rotation.y = c.h;
  });

  return (
    <group ref={group}>
      <Kid look={look} anim={anim} holding={holding} />
      <Html position={[0, 2.45, 0]} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <div className="nametag">{name}</div>
      </Html>
    </group>
  );
}

export function RemotePlayers() {
  // Membership only; per-frame positions are read straight from the store.
  const ids = useWorld(s => {
    const out: string[] = [];
    for (const id of Object.keys(s.positions)) {
      if (id === s.identity) continue;
      if (!s.party[id]?.connected) continue;
      out.push(id);
    }
    return out.sort().join(',');
  });
  const party = useWorld(s => s.party);
  if (!ids) return null;
  return (
    <group>
      {ids.split(',').map(id => (
        <RemoteKid key={id} id={id} name={party[id]?.name ?? ''} />
      ))}
    </group>
  );
}
