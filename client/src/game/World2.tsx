// World 2 — Newton's study. Dim room, two candles, a drop test on the desk,
// then the portal and five waves of apples that all fall at the same rate.

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { StudyRoom } from './world2/StudyRoom';
import { StudyNewton } from './world2/StudyNewton';
import { Notebook, Portal } from './world2/Portal';
import { StudyPlayer } from './world2/StudyPlayer';
import { StudyHud } from './world2/StudyHud';
import { Briefing } from './world2/Briefing';
import { TouchWeapons } from './world2/TouchWeapons';
import { BriefCam } from './world2/BriefCam';
import { Dummies } from './world2/Dummies';
import { MeleeRing } from '../game/world3/MeleeRing';
import { ShotsView } from '../game/world3/ShotsView';
import { TouchInput } from './world1/TouchInput';
import { RemotePlayers } from './world1/RemotePlayers';
import { useWorld } from './world1/store';
import './world1/world1.css';
import './world2/world2.css';

const FLOOR = () => 0;

export default function World2() {
  // Third person everywhere, phone and laptop alike, same as World 3.
  useEffect(() => {
    useWorld.getState().setCameraMode('third');
  }, []);

  const isTouch = useWorld(s => s.isTouch);
  const mode = useWorld(s => s.cameraMode);

  return (
    <div className="world1 world2">
      <Canvas
        dpr={[1, isTouch ? 1 : 1.5]}
        shadows={!isTouch}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        camera={{ fov: 62, near: 0.1, far: 90, position: [0, 3, 6] }}
        onCreated={({ gl }) => {
          gl.shadowMap.type = THREE.PCFShadowMap;
          gl.toneMapping = THREE.NoToneMapping;
        }}
      >
        <color attach="background" args={['#17120f']} />
        {/* Dim fill, plus one shadow-casting light for shape. The candles do
            the rest, and they are the only thing that moves the light. */}
        <hemisphereLight args={['#4a4258', '#1d1712', 0.5]} />
        <directionalLight
          castShadow
          position={[4, 9, 4]}
          intensity={0.72}
          color="#ffd9a8"
          shadow-mapSize={isTouch ? [512, 512] : [1024, 1024]}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-camera-near={1}
          shadow-camera-far={30}
          shadow-bias={-0.0008}
          shadow-normalBias={0.03}
        />
        <StudyRoom />
        <StudyNewton />
        <Notebook />
        <Portal />
        <RemotePlayers groundY={FLOOR} />
        <StudyPlayer />
        <BriefCam />
        <Dummies />
        <MeleeRing />
        <ShotsView />
      </Canvas>
      {(isTouch || mode === 'third') && <TouchInput />}
      <StudyHud />
      <Briefing />
      {isTouch && <TouchWeapons />}
    </div>
  );
}
