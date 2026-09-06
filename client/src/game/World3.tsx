// World 3 — the giant apple. Built the same way as World 1: one Canvas, a
// walkable arena, your own character with a follow camera, everyone else's
// characters interpolated from player_position, and the same touch/keyboard
// input. The apple sits in the middle and you walk around it.

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Arena } from './world3/Arena';
import { LocalPlayer } from './world3/LocalPlayer';
import { RemotePlayers } from './world3/RemotePlayers';
import { TouchInput } from './world1/TouchInput';
import { Hud } from './world3/Hud';
import { connectWorld } from './world1/sync';
import { useWorld, type CameraMode } from './world1/store';
import { grantWeapon, installAttackInput, resetCombat, training } from './world3/combat';
import { setDemo } from './world3/weapons';
import './world3/world3.css';

const SKY = '#2a1020'; // volcanic night behind the fire

export interface World3Props {
  roomCode: string;
  name?: string;
  forcedCamera?: CameraMode | null;
}

export default function World3({ roomCode, name = '', forcedCamera = null }: World3Props) {
  useEffect(() => connectWorld({ roomCode, name }), [roomCode, name]);

  useEffect(() => {
    // World 2 leaves training on. If it stays on, every hit here lands on a
    // practice dummy and the boss takes nothing.
    training.active = false;
    // The stage demo skips Newton, so hand over the three laws here and make
    // the apple a proper wall of a boss.
    const demo = new URLSearchParams(window.location.search).get('demo') === '1';
    setDemo(demo);
    resetCombat();
    if (demo) {
      grantWeapon('shield');
      grantWeapon('sword');
      grantWeapon('gun');
    }
    return installAttackInput();
  }, []);

  // Third person is the default everywhere, phone and laptop alike.
  useEffect(() => {
    useWorld.getState().setCameraMode(forcedCamera ?? 'third');
  }, [forcedCamera]);

  const isTouch = useWorld(s => s.isTouch);
  const mode = useWorld(s => s.cameraMode);

  return (
    <div className="world1 world3">
      <Canvas
        dpr={[1, isTouch ? 1 : 1.5]}
        shadows={!isTouch}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 82, near: 0.1, far: 900, position: [0, 5, 40] }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <color attach="background" args={[SKY]} />
        {/* warm light thrown up from the lava, cool almost-nothing from above */}
        <hemisphereLight args={['#ff8a5c', '#2a1020', 1.0]} />
        <fog attach="fog" args={[SKY, 120, 520]} />
        <Arena />
        <RemotePlayers />
        <LocalPlayer />
      </Canvas>
      {(isTouch || mode === 'third') && <TouchInput />}
      <Hud />
    </div>
  );
}
