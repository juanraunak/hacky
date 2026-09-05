// While Newton is talking the camera belongs to him: it swings round and holds
// on the man, so you are looking at him rather than at the back of your own
// head. It hands control back the moment he stops.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { NEWTON_SPOT } from './study';
import { newtonPos } from './StudyNewton';
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

    // Over the shoulder: sit behind the player on the line to Newton, so you
    // are always in shot in the foreground and he is in front of you. Sitting
    // between the two put the player behind the camera entirely.
    const dx = NEWTON_SPOT.x - local.x;
    const dz = newtonZ() - local.z;
    const d = Math.hypot(dx, dz) || 1;
    const backX = local.x - (dx / d) * 4.2;
    const backZ = local.z - (dz / d) * 4.2;

    want.current.set(backX, 2.6, backZ);
    camera.position.lerp(want.current, 1 - Math.exp(-dt * 3));
    // Aim a little past the player, toward Newton, so both are framed.
    camera.lookAt(local.x + dx * 0.45, 1.4, local.z + dz * 0.45);
  });

  return null;
}

function newtonZ(): number {
  return newtonPos.z || NEWTON_SPOT.z;
}

export default BriefCam;
