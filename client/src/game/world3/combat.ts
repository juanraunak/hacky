// World 3 combat: three weapons, three boss states, one matrix between them.
//
// NOTE: client-side. Every device runs its own copy, so two phones will
// disagree. Shared HP needs a monster row per room and a damage reducer.

import { useSyncExternalStore } from 'react';
import { local } from '../world1/local';
import { useWorld } from '../world1/store';
import { APPLE_RADIUS, applePos, groundHeight } from './layout';
import { fireBullet } from './projectiles';
import {
  MAG_SIZE,
  RELOAD_MS,
  WEAPON_DAMAGE,
  GUN_COOLDOWN_MS,
  GUN_RANGE,
  GUN_RECOIL,
  MATRIX,
  MODE_MS,
  SWORD_CHARGE_MS,
  aggressionFor,
  bossHpFor,
  type BossMode,
  type Effect,
  type WeaponId,
} from './weapons';

export const PLAYER_MAX_HP = 100;
export const RESPAWN_MS = 3200;
export const PHASES = 3;
export const SWORD_REACH = APPLE_RADIUS + 15;

/** While true the player cannot move and the camera is on the boss. */
export const cinematic = { active: false };

/**
 * Training mode. World 2 wants World 3's weapons — the same reach, the same
 * recoil, the same charge — but pointed at straw dummies instead of the boss.
 * When it is on, hits land on the dummy in front of you and the boss's health
 * is left alone.
 */
export const training = {
  active: false,
  hits: 0,
  swordHits: 0,
  shots: 0,
  blocks: 0,
  lastEffect: 'none' as Effect,
};

export interface Feedback {
  effect: Effect;
  weapon: WeaponId;
  mode: BossMode;
  at: number;
}

export interface CombatState {
  maxHp: number;
  hp: number;
  hits: number;
  down: boolean;
  downAt: number;
  landed: boolean;

  mode: BossMode;
  modeSince: number;
  /** Set when the boss is mid-charge and actually dangerous. */
  charging: boolean;

  weapon: WeaponId | null;
  owned: WeaponId[];
  swordCharge: number; // 0..1
  bracing: boolean;
  lastShotAt: number;
  ammo: number;
  reloadingUntil: number;
  lastSwingAt: number;

  playerHp: number;
  playerHitAt: number;
  playerDeadAt: number;

  players: number;
  feedback: Feedback | null;
  justGot: { id: WeaponId; at: number } | null;
}

const state: CombatState = {
  maxHp: bossHpFor(1),
  hp: bossHpFor(1),
  hits: 0,
  down: false,
  downAt: 0,
  landed: false,
  mode: 'charging',
  modeSince: 0,
  charging: false,
  weapon: null,
  owned: [],
  swordCharge: 0,
  bracing: false,
  lastShotAt: 0,
  ammo: MAG_SIZE,
  reloadingUntil: 0,
  lastSwingAt: 0,
  playerHp: PLAYER_MAX_HP,
  playerHitAt: 0,
  playerDeadAt: 0,
  players: 1,
  feedback: null,
  justGot: null,
};

const listeners = new Set<() => void>();
let version = 0;
function emit() {
  version++;
  for (const l of listeners) l();
}

export const readCombat = (): CombatState => state;
export function phaseOf(hp: number): number {
  if (hp <= 0) return PHASES - 1;
  const band = state.maxHp / PHASES;
  return Math.min(PHASES - 1, PHASES - 1 - Math.floor((hp - 1) / band));
}

/** Party size drives both the pool and the pressure. */
export function syncPartySize() {
  const n = Math.max(1, Object.keys(useWorld.getState().party).length);
  if (n === state.players) return;
  const ratio = state.hp / state.maxHp;
  state.players = n;
  state.maxHp = bossHpFor(n);
  state.hp = Math.round(state.maxHp * ratio);
  emit();
}

export function markLanded() {
  if (state.landed) return;
  state.landed = true;
  state.modeSince = performance.now();
  syncPartySize();
  emit();
}

export function setMode(mode: BossMode) {
  state.mode = mode;
  state.modeSince = performance.now();
  state.charging = false;
  emit();
}

/**
 * The loop, and the loop is the lesson:
 *
 *   charging  -> brace it, and it rebounds -> stunned
 *             -> fail to brace, and it runs you down -> airborne
 *   stunned   -> cut it while it is down -> airborne
 *   airborne  -> shoot it out of the air -> charging
 *
 * Each state can only be answered by one law, so the party is forced through
 * all three rather than leaning on a favourite.
 */
