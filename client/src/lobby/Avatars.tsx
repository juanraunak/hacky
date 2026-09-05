// The lobby party strip. These are Ean's actual character rig and his actual
// look assignment, so the kid you see here is the kid you are in the meadow.
//
// One shared Canvas, not one per player: a WebGL context per avatar would blow
// the browser's context limit on a big party, and phones cap lower than desktop.

import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { Group } from 'three';
import { Kid, type KidAnim } from '../game/world1/Character';
import { lookFor } from '../game/world1/palette';

export interface AvatarPlayer {
  identity: string;
  connected: boolean;
}

const IDLE: KidAnim = { speed: 0 };

/** One slam in from 0.4 with overshoot, per ART-STYLE.md. Then it just idles. */
function Entrance({ children }: { children: React.ReactNode }) {
  const group = useRef<Group>(null);
  const t = useRef(0);

  useFrame((_state, delta) => {
    if (!group.current || t.current >= 1) return;
    t.current = Math.min(1, t.current + delta * 2.6);
    const p = t.current;
    // ease-out-back
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const eased = 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
    const s = 0.4 + 0.6 * eased;
    group.current.scale.setScalar(s);
  });

  return (
    <group ref={group} scale={0.4}>
      {children}
    </group>
  );
}

function Avatar({ identity, connected }: AvatarPlayer) {
  const look = useMemo(() => lookFor(identity), [identity]);
  const anim = useRef<KidAnim>(IDLE);
  return (
    <Entrance>
      <group rotation={[0, Math.PI, 0]} position={[0, connected ? 0 : -0.04, 0]}>
        <Kid look={look} anim={anim} />
      </group>
    </Entrance>
  );
}

function Row({ players }: { players: AvatarPlayer[] }) {
  const viewport = useThree(s => s.viewport);
  const count = Math.max(players.length, 1);
  // Keep them a sane size in a small party, and let them shrink in a big one.
  const slot = Math.min(viewport.width / count, 1.9);
  const span = slot * players.length;

  return (
    <group position={[0, -0.62, 0]}>
      {players.map((player, i) => (
        <group key={player.identity} position={[(i + 0.5) * slot - span / 2, 0, 0]}>
          <Avatar {...player} />
        </group>
      ))}
    </group>
  );
}

export function Avatars({ players }: { players: AvatarPlayer[] }) {
  return (
    <Canvas
      className="lobby-canvas"
      orthographic
      camera={{ position: [0, 0, 8], zoom: 78, near: 0.1, far: 40 }}
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true }}
    >
      <hemisphereLight args={['#ffffff', '#b08b5a', 1.2]} />
      <directionalLight position={[2.5, 5, 4]} intensity={1.15} />
      <Row players={players} />
    </Canvas>
  );
}

export default Avatars;
