// World 3 combat. Three phases, each one angrier than the last.
//
// NOTE: client-side for now — every player tracks their own bar. Shared HP
// needs a monster row per room and a reducer.

import { useSyncExternalStore } from 'react';
import { local } from '../world1/local';
import { APPLE_RADIUS, applePos } from './layout';

export const PHASES = 3;
export const HP_PER_PHASE = 60;
export const MAX_HP = PHASES * HP_PER_PHASE;
export const HIT_DAMAGE = 9;
export const REACH = APPLE_RADIUS + 8;
const COOLDOWN_MS = 240;

export const PLAYER_MAX_HP = 100;

/** While true the player cannot move and the camera is on the boss. */
export const cinematic = { active: false };

export interface CombatState {
  hp: number;
  playerHp: number;
  playerHitAt: number;
  playerDeadAt: number;
  hits: number;
  down: boolean;
  downAt: number;
  landed: boolean;
  lastHitAt: number;
  fromX: number;
  fromZ: number;
}

const state: CombatState = {
  hp: MAX_HP,
  playerHp: PLAYER_MAX_HP,
  playerHitAt: 0,
  playerDeadAt: 0,
  hits: 0,
  down: false,
  downAt: 0,
  landed: false,
  lastHitAt: 0,
  fromX: 0,
  fromZ: 1,
};

const listeners = new Set<() => void>();
let version = 0;
function emit() {
  version++;
  for (const l of listeners) l();
}

/** 0 while it still has everything, 2 when it is nearly finished. */
export function phaseOf(hp: number): number {
  if (hp <= 0) return PHASES - 1;
  return PHASES - 1 - Math.floor((hp - 1) / HP_PER_PHASE);
}

export function markLanded() {
  if (state.landed) return;
  state.landed = true;
  emit();
}

export function attack(): boolean {
  const now = performance.now();
  if (!state.landed || state.down || now - state.lastHitAt < COOLDOWN_MS) return false;
  const dx = local.x - applePos.x;
  const dz = local.z - applePos.z;
  const d = Math.hypot(dx, dz);
  if (d > REACH) return false;

  state.lastHitAt = now;
  state.hits++;
  state.hp = Math.max(0, state.hp - HIT_DAMAGE);
  state.fromX = dx / (d || 1);
  state.fromZ = dz / (d || 1);
  if (state.hp === 0 && !state.down) {
    state.down = true;
    state.downAt = now;
  }
  emit();
  return true;
}

/** The boss connects. Returns true if it actually landed a blow. */
export function damagePlayer(amount: number): boolean {
  const now = performance.now();
  if (state.playerHp <= 0 || now - state.playerHitAt < 900) return false;
  state.playerHitAt = now;
  state.playerHp = Math.max(0, state.playerHp - amount);
  if (state.playerHp === 0 && !state.playerDeadAt) state.playerDeadAt = now;
  emit();
  return true;
}

export const RESPAWN_MS = 3200;

/** Back on your feet, full health, dropped somewhere clear of the boss. */
export function respawnPlayer() {
  state.playerHp = PLAYER_MAX_HP;
  state.playerDeadAt = 0;
  state.playerHitAt = 0;
  state.playerDeadAt = 0;
  emit();
}

export function resetCombat() {
  state.hp = MAX_HP;
  state.playerHp = PLAYER_MAX_HP;
  state.playerHitAt = 0;
  state.hits = 0;
  state.down = false;
  state.downAt = 0;
  state.landed = false;
  emit();
}

export const readCombat = (): CombatState => state;

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const snapshot = () => version;

export function useCombat(): CombatState {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return state;
}

export function installAttackInput(): () => void {
  const key = (e: KeyboardEvent) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      attack();
    }
  };
  const press = () => attack();
  window.addEventListener('keydown', key);
  window.addEventListener('pointerdown', press);
  return () => {
    window.removeEventListener('keydown', key);
    window.removeEventListener('pointerdown', press);
  };
}
