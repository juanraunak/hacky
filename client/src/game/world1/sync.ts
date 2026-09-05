// The one file in the game layer that talks to SpacetimeDB.
//
// FOR JUAN: this is the World 1 slice of the net boundary. It is written so
// it can be lifted into /client/src/net wholesale: nothing else under
// src/game imports the SDK or module_bindings, only the functions exported
// here. The reducers it calls are enter_world, move_player, fire_world_event,
// pick_up_item, drop_item and reset_world; see WORLD1-REPORT.md.

import { Identity } from 'spacetimedb';
import { DbConnection, tables } from '../../module_bindings';
import type {
  HeldItem,
  Player,
  PlayerPosition,
  StudyApple,
  WorldEvent as WorldEventRow,
} from '../../module_bindings/types';
import { useWorld, WORLD_ID } from './store';

const URI = 'wss://maincloud.spacetimedb.com';
// 'hacky' is the real database, but the Maincloud account that published it
// is not the one this machine is logged into, so World 1 went to a sibling
// database under the available account. Flip this back to 'hacky' once the
// module is published there (see WORLD1-REPORT.md, "Publish status").
const DATABASE = import.meta.env.VITE_SPACETIME_DB ?? 'hacky-world1';
const TOKEN_KEY = 'hacky.token';

let conn: DbConnection | null = null;
let generation = 0;

export interface ConnectOptions {
  roomCode: string;
  name: string;
  /** Demo helper: forget the apple event on entry so it can fall again. */
  reset?: boolean;
}

function readToken(): string | undefined {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function saveToken(token: string) {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // private mode; a fresh identity next load is fine
  }
}

function micros(ts: { microsSinceUnixEpoch: bigint }): number {
  return Number(ts.microsSinceUnixEpoch / 1000n);
}

function member(row: Player) {
  return { identity: row.identity.toHexString(), name: row.name, connected: row.connected };
}

function position(row: PlayerPosition) {
  return { x: row.x, z: row.z, heading: row.heading };
}

function registerCallbacks(c: DbConnection) {
  const s = () => useWorld.getState();

  c.db.player.onInsert((_ctx, row) => s().upsertMember(member(row)));
  c.db.player.onUpdate((_ctx, _old, row) => s().upsertMember(member(row)));
  c.db.player.onDelete((_ctx, row) => s().removeMember(row.identity.toHexString()));

  c.db.playerPosition.onInsert((_ctx, row) =>
    s().upsertPosition(row.identity.toHexString(), position(row))
  );
  c.db.playerPosition.onUpdate((_ctx, _old, row) =>
    s().upsertPosition(row.identity.toHexString(), position(row))
  );
  c.db.playerPosition.onDelete((_ctx, row) => s().removePosition(row.identity.toHexString()));

  const event = (row: WorldEventRow) => ({
    name: row.name,
    firedAt: micros(row.firedAt),
    receivedAt: performance.now(),
    firedBy: row.firedBy.toHexString(),
  });
  c.db.worldEvent.onInsert((_ctx, row) => {
    if (row.world === WORLD_ID) s().addEvent(event(row));
  });
  c.db.worldEvent.onDelete((_ctx, row) => {
    if (row.world === WORLD_ID) s().removeEvent(row.name);
  });

  const held = (row: HeldItem) => s().setHeld(row.identity.toHexString(), row.item);
  c.db.heldItem.onInsert((_ctx, row) => held(row));
  c.db.heldItem.onUpdate((_ctx, _old, row) => held(row));
  c.db.heldItem.onDelete((_ctx, row) => s().clearHeld(row.identity.toHexString()));

  // An apple row carries its whole flight, so the client interpolates from
  // spawn_at and nothing needs streaming per frame. spawn_at is server time;
  // it is rebased onto this machine's clock once, on arrival.
  const apple = (row: StudyApple) => {
    const serverMs = micros(row.spawnAt);
    s().upsertApple({
      id: row.id.toString(),
      wave: row.wave,
      seq: row.seq,
      size: row.size,
      target: row.target.toHexString(),
      from: { x: row.fromX, y: row.fromY, z: row.fromZ },
      to: { x: row.toX, z: row.toZ },
      spawnAt: performance.now() + (serverMs - Date.now()),
      dead: row.dead,
      hitBy: row.hitBy.toHexString(),
    });
  };
  c.db.studyApple.onInsert((_ctx, row) => apple(row));
  c.db.studyApple.onUpdate((_ctx, _old, row) => apple(row));
  c.db.studyApple.onDelete((_ctx, row) => s().removeApple(row.id.toString()));
}

