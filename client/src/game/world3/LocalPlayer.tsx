// World 3's player is the universal rig, with jump and sprint switched on and
// the camera pulled back a little because the boss is enormous.

import { PlayerRig } from '../shared/PlayerRig';
import { HeldWeapon } from './HeldWeapon';
import { WALK_SPEED, groundHeight, resolveCollisions } from './layout';
import { cinematic } from './combat';

export function LocalPlayer() {
  return (
    <PlayerRig
      ground={groundHeight}
      collide={resolveCollisions}
      walkSpeed={WALK_SPEED}
      distance={8.5}
      distancePortrait={10.5}
      frozen={() => cinematic.active}

      allowJump
      allowSprint
    >
      <HeldWeapon />
    </PlayerRig>
  );
}

export default LocalPlayer;
