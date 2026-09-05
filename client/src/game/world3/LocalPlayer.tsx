// World 3's player is the universal rig, with jump and sprint switched on and
// the camera pulled back a little because the boss is enormous.

import { PlayerRig } from '../shared/PlayerRig';
import { HeldWeapon } from './HeldWeapon';
import { WALK_SPEED, groundHeight, resolveCollisions } from './layout';
import { RESPAWN_MS, cinematic, readCombat, respawnPlayer } from './combat';
import { SPAWN_RADIUS, applePos } from './layout';

export function LocalPlayer() {
  return (
    <PlayerRig
      ground={groundHeight}
      collide={resolveCollisions}
      walkSpeed={WALK_SPEED}
      distance={8.5}
      distancePortrait={10.5}
      frozen={() => cinematic.active}
      pitchMin={-0.35}
      pitchMax={1.2}
      isDead={() => readCombat().playerHp <= 0}
      onRespawn={() => {
        const c = readCombat();
        if (!c.playerDeadAt || performance.now() - c.playerDeadAt < RESPAWN_MS) return;
        // Drop back in on the far side of the arena from the boss.
        const away = Math.atan2(-applePos.z, -applePos.x) + (Math.random() - 0.5) * 1.2;
        const spot = resolveCollisions(Math.cos(away) * SPAWN_RADIUS, Math.sin(away) * SPAWN_RADIUS);
        respawnPlayer();
        return spot;
      }}

      allowJump
      allowSprint
    >
      <HeldWeapon />
    </PlayerRig>
  );
}

export default LocalPlayer;
