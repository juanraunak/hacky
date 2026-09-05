// The three laws. The player never picks "a sword" — they pick a law, and the
// boss's current state decides which law is the answer.
//
//   1st law / INERTIA        the shield. Brace and the net force is zero, so
//                            you do not move. A charge that hits a braced
//                            player rebounds off its own momentum.
//   2nd law / F = ma         the sword. Damage is mass times how hard you
//                            accelerated the blade, so a charged swing bites
//                            and a limp one does not.
//   3rd law / ACTION-REACTION the gun. The shot drives forward and drives you
//                            back exactly as hard.

export type WeaponId = 'shield' | 'sword' | 'gun';
export type Effect = 'strong' | 'weak' | 'none';

/**
 * The boss cycles through these, and the cycle is the lesson:
 *
 *   CHARGING  it builds momentum and runs you down. Only bracing stops mass
 *             in motion; cutting and shooting do nothing to it.
 *   STUNNED   it rebounded off a braced player and is on the floor, dazed.
 *             Now, and only now, a heavy swing gets through.
 *   AIRBORNE  it lifts out of melee reach and shells you from above. Nothing
 *             you swing can touch it; only a shot reaches.
 */
export type BossMode = 'charging' | 'stunned' | 'airborne';

export const LAWS: {
  id: WeaponId;
  law: string;
  short: string;
  glyph: string;
}[] = [
  { id: 'shield', law: '1st LAW', short: 'INERTIA', glyph: 'I' },
  { id: 'sword', law: '2nd LAW', short: 'F = ma', glyph: 'II' },
  { id: 'gun', law: '3rd LAW', short: 'ACTION / REACTION', glyph: 'III' },
];

/**
 * The boss has three abilities and each one IS a law. It says what it is doing
 * out loud, in physics, because hearing the law while it is being used to hurt
 * you is the lesson. It never says what beats it.
 */
export const ABILITY_NAME: Record<BossMode, string> = {
  charging: 'UNSTOPPABLE',
  stunned: 'CRUSHING WEIGHT',
  airborne: 'RECOIL VOLLEY',
};

export const BOSS_LINE: Record<BossMode, string> = {
  charging: 'AN OBJECT IN MOTION STAYS IN MOTION. I WILL NOT STOP.',
  stunned: 'FORCE IS MASS TIMES ACCELERATION — AND I AM ALL MASS.',
  airborne: 'EVERY ACTION HAS A REACTION. FEEL MINE.',
};

/** Which law the ability demonstrates, shown under its name. */
export const ABILITY_LAW: Record<BossMode, string> = {
  charging: '1st LAW · INERTIA',
  stunned: '2nd LAW · F = ma',
  airborne: '3rd LAW · ACTION / REACTION',
};

export const MATRIX: Record<BossMode, Record<WeaponId, Effect>> = {
  charging: { shield: 'strong', sword: 'none', gun: 'weak' },
  stunned: { shield: 'none', sword: 'strong', gun: 'weak' },
  airborne: { shield: 'weak', sword: 'none', gun: 'strong' },
};

export const WEAPON_DAMAGE: Record<WeaponId, Record<Effect, number>> = {
  sword: { strong: 38, weak: 6, none: 0 },
  gun: { strong: 12, weak: 3, none: 0 },
  shield: { strong: 26, weak: 0, none: 0 },
};

export const LAW_LINE: Record<WeaponId, string> = {
  shield: '1st LAW  ·  BRACED, NET FORCE = 0',
  sword: '2nd LAW  ·  F = ma, YOU SWUNG HARD',
  gun: '3rd LAW  ·  IT PUSHES BACK ON YOU',
};

/** How long each state lasts if nothing interrupts it. */
export const MODE_MS: Record<BossMode, number> = {
  charging: 6000,
  stunned: 4200,
  airborne: 7000,
};

export const SWORD_CHARGE_MS = 700;
export const GUN_RECOIL = 16; // a real nudge backward, not a launch
export const GUN_RANGE = 62;
export const GUN_COOLDOWN_MS = 460;
export const MAG_SIZE = 6;
export const RELOAD_MS = 1500;

/** More friends is a harder fight, not an easier one. */
export function bossHpFor(players: number): number {
  // The whole journey is 5-10 minutes, so World 3 gets about two and a half
  // of them solo. Scaling still makes a party harder, not faster.
  return Math.round(560 * (1 + 0.7 * (Math.max(1, players) - 1)));
}

export function aggressionFor(players: number): number {
  return 1 + 0.35 * (Math.max(1, players) - 1);
}
