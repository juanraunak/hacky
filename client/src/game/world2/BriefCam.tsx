// While Newton is talking the camera belongs to him: it swings round and holds
// on the man, so you are looking at him rather than at the back of your own
// head. It hands control back the moment he stops.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NEWTON_SPOT } from './study';
import { local } from '../world1/local';
import { briefing } from './briefState';

export function BriefCam() {
  const { camera } = useThree();
  const held = useRef(false);
  const want = useRef(new THREE.Vector3());

  useEffect(() => () => {
    held.current = false;
  }, []);

  useFrame((_s, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (!briefing.active) {
      held.current = false;
      return;
    }
    held.current = true;
    // Not a lock: you keep running. The camera simply leans toward Newton so
    // he stays in frame while he is talking, then lets go entirely.
    want.current.set(
      local.x * 0.55 + (NEWTON_SPOT.x + 1.2) * 0.45,
      2.15,
      local.z * 0.55 + (NEWTON_SPOT.z + 4.2) * 0.45
    );
    camera.position.lerp(want.current, 1 - Math.exp(-dt * 2.2));
    camera.lookAt(
      (NEWTON_SPOT.x + local.x) / 2,
      1.45,
      (NEWTON_SPOT.z + local.z) / 2
    );
  });

  return null;
}

export default BriefCam;
