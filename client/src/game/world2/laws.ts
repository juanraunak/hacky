// The three laws, as rules the game actually obeys.
//
// Each weapon is one law, and the law is the mechanic, not the flavour text.
// If you take these numbers out, the weapon stops working, which is the point:
// there is nothing here to read and then ignore.
//
//   SHIELD  first law   — brace and the net force is zero, so you do not move.
//                         Do not brace and the sandbag's momentum takes you.
//   SWORD   second law  — F = ma. The damage is in the acceleration you give
//                         the blade, so a tap does nothing and a wind-up bites.
//   GUN     third law   — every push has an equal push back. Firing shoves you
//                         backwards. That is the mechanic, not a side effect.

/** Wind-up needed for a swing to carry its full force. */
export const CHARGE_MS = 620;
/** Below this fraction of a full wind-up, the blade just bounces off. */
export const SWORD_BITE = 0.55;
/** How far in front of you the blade reaches. */
export const SWORD_REACH = 2.0;

/** How hard the gun shoves you back, in units per shot. */
export const RECOIL = 1.35;
/** How long that shove takes to play out. */
export const RECOIL_MS = 260;
export const GUN_COOLDOWN_MS = 620;
export const BOLT_SPEED = 26;
export const BOLT_LIFE_MS = 700;

/** How far the sandbag throws someone who did not set their feet. */
export const SHOVE = 3.2;
export const SHOVE_MS = 420;
/** You have to be at least this braced for the forces to cancel. */
export const BRACE_MS = 220;
/** How close the bob has to be to catch you. */
export const BOB_RADIUS = 1.15;

/** 0 to 1: how much wind-up a swing had. */
export function chargeOf(heldMs: number): number {
  return Math.min(1, heldMs / CHARGE_MS);
}

/** Did that swing carry enough acceleration to mark oak? */
export function bites(charge: number): boolean {
  return charge >= SWORD_BITE;
}
