// The one file in the game layer that talks to SpacetimeDB.
//
// FOR JUAN: this is the World 1 slice of the net boundary. It is written so
// it can be lifted into /client/src/net wholesale: nothing else under
// src/game imports the SDK or module_bindings, only the functions exported
// here. The reducers it calls are enter_world, move_player, fire_world_event,
// pick_up_item, drop_item and reset_world; see WORLD1-REPORT.md.

import { DbConnection, tables } from '../../module_bindings';
import type {
  HeldItem,
  Player,
  PlayerPosition,
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
}

/** Open the connection, subscribe to the room, and enter the meadow. */
export function connectWorld({ roomCode, name, reset = false }: ConnectOptions): () => void {
  const store = useWorld.getState();
  store.setConnection('connecting');
  useWorld.setState({ roomCode, party: {}, positions: {}, events: {}, held: {} });

  const built = DbConnection.builder()
    .withUri(URI)
    .withDatabaseName(DATABASE)
    .withToken(readToken())
    .onConnect((c, identity, token) => {
      saveToken(token);
      useWorld.getState().setIdentity(identity.toHexString());
      registerCallbacks(c);

      const displayName = name.trim() || `kid-${identity.toHexString().slice(-4)}`;

      c.subscriptionBuilder()
        .onApplied(() => {
          c.reducers
            .enterWorld({ roomCode, name: displayName })
            .then(() => (reset ? c.reducers.resetWorld({ world: WORLD_ID }) : undefined))
            .catch((err: unknown) => console.warn('[world1] enter_world failed', err));
          useWorld.getState().setConnection('online');
        })
        .onError(ctx => {
          useWorld.getState().setConnection('error', describe(ctx.event));
        })
        .subscribe([
          tables.player.where(r => r.roomCode.eq(roomCode)),
          tables.playerPosition.where(r => r.roomCode.eq(roomCode)),
          tables.worldEvent.where(r => r.roomCode.eq(roomCode)),
          tables.heldItem.where(r => r.roomCode.eq(roomCode)),
        ]);
    })
    .onConnectError((_ctx, err) => {
      useWorld.getState().setConnection('error', describe(err));
    })
    .onDisconnect((_ctx, err) => {
      if (err) useWorld.getState().setConnection('error', describe(err));
    })
    .build();

  conn = built;
  return () => {
    if (conn === built) conn = null;
    try {
      built.disconnect();
    } catch {
      // already closed
    }
  };
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
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
