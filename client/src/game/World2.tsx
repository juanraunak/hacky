// World 2 — Newton's study. Dim room, two candles, a drop test on the desk,
// then the portal and five waves of apples that all fall at the same rate.

import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { StudyRoom } from './world2/StudyRoom';
import { StudyNewton } from './world2/StudyNewton';
import { Notebook, Portal } from './world2/Portal';
import { DropTest } from './world2/DropTest';
import { Fight } from './world2/Fight';
import { StudyPlayer } from './world2/StudyPlayer';
import { StudyHud } from './world2/StudyHud';
import { TouchInput } from './world1/TouchInput';
import { RemotePlayers } from './world1/RemotePlayers';
import {
  PEN_DROPPED,
  PORTAL_OPEN,
  STONE_DROPPED,
  STUDY_ENTERED,
  useWorld,
} from './world1/store';
import { fireWorldEvent } from './world1/sync';
import { useStudy } from './world2/studyStore';
import { SAY } from './world2/story2';
import './world1/world1.css';
import './world2/world2.css';

const FLOOR = () => 0;

/** Newton's opening line, and the portal once the drop test is done. */
function StudyDirector() {
  const entered = useWorld(s => s.events[STUDY_ENTERED]);
  const stone = useWorld(s => s.events[STONE_DROPPED]);
  const pen = useWorld(s => s.events[PEN_DROPPED]);
  const portal = useWorld(s => s.events[PORTAL_OPEN]);

  useEffect(() => {
    if (!entered || Date.now() - entered.firedAt > 15000) return;
    const t = window.setTimeout(() => useStudy.getState().say(SAY.entry), 1200);
    return () => window.clearTimeout(t);
  }, [entered]);

  // The portal waits for the stone and the pen. The feather is not part of it.
  useEffect(() => {
    if (!stone || !pen || portal) return;
    const say = window.setTimeout(() => useStudy.getState().say(SAY.lockedTheDoor), 2600);
    const open = window.setTimeout(() => fireWorldEvent(PORTAL_OPEN), 6200);
    return () => {
      window.clearTimeout(say);
      window.clearTimeout(open);
    };
  }, [stone, pen, portal]);

  // It comes up behind the party, so he tells them to turn round.
  useEffect(() => {
    if (!portal || Date.now() - portal.firedAt > 18000) return;
    const look = window.setTimeout(() => useStudy.getState().say(SAY.lookBehind), 600);
    const knew = window.setTimeout(() => useStudy.getState().say(SAY.thatsNew), 5200);
    return () => {
      window.clearTimeout(look);
      window.clearTimeout(knew);
    };
  }, [portal]);

  return null;
}

export default function World2() {
  const isTouch = useWorld(s => s.isTouch);
  const mode = useWorld(s => s.cameraMode);

  return (
    <div className="world1 world2">
      <Canvas
        dpr={[1, 1.5]}
        shadows
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
          shadow-mapSize={[1024, 1024]}
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
        <DropTest />
        <Fight />
        <RemotePlayers groundY={FLOOR} />
        <StudyPlayer />
        <StudyDirector />
      </Canvas>
      {(isTouch || mode === 'third') && <TouchInput />}
      <StudyHud />
    </div>
  );
}