export function tickBoss(now: number) {
  // It waits, hovering, until the party has gathered all three laws.
  if (!state.landed || state.down || state.owned.length < 3) return;
  const held = now - state.modeSince;
  if (held > MODE_MS[state.mode] / aggressionFor(state.players)) {
    if (state.mode === 'charging') setMode('airborne');
    else if (state.mode === 'stunned') setMode('airborne');
    else setMode('charging');
    return;
  }
  const wantCharging = state.mode === 'charging' && held > 1400;
  if (wantCharging !== state.charging) {
    state.charging = wantCharging;
    emit();
  }
}

export function grantWeapon(w: WeaponId) {
  if (state.owned.includes(w)) return;
  state.owned.push(w);
  if (!state.weapon) state.weapon = w;
  state.justGot = { id: w, at: performance.now() };
  emit();
}

export function selectWeapon(w: WeaponId) {
  if (!state.owned.includes(w) || state.weapon === w) return;
  state.weapon = w;
  state.swordCharge = 0;
  state.bracing = false;
  emit();
}

export function setBracing(on: boolean) {
  const want = on && state.weapon === 'shield' && state.owned.includes('shield');
  if (want === state.bracing) return;
  state.bracing = want;
  emit();
}

export function setSwordCharge(v: number) {
  state.swordCharge = Math.max(0, Math.min(1, v));
}

function land(weapon: WeaponId, chargeScale = 1): Effect {
  if (!state.owned.includes(weapon)) return 'none';
  if (training.active) {
    // Every law works in practice: this is the drill, not the test.
    training.hits++;
    if (weapon === 'sword') training.swordHits++;
    if (weapon === 'gun') training.shots++;
    training.lastEffect = 'strong';
    state.feedback = { effect: 'strong', weapon, mode: state.mode, at: performance.now() };
    emit();
    return 'strong';
  }
  const effect = MATRIX[state.mode][weapon];
  const dmg = Math.round(WEAPON_DAMAGE[weapon][effect] * chargeScale);
  if (dmg > 0) {
    state.hp = Math.max(0, state.hp - dmg);
    state.hits++;
    if (state.hp === 0 && !state.down) {
      state.down = true;
      state.downAt = performance.now();
    }
  }
  state.feedback = { effect, weapon, mode: state.mode, at: performance.now() };
  emit();
  return effect;
}

/** Sword: the swing only carries force if you accelerated it. F = ma. */
export function swingSword(): Effect | null {
  const now = performance.now();
  if (state.weapon !== 'sword') return null;
  if (!training.active && (!state.landed || state.down)) return null;
  if (now - state.lastSwingAt < 320) return null;
  const d = Math.hypot(local.x - applePos.x, local.z - applePos.z);
  if (d > SWORD_REACH) return null;
  state.lastSwingAt = now;
  const scale = 0.45 + 0.55 * state.swordCharge;
  const effect = land('sword', scale);
  state.swordCharge = 0;
  // Cutting it while it is down is what gets it back on its feet.
  if (!training.active && effect === 'strong' && !state.down) setMode('airborne');
  return effect;
}

/** Gun: the shot goes out, and it drives you back just as hard. */
export function fireGun(): Effect | null {
  const now = performance.now();
  if (state.weapon !== 'gun') return null;
  if (!training.active && (!state.landed || state.down)) return null;
  if (now - state.lastShotAt < GUN_COOLDOWN_MS) return null;
  if (now < state.reloadingUntil) return null;
  // Ammo is unlimited; the magazine is the only limit, so an empty one just
  // starts a reload rather than leaving you dry.
  if (state.ammo <= 0) {
    state.reloadingUntil = now + RELOAD_MS;
    state.ammo = MAG_SIZE;
    emit();
    return null;
  }
  const dx = applePos.x - local.x;
  const dz = applePos.z - local.z;
  const d = Math.hypot(dx, dz);
  if (d > GUN_RANGE) return null;
  state.lastShotAt = now;
  state.ammo--;
  if (state.ammo === 0) state.reloadingUntil = now + RELOAD_MS;
  fireBullet(local.x, local.z, applePos.x, groundHeight(applePos.x, applePos.z) + 14, applePos.z);
  // Third law: equal and opposite, applied to you.
  local.recoilX = (-dx / (d || 1)) * GUN_RECOIL;
  local.recoilZ = (-dz / (d || 1)) * GUN_RECOIL;
  const effect = land('gun');
  // Shot out of the air, it comes down and starts its run-up again.
  if (!training.active && effect === 'strong' && state.mode === 'airborne' && !state.down && Math.random() < 0.34) {
    setMode('charging');
  }
  return effect;
}

