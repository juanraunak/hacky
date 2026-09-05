// Shared state for World 1. Fed by sync.ts (database rows) and by the scene
// (screen shake, leaf puffs, camera mode). Per-frame data such as the local
// player's position deliberately lives outside React in local.ts.

import { create } from 'zustand';

export type CameraMode = 'first' | 'third';
export type ConnectionState = 'connecting' | 'online' | 'error';

export interface PartyMember {
  identity: string;
  name: string;
  connected: boolean;
}

export interface Position {
  x: number;
  z: number;
  heading: number;
  updatedAt: number; // ms, local clock when received
}

export interface WorldEvent {
  name: string;
  firedAt: number; // ms, server clock
  receivedAt: number; // ms, local clock
  firedBy: string;
}

export interface Apple {
  id: string;
  wave: number;
  seq: number;
  size: string;
  target: string;
  from: { x: number; y: number; z: number };
  to: { x: number; z: number };
  /** Local ms when this apple leaves the portal. */
  spawnAt: number;
  dead: boolean;
  hitBy: string;
}

export interface LeafPuff {
  id: number;
  at: number;
  x: number;
  y: number;
  z: number;
}

export interface World1State {
  roomCode: string;
  identity: string | null;
  connection: ConnectionState;
  error: string | null;

  party: Record<string, PartyMember>;
  positions: Record<string, Position>;
  events: Record<string, WorldEvent>;
  held: Record<string, string>; // identity -> item
  apples: Record<string, Apple>;

  cameraMode: CameraMode;
  isTouch: boolean;
  shakeUntil: number;
  shakeStrength: number;
  puffs: LeafPuff[];
  /** Local ms when the apple hit and Newton started thinking; null before. */
  storyStartedAt: number | null;

  setStoryStartedAt: (at: number | null) => void;
  setConnection: (state: ConnectionState, error?: string | null) => void;
  setIdentity: (identity: string) => void;
  upsertMember: (member: PartyMember) => void;
  removeMember: (identity: string) => void;
  upsertPosition: (identity: string, pos: Omit<Position, 'updatedAt'>) => void;
  removePosition: (identity: string) => void;
  addEvent: (event: WorldEvent) => void;
  removeEvent: (name: string) => void;
  setHeld: (identity: string, item: string) => void;
  clearHeld: (identity: string) => void;
  upsertApple: (apple: Apple) => void;
  removeApple: (id: string) => void;
  setCameraMode: (mode: CameraMode) => void;
  shake: (strength?: number, durationMs?: number) => void;
  puff: (x: number, y: number, z: number) => void;
  prunePuffs: (now: number) => void;
}

const hasTouch =
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);

let puffId = 0;

export const useWorld = create<World1State>((set, get) => ({
  roomCode: '',
  identity: null,
  connection: 'connecting',
  error: null,

  party: {},
  positions: {},
  events: {},
  held: {},
  apples: {},

  cameraMode: hasTouch ? 'third' : 'first',
  isTouch: hasTouch,
  shakeUntil: 0,
  shakeStrength: 0,
  puffs: [],
  storyStartedAt: null,

  setStoryStartedAt: storyStartedAt => set({ storyStartedAt }),
  setConnection: (connection, error = null) => set({ connection, error }),
  setIdentity: identity => set({ identity }),

  upsertMember: member =>
    set(s => ({ party: { ...s.party, [member.identity]: member } })),
  removeMember: identity =>
    set(s => {
      const party = { ...s.party };
      delete party[identity];
      return { party };
    }),

  upsertPosition: (identity, pos) =>
    set(s => ({
      positions: { ...s.positions, [identity]: { ...pos, updatedAt: performance.now() } },
    })),
  removePosition: identity =>
    set(s => {
      const positions = { ...s.positions };
      delete positions[identity];
      return { positions };
    }),

  addEvent: event => set(s => ({ events: { ...s.events, [event.name]: event } })),
  removeEvent: name =>
    set(s => {
      const events = { ...s.events };
      delete events[name];
      // A reset mid-monologue stops the bubble too.
      return name === APPLE_EVENT ? { events, storyStartedAt: null } : { events };
    }),

  setHeld: (identity, item) => set(s => ({ held: { ...s.held, [identity]: item } })),
  clearHeld: identity =>
    set(s => {
      const held = { ...s.held };
      delete held[identity];
      return { held };
    }),

  upsertApple: apple => set(s => ({ apples: { ...s.apples, [apple.id]: apple } })),
  removeApple: id =>
    set(s => {
      const apples = { ...s.apples };
      delete apples[id];
      return { apples };
    }),

  setCameraMode: cameraMode => set({ cameraMode }),

  shake: (strength = 0.18, durationMs = 350) =>
    set({ shakeUntil: performance.now() + durationMs, shakeStrength: strength }),

  puff: (x, y, z) =>
    set(s => ({ puffs: [...s.puffs, { id: ++puffId, at: performance.now(), x, y, z }] })),
  prunePuffs: now => {
    const { puffs } = get();
    if (puffs.length && puffs.some(p => now - p.at > 2200)) {
      set({ puffs: puffs.filter(p => now - p.at <= 2200) });
    }
  },
}));

export const APPLE_EVENT = 'apple_fell';
/** Newton stands, says his last line, and walks home to the cottage. */
export const NEWTON_LEAVES = 'newton_leaves';
// One world id for the whole Newton game; the event names namespace the
// chapter. That way the Reset button clears the meadow and the study together.
export const WORLD_ID = 'world1';
export const APPLE_ITEM = 'apple';

// World 2, the study.
export const STUDY_ENTERED = 'study_entered';
export const STONE_DROPPED = 'study_stone';
export const PEN_DROPPED = 'study_pen';
export const FEATHER_DROPPED = 'study_feather';
export const PORTAL_OPEN = 'study_portal';
export const FIGHT_READY = 'study_ready';
export const FIGHT_DONE = 'study_fight_done';
export const PEN_ITEM = 'pen';
