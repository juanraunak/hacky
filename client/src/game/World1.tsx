// World 1 — Newton's tree. One meadow, one tree, Newton against it, the
// party already standing there, and an apple that falls once.

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { Meadow } from './world1/Meadow';
import { Newton } from './world1/Newton';
import { Apple } from './world1/Apple';
import { LocalPlayer } from './world1/LocalPlayer';
import { RemotePlayers } from './world1/RemotePlayers';
import { ThoughtBubble } from './world1/ThoughtBubble';
import { LeafPuffs } from './world1/LeafPuff';
import { TouchInput } from './world1/TouchInput';
import { Hud } from './world1/Hud';
import { connectWorld } from './world1/sync';
import { useWorld, type CameraMode } from './world1/store';
import { SKY } from './world1/palette';
import './world1/world1.css';

export interface World1Props {
  roomCode: string;
  /** Display name. Empty means "make one up from the identity". */
  name?: string;
  /** Demo helper: forget the apple on entry so it can fall again. */
  resetOnEntry?: boolean;
  forcedCamera?: CameraMode | null;
}

export default function World1({
  roomCode,
  name = '',
  resetOnEntry = false,
  forcedCamera = null,
}: World1Props) {
  useEffect(() => connectWorld({ roomCode, name, reset: resetOnEntry }), [roomCode, name, resetOnEntry]);

  useEffect(() => {
    if (forcedCamera) useWorld.getState().setCameraMode(forcedCamera);
  }, [forcedCamera]);

  const isTouch = useWorld(s => s.isTouch);
  const mode = useWorld(s => s.cameraMode);

  return (
    <div className="world1">
      <Canvas
        dpr={[1, 1.5]}
        shadows
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 60, near: 0.1, far: 260, position: [0, 4, 20] }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <color attach="background" args={[SKY]} />
        <hemisphereLight args={['#bfe6ff', '#4f8f3a', 0.95]} />
        <Meadow />
        <Newton />
        <Apple />
        <RemotePlayers />
        <LocalPlayer />
        <ThoughtBubble />
        <LeafPuffs />
      </Canvas>
      {(isTouch || mode === 'third') && <TouchInput />}
      <Hud />
    </div>
  );
}
