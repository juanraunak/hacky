// The kid rig: big head, short body, big hands and feet, spiky hair, jacket,
// scarf with a tail that swings. Every player is this rig with a different
// jacket and hair colour. Origin at the feet, facing +z.

import { useRef, type RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { GEO, Part } from './toon';
import { EYE, SCARF, SHOE, SKIN, TROUSER, type Look } from './palette';
import { AppleMesh } from './AppleMesh';
import { APPLE_ITEM } from './store';

export interface KidAnim {
  /** 0 standing, 1 walking at full speed. */
  speed: number;
}

export interface KidProps {
  look: Look;
  anim: RefObject<KidAnim>;
  /** First person: hide the head so the camera is not inside it. */
  headless?: boolean;
  holding?: string | null;
}

const HAIR: [number, number, number, number, number][] = [
  // x, y, z, tiltX, tiltZ
  [0, 0.8, 0, 0, 0],
  [0.2, 0.74, 0.06, 0.1, -0.55],
  [-0.2, 0.74, 0.06, 0.1, 0.55],
  [0.12, 0.7, -0.24, -0.6, -0.25],
  [-0.12, 0.7, -0.24, -0.6, 0.25],
  [0.02, 0.68, 0.27, 0.6, 0],
];

export function Kid({ look, anim, headless = false, holding = null }: KidProps) {
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const body = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const speed = anim.current?.speed ?? 0;
    const swing = Math.sin(t * 9) * 0.7 * speed;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8;
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.8 - (holding ? 0.9 : 0);
    if (body.current) {
      body.current.position.y = Math.abs(Math.sin(t * 9)) * 0.06 * speed + Math.sin(t * 2) * 0.008;
    }
    if (tail.current) {
      tail.current.rotation.x = 0.25 + Math.sin(t * 4.2) * 0.25 + speed * 0.7;
      tail.current.rotation.z = Math.sin(t * 3.1) * 0.15;
    }
  });

  return (
    <group>
      {/* legs */}
      <group ref={leftLeg} position={[0.16, 0.56, 0]}>
        <Part color={TROUSER} position={[0, -0.28, 0]} scale={[0.22, 0.5, 0.24]} />
        <Part color={SHOE} position={[0, -0.5, 0.06]} scale={[0.28, 0.17, 0.4]} outline={0.07} />
      </group>
      <group ref={rightLeg} position={[-0.16, 0.56, 0]}>
        <Part color={TROUSER} position={[0, -0.28, 0]} scale={[0.22, 0.5, 0.24]} />
        <Part color={SHOE} position={[0, -0.5, 0.06]} scale={[0.28, 0.17, 0.4]} outline={0.07} />
      </group>

      <group ref={body}>
        {/* jacket */}
        <Part color={look.jacket} position={[0, 0.9, 0]} scale={[0.66, 0.64, 0.42]} />
        {/* arms, pivot at the shoulder */}
        <group ref={leftArm} position={[0.43, 1.14, 0]}>
          <Part color={look.jacket} position={[0, -0.26, 0]} scale={[0.2, 0.5, 0.2]} />
          <Part geometry={GEO.sphere} color={SKIN} position={[0, -0.56, 0]} scale={0.14} outline={0.08} />
        </group>
        <group ref={rightArm} position={[-0.43, 1.14, 0]}>
          <Part color={look.jacket} position={[0, -0.26, 0]} scale={[0.2, 0.5, 0.2]} />
          <Part geometry={GEO.sphere} color={SKIN} position={[0, -0.56, 0]} scale={0.14} outline={0.08} />
          {holding === APPLE_ITEM && (
            <group position={[0, -0.62, 0.16]}>
              <AppleMesh />
            </group>
          )}
        </group>
        {/* scarf */}
        <Part
          geometry={GEO.torus}
          color={SCARF}
          position={[0, 1.25, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={0.3}
          outline={0.08}
        />
        <group ref={tail} position={[0.08, 1.24, -0.2]}>
          <Part color={SCARF} position={[0, -0.28, 0]} scale={[0.18, 0.52, 0.07]} outline={0.08} />
        </group>

        {/* head */}
        {!headless && (
          <group position={[0, 1.3, 0]}>
            <Part geometry={GEO.sphere} color={SKIN} position={[0, 0.38, 0]} scale={0.4} />
            <Part
              geometry={GEO.sphereLow}
              color={EYE}
              position={[0.14, 0.42, 0.36]}
              scale={[0.06, 0.09, 0.03]}
              outline={0}
              castShadow={false}
            />
            <Part
              geometry={GEO.sphereLow}
              color={EYE}
              position={[-0.14, 0.42, 0.36]}
              scale={[0.06, 0.09, 0.03]}
              outline={0}
              castShadow={false}
            />
            {HAIR.map(([x, y, z, tx, tz], i) => (
              <Part
                key={i}
                geometry={GEO.cone}
                color={look.hair}
                position={[x, y, z]}
                rotation={[tx, 0, tz]}
                scale={[0.15, 0.46, 0.15]}
                outline={0.09}
              />
            ))}
          </group>
        )}
      </group>
    </group>
  );
}