/** The boss connects. A braced shield is the first law doing its job. */
export function bossHits(amount: number, pushX: number, pushZ: number): 'blocked' | 'hurt' | null {
  const now = performance.now();
  if (state.playerHp <= 0 || now - state.playerHitAt < 900) return null;
  state.playerHitAt = now;

  if (state.bracing) {
    if (training.active) training.blocks++;
    // First law doing its job: net force cancelled. No damage, no knockback.
    state.feedback = { effect: 'strong', weapon: 'shield', mode: state.mode, at: now };
    // A charge stopped by a braced player rebounds off its own momentum.
    if (state.mode === 'charging') {
      const dmg = WEAPON_DAMAGE.shield.strong;
      state.hp = Math.max(0, state.hp - dmg);
      state.hits++;
      if (state.hp === 0 && !state.down) {
        state.down = true;
        state.downAt = now;
      } else {
        setMode('stunned');
      }
    }
    emit();
    return 'blocked';
  }

  state.playerHp = Math.max(0, state.playerHp - amount);
  local.recoilX = pushX;
  local.recoilZ = pushZ;
  if (state.playerHp === 0 && !state.playerDeadAt) state.playerDeadAt = now;
  emit();
  return 'hurt';
}

export function respawnPlayer() {
  state.playerHp = PLAYER_MAX_HP;
  state.playerDeadAt = 0;
  state.playerHitAt = 0;
  emit();
}

/** Full reset for a replay: hand the laws back in. */
export function clearLaws() {
  state.owned = [];
  state.weapon = null;
  emit();
}

export function resetCombat() {
  state.players = 1;
  state.maxHp = bossHpFor(1);
  state.hp = state.maxHp;
  state.hits = 0;
  state.down = false;
  state.downAt = 0;
  state.landed = false;
  state.mode = 'charging';
  state.modeSince = 0;
  state.charging = false;
  state.weapon = 'sword';
  state.swordCharge = 0;
  state.bracing = false;
  state.playerHp = PLAYER_MAX_HP;
  state.playerHitAt = 0;
  state.playerDeadAt = 0;
  state.ammo = MAG_SIZE;
  state.reloadingUntil = 0;
  state.feedback = null;
  state.justGot = null;
  training.hits = 0;
  training.swordHits = 0;
  training.shots = 0;
  training.blocks = 0;
  // owned/weapon deliberately survive a World 3 remount: the laws are granted
  // by Newton in World 2 and carrying them forward is the point of the
  // journey. clearLaws() is for starting the whole run again.
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => version;

export function useCombat(): CombatState {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return state;
}

/** Keys on desktop; the HUD buttons drive the same functions on a phone. */
export function installAttackInput(): () => void {
  let holding = false;
  let heldSince = 0;

  const use = () => {
    const w = state.weapon;
    if (!w) return;
    if (w === 'gun') fireGun();
    else if (w === 'shield') setBracing(true);
    else {
      holding = true;
      heldSince = performance.now();
    }
  };
  const release = () => {
    if (state.weapon === 'shield') setBracing(false);
    if (state.weapon === 'sword' && holding) {
      setSwordCharge((performance.now() - heldSince) / SWORD_CHARGE_MS);
      swingSword();
      holding = false;
    }
  };

  const key = (e: KeyboardEvent) => {
    if (e.code === 'Digit1') return selectWeapon('sword');
    if (e.code === 'Digit2') return selectWeapon('gun');
    if (e.code === 'Digit3') return selectWeapon('shield');
    if ((e.code === 'KeyF' || e.code === 'KeyE') && !e.repeat) {
      e.preventDefault();
      use();
    }
  };
  const keyUp = (e: KeyboardEvent) => {
    if (e.code === 'KeyF' || e.code === 'KeyE') release();
  };

  const tick = window.setInterval(() => {
    if (holding) setSwordCharge((performance.now() - heldSince) / SWORD_CHARGE_MS);
    tickBoss(performance.now());
    syncPartySize();
  }, 90);

  window.addEventListener('keydown', key);
  window.addEventListener('keyup', keyUp);
  // Mouse only. On a phone a window-level pointerdown means every look-drag
  // fires the weapon; there, the FIRE button is the only thing that attacks.
  const mouseDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') use();
  };
  const mouseUp = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') release();
  };
  window.addEventListener('pointerdown', mouseDown);
  window.addEventListener('pointerup', mouseUp);
  return () => {
    window.clearInterval(tick);
    window.removeEventListener('keydown', key);
    window.removeEventListener('keyup', keyUp);
    window.removeEventListener('pointerdown', mouseDown);
    window.removeEventListener('pointerup', mouseUp);
  };
}

export { type BossMode, type Effect, type WeaponId } from './weapons';
