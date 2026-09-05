// Two objects that obey the laws, so the weapons mean something before the
// cellar. Neither is a target in a menu; they are things in the room.
//
//   The oak post   — a tapped blade slides off it. An accelerated one bites.
//                    Second law, felt rather than read.
//   The sandbag    — swings on a beam and keeps swinging. Set your feet and
//                    the forces cancel; don't and its momentum is now yours.
//                    First law, felt rather than read.
//
// The gun needs no target: the shove backwards is the whole third law, and it
// happens wherever you point it.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GEO, Part } from '../world1/toon';
import { DESK_WOOD, PORTAL_FRAME, STUDY_BEAM, STONE_ITEM, FUTURE_BOLT } from '../world1/palette';
import {
  PENDULUM,
  PENDULUM_ARM,
  PENDULUM_BOB_R,
  PENDULUM_PIVOT_Y,
  POST,
  POST_H,
  POST_R,
  pendulumAt,
} from './study';
import { FIGHT_DONE, useWorld } from '../world1/store';
import { bolts, postMarks } from './combat';

/** The oak post. Chips out of it are the only record you are keeping. */
function OakPost() {
  const marks = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = marks.current;
    if (!g) return;
    g.children.forEach((mark, i) => {
      mark.visible = i < postMarks.count;
    });
  });

  return (
    <group position={[POST.x, 0, POST.z]}>
      <Part
        geometry={GEO.cylinder}
        color={DESK_WOOD}
        position={[0, POST_H / 2, 0]}
        scale={[POST_R, POST_H, POST_R]}
        outline={0.05}
        receiveShadow
      />
      <Part
        geometry={GEO.cylinder}
        color={PORTAL_FRAME}
        position={[0, 0.09, 0]}
        scale={[POST_R + 0.22, 0.18, POST_R + 0.22]}
        outline={0.07}
        receiveShadow
      />
      <Part
        color={STUDY_BEAM}
        position={[0, POST_H + 0.1, 0]}
        scale={[POST_R * 2.4, 0.2, POST_R * 2.4]}
        outline={0.08}
      />
      {/* every charged swing takes a chip out of it */}
      <group ref={marks}>
        {Array.from({ length: 6 }, (_, i) => (
          <Part
            key={i}
            geometry={GEO.rock}
            color={STUDY_BEAM}
            position={[
              Math.cos(i * 1.9) * POST_R * 0.92,
              0.7 + i * 0.16,
              Math.sin(i * 1.9) * POST_R * 0.92,
            ]}
            rotation={[i, i * 1.4, 0]}
            scale={[0.16, 0.11, 0.1]}
            outline={0.12}
            castShadow={false}
            visible={false}
          />
        ))}
      </group>
    </group>
  );
}

/** A sandbag on a rope, hung off the ceiling beams. It has momentum and no
 *  opinion about you whatsoever. */
function Sandbag() {
  const arm = useRef<THREE.Group>(null);
  const done = useWorld(s => s.events[FIGHT_DONE]);

  useFrame(() => {
    const g = arm.current;
    if (!g || !done) return;
    const at = pendulumAt(performance.now() - done.receivedAt);
    // The rope hangs from the pivot to wherever the bag has swung to, so the
    // group is rotated about the pivot rather than moved to the bag.
    const angle = Math.atan2(at.x - PENDULUM.x, PENDULUM_PIVOT_Y - at.y);
    g.rotation.z = -angle;
  });

  if (!done) return null;

  return (
    <group>
      {/* the bracket it hangs from, tucked up against the ceiling */}
      <Part
        color={STUDY_BEAM}
        position={[PENDULUM.x, PENDULUM_PIVOT_Y + 0.22, PENDULUM.z]}
        scale={[0.7, 0.34, 0.7]}
        outline={0.08}
        castShadow={false}
      />
      <group ref={arm} position={[PENDULUM.x, PENDULUM_PIVOT_Y, PENDULUM.z]}>
        <Part
          color={DESK_WOOD}
          position={[0, -PENDULUM_ARM / 2, 0]}
          scale={[0.07, PENDULUM_ARM, 0.07]}
          outline={0.18}
          castShadow={false}
        />
        <Part
          geometry={GEO.sphere}
          color={STONE_ITEM}
          position={[0, -PENDULUM_ARM, 0]}
          scale={[PENDULUM_BOB_R, PENDULUM_BOB_R * 1.15, PENDULUM_BOB_R]}
          outline={0.07}
        />
        <Part
          color={STUDY_BEAM}
          position={[0, -PENDULUM_ARM + PENDULUM_BOB_R * 1.05, 0]}
          scale={[0.13, 0.2, 0.13]}
          outline={0.14}
          castShadow={false}
        />
      </group>
    </group>
  );
}

/** What the gun sends away from you, so you can see what shoved you back. */
function Bolts() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((mesh, i) => {
      const bolt = bolts[i];
      if (!bolt || !bolt.alive) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      mesh.position.set(bolt.x, bolt.y, bolt.z);
      mesh.rotation.set(0, bolt.heading, 0);
    });
  });

  return (
    <group ref={group}>
      {bolts.map((_, i) => (
        <Part
          key={i}
          color={FUTURE_BOLT}
          scale={[0.07, 0.07, 0.42]}
          outline={0.14}
          castShadow={false}
          visible={false}
        />
      ))}
    </group>
  );
}

export function Practice() {
  const done = useWorld(s => s.events[FIGHT_DONE]);
  const post = useMemo(() => <OakPost />, []);
  if (!done) return <Bolts />;
  return (
    <group>
      {post}
      <Sandbag />
      <Bolts />
    </group>
  );
}
