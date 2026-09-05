// World 2's player is the universal rig. The study is one flat room, so it
// spawns you immediately and collides with the walls; everything else -- the
// movement, the camera, the touch feel -- is shared with every other world.

import { PlayerRig } from '../shared/PlayerRig';
import { HeldWeapon } from '../world3/HeldWeapon';
import { WALK_SPEED, resolveStudy } from './study';
import { briefing } from './briefState';
import { useWorld } from '../world1/store';

const FLAT = () => 0;

export function StudyPlayer() {
  // Re-read every frame is not needed: BriefCam sets this flag and the rig
  // checks it on the frame it renders.
  void useWorld(s => s.identity);

  return (
    <PlayerRig
      ground={FLAT}
      collide={resolveStudy}
      walkSpeed={WALK_SPEED}
      spawnAt={{ x: 0, z: 4, heading: Math.PI }}
      distance={4.6}
      distancePortrait={5.6}
      clampCamera={(x, y, z) => {
        // The study is 20 x 16 with a low ceiling, so the camera has to stay
        // in the room or you end up looking through a wall.
        const inside = resolveStudy(x, z);
        return { x: inside.x, y: Math.min(y, 4.2), z: inside.z };
      }}
      cameraTakenOver={() => briefing.active}
    >
      <HeldWeapon />
    </PlayerRig>
  );
}

export default StudyPlayer;