/** Open the connection, subscribe to the room, and enter the meadow. */
export function connectWorld({ roomCode, name, reset = false }: ConnectOptions): () => void {
  const mine = ++generation;
  const live = () => generation === mine;
  const store = useWorld.getState();
  store.setConnection('connecting');
  useWorld.setState({ roomCode, party: {}, positions: {}, events: {}, held: {}, apples: {} });

  const built = DbConnection.builder()
    .withUri(URI)
    .withDatabaseName(DATABASE)
    .withToken(readToken())
    .onConnect((c, identity, token) => {
      if (!live()) {
        try {
          c.disconnect();
        } catch {
          // already gone
        }
        return;
      }
      saveToken(token);
      useWorld.getState().setIdentity(identity.toHexString());
      registerCallbacks(c);

      const displayName = name.trim() || `kid-${identity.toHexString().slice(-4)}`;

      c.subscriptionBuilder()
        .onApplied(() => {
          if (!live()) return;
          c.reducers
            .enterWorld({ roomCode, name: displayName })
            .then(() => (reset ? c.reducers.resetWorld({ world: WORLD_ID }) : undefined))
            .catch((err: unknown) => console.warn('[world1] enter_world failed', err));
          useWorld.getState().setConnection('online');
        })
        .onError(ctx => {
          if (live()) useWorld.getState().setConnection('error', describe(ctx.event));
        })
        .subscribe([
          tables.player.where(r => r.roomCode.eq(roomCode)),
          tables.playerPosition.where(r => r.roomCode.eq(roomCode)),
          tables.worldEvent.where(r => r.roomCode.eq(roomCode)),
          tables.heldItem.where(r => r.roomCode.eq(roomCode)),
          tables.studyApple.where(r => r.roomCode.eq(roomCode)),
        ]);
    })
    .onConnectError((_ctx, err) => {
      if (live()) useWorld.getState().setConnection('error', describe(err));
    })
    .onDisconnect((_ctx, err) => {
      if (live() && err) useWorld.getState().setConnection('error', describe(err));
    })
    .build();

  conn = built;
  return () => {
    if (mine === generation) generation++;
    if (conn === built) conn = null;
    try {
      built.disconnect();
    } catch {
      // already closed
    }
  };
}

function describe(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  // The SDK hands back a raw DOM Event when the socket drops, and String()
  // on that is the useless "[object Event]".
  if (typeof Event !== 'undefined' && err instanceof Event) {
    return err.type === 'error' ? 'the connection dropped' : `connection ${err.type}`;
  }
  if (err == null) return 'the connection dropped';
  const text = String(err);
  return text === '[object Object]' || text === '[object Event]' ? 'the connection dropped' : text;
}

function swallow(p: Promise<void>, what: string) {
  p.catch((err: unknown) => console.warn(`[world1] ${what} failed`, err));
}

export function movePlayer(x: number, z: number, heading: number) {
  if (!conn) return;
  swallow(conn.reducers.movePlayer({ x, z, heading }), 'move_player');
}

export function fireWorldEvent(name: string) {
  if (!conn) return;
  swallow(conn.reducers.fireWorldEvent({ world: WORLD_ID, name }), 'fire_world_event');
}

export function pickUpItem(item: string) {
  if (!conn) return;
  swallow(conn.reducers.pickUpItem({ item }), 'pick_up_item');
}

export function dropItem() {
  if (!conn) return;
  swallow(conn.reducers.dropItem({}), 'drop_item');
}

export function resetWorld() {
  if (!conn) return;
  swallow(conn.reducers.resetWorld({ world: WORLD_ID }), 'reset_world');
}

// --- World 2 -------------------------------------------------------------

/** Per-player kit, with no room exclusivity: a pen each, not one between all. */
export function equipItem(item: string) {
  if (!conn) return;
  swallow(conn.reducers.equipItem({ item }), 'equip_item');
}

export interface AppleSpec {
  seq: number;
  size: string;
  target: string;
  fromX: number;
  fromY: number;
  fromZ: number;
  toX: number;
  toZ: number;
  delayMs: number;
}

export function spawnWave(wave: number, apples: AppleSpec[]) {
  if (!conn) return;
  swallow(
    conn.reducers.spawnWave({
      wave,
      apples: apples.map(a => ({ ...a, target: Identity.fromString(a.target) })),
    }),
    'spawn_wave'
  );
}

export function killApple(id: string) {
  if (!conn) return;
  swallow(conn.reducers.killApple({ appleId: BigInt(id) }), 'kill_apple');
}

export function clearStudy() {
  if (!conn) return;
  swallow(conn.reducers.clearStudy({}), 'clear_study');
}
