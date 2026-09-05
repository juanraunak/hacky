// World 3 — a bounded party arena. The only authoritative combat datum here
// is the monster row's hp; all tools continue to pass through net.swing so
// content/newton.json remains the source of teaching truth.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Controls, type Vec } from '../controls/Controls';
import { net } from '../net';
import { Kid, type KidAnim } from './world1/Character';
import { lookFor } from './world1/palette';
import { GEO, Part } from './world1/toon';
import './world3.css';

const APPLE_HP = 360;
const IDLE: KidAnim = { speed: 0 };

function AngryApple() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.position.y = 1.9 + Math.sin(clock.elapsedTime * 2) * 0.16;
    group.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * 0.04;
  });
  return (
    <group ref={group} position={[0, 1.9, -8]} scale={2.8}>
      <Part geometry={GEO.sphere} color="#ff4d4d" scale={[1, 1.05, .76]} />
      <Part geometry={GEO.cone} color="#5a3a1e" position={[0, 1.05, 0]} scale={[.15, .42, .15]} outline={.08} />
      <Part geometry={GEO.sphereLow} color="#4be36b" position={[.32, 1.05, 0]} rotation={[0, 0, -.55]} scale={[.37, .12, .19]} />
      <Part geometry={GEO.sphereLow} color="#111" position={[-.32, .2, .72]} rotation={[0, 0, -.38]} scale={[.15, .08, .03]} outline={0} />
      <Part geometry={GEO.sphereLow} color="#111" position={[.32, .2, .72]} rotation={[0, 0, .38]} scale={[.15, .08, .03]} outline={0} />
      <Part geometry={GEO.torus} color="#111" position={[0, -.3, .72]} rotation={[0, 0, Math.PI]} scale={[.28, .16, .06]} outline={0} />
      <Volley />
    </group>
  );
}

function Volley() {
  const swarm = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (swarm.current) swarm.current.rotation.y = clock.elapsedTime * .8;
  });
  return (
    <group ref={swarm}>
      {[0, 1, 2, 3, 4].map(i => {
        const angle = (i / 5) * Math.PI * 2;
        return <Part key={i} geometry={GEO.sphere} color="#ff4d4d" position={[Math.cos(angle) * 2.3, Math.sin(angle * 2) * .55, Math.sin(angle) * .8]} scale={.18} />;
      })}
    </group>
  );
}

function Crater() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[24, 48]} /><meshToonMaterial color="#5b3a4d" />
      </mesh>
      <mesh position={[0, -.08, -8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[7.2, 40]} /><meshToonMaterial color="#ff8c3a" />
      </mesh>
      {[-18, -12, 12, 18].map((x, i) => <Part key={x} geometry={GEO.cone} color={i % 2 ? '#3b2743' : '#4e3153'} position={[x, 5, -17]} scale={[6, 10, 6]} />)}
      <Part geometry={GEO.cone} color="#4a2944" position={[0, 7, -22]} scale={[8, 13, 8]} />
      <Part geometry={GEO.cone} color="#ff4d4d" position={[0, 10.5, -22]} scale={[2.5, 4.5, 2.5]} />
    </>
  );
}

function Party({ players }: { players: ReturnType<typeof net.players> }) {
  return <>{players.map((player, i) => <PartyKid key={player.identity} identity={player.identity} x={player.x || (i - players.length / 2) * 2} y={player.y || 4} />)}</>;
}
function PartyKid({ identity, x, y }: { identity: string; x: number; y: number }) {
  const anim = useRef<KidAnim>(IDLE);
  return <group position={[x * .12, 0, Math.max(-1, Math.min(6, y * .08))]} rotation={[0, Math.PI, 0]}><Kid look={lookFor(identity)} anim={anim} /></group>;
}

export default function World3({ version }: { version: number }) {
  void version;
  const players = net.players().filter(p => p.connected);
  const boss = net.monsters()[0];
  const mine = net.players().find(p => p.identity === net.identity());
  const [input, setInput] = useState<Vec>({ x: 0, y: 0 });
  const [, setLocal] = useState(() => ({ x: mine?.x ?? 0, y: mine?.y ?? 4 }));
  const tools = mine?.tools ?? [];
  const hp = Math.max(0, boss?.hp ?? APPLE_HP);

  useEffect(() => {
    if (!mine) return;
    setLocal({ x: mine.x, y: mine.y });
  }, [mine?.x, mine?.y]);
  useEffect(() => {
    if (!input.x && !input.y) return;
    const timer = window.setInterval(() => {
      setLocal(current => {
        const next = { x: Math.max(-48, Math.min(48, current.x + input.x * 2.5)), y: Math.max(-48, Math.min(48, current.y + input.y * 2.5)) };
        net.callReducer('setPosition', next.x, next.y);
        return next;
      });
    }, 80);
    return () => window.clearInterval(timer);
  }, [input.x, input.y]);
  const attack = useCallback((slot: number) => {
    const tool = tools[slot];
    if (boss && tool) net.callReducer('swing', boss.id, tool);
  }, [boss, tools]);
  const percent = Math.round((hp / APPLE_HP) * 100);
  const toolNames = useMemo(() => tools.slice(0, 4), [tools]);

  return <main className="world3">
    <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 55, position: [0, 10, 16] }}>
      <color attach="background" args={['#141426']} />
      <hemisphereLight args={['#a3b0ff', '#351b28', 1.1]} /><directionalLight position={[4, 11, 5]} intensity={1.7} castShadow color="#ffb03a" />
      <Crater /><AngryApple /><Party players={players} />
    </Canvas>
    <section className="boss-hud" aria-label="Giant Apple health"><h1>THE GIANT APPLE</h1><div className="boss-track"><i style={{ width: `${percent}%` }} /></div><b>{hp} / {APPLE_HP}</b></section>
    <div className="world3-copy">Dodge the falling apples. Find what makes the giant one move.</div>
    <div className="world3-tools">{toolNames.map((tool, i) => <span key={tool}>{i + 1}</span>)}</div>
    <Controls onInput={setInput} onAction={attack} />
  </main>;
}
