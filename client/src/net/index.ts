// The sole SpacetimeDB boundary. Nothing outside this folder imports the SDK
// or module_bindings — the game and lobby layers see only the plain types and
// functions below.
//
// Signatures are unchanged from the stub this replaced; only the data behind
// them is now live.

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { DbConnection } from '../module_bindings';

export interface Player {
  identity: string;
  name: string;
  color: string;
  x: number;
  y: number;
  tools: string[];
  connected: boolean;
}

export interface Monster {
  id: number;
  kind: string;
  x: number;
  y: number;
  hp: number;
}

export interface Room {
  code: string;
  topic: string;
  contentJson: string;
  /** lobby | world1 | world2 | world3 | done */
  phase: string;
  /** 0 in the lobby, then 1..3. */
  currentWorld: number;
}

export type Status = 'idle' | 'connecting' | 'connected' | 'error';

// The SDK maps https -> wss and http -> ws, and leaves an explicit ws:/wss:
// alone (db_connection_impl.ts). So an https:// URI is what puts production on
// a secure socket.
const RAW_URI = import.meta.env.VITE_SPACETIME_URI ?? 'https://maincloud.spacetimedb.com';
const DB_NAME = import.meta.env.VITE_SPACETIME_DB ?? 'hacky';

/**
 * A production build must never talk to SpacetimeDB in the clear. Upgrade
 * rather than throw: a misconfigured env should not white-screen the app, but
 * it must not put session tokens on an unencrypted socket either.
 */
function resolveUri(raw: string): string {
  if (!import.meta.env.PROD) return raw;
  const secure = raw.replace(/^http:\/\//i, 'https://').replace(/^ws:\/\//i, 'wss://');
  if (secure !== raw) {
    console.error(`[net] insecure URI in a production build, upgraded: ${raw} -> ${secure}`);
  }
  return secure;
}

const URI = resolveUri(RAW_URI);

// Anonymous auth. SpacetimeDB mints an Identity on first connect and hands
// back a token; we keep it so reopening the link rejoins as the SAME player
// rather than minting a second one. This is the whole no-login story.
const TOKEN_KEY = 'hacky.token';

function readToken(): string | undefined {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined; // private mode / storage disabled
  }
}

function writeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Non-fatal: this session still works, it just won't survive a refresh.
  }
}

// --- module state -------------------------------------------------------

let conn: DbConnection | null = null;
let connecting: Promise<DbConnection> | null = null;
let identityHex = '';
let status: Status = 'idle';
let lastError: Error | null = null;

let subscribedCode: string | null = null;
let subscribing: Promise<void> | null = null;
let wired = false;

// --- change notification ------------------------------------------------
// React subscribes through useSyncExternalStore; the game view polls per
// frame instead and ignores this entirely.

let version = 0;
const listeners = new Set<() => void>();
let flushQueued = false;

function bump(): void {
  version++;
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    for (const listener of listeners) listener();
  });
}

// --- row mapping --------------------------------------------------------
// Generated rows are camelCase client-side even though the module declares
// snake_case columns. Identity becomes a hex string at this boundary so no
// SDK type escapes.

interface PlayerRow {
  identity: { toHexString(): string };
  name: string;
  color: string;
  x: number;
  y: number;
  tools: string[];
  connected: boolean;
}

interface MonsterRow {
  id: number;
  kind: string;
  x: number;
  y: number;
  hp: number;
}

interface RoomRow {
  code: string;
  host: { toHexString(): string };
  topic: string;
  contentJson: string;
  phase: string;
  currentWorld: number;
}

function toPlayer(row: PlayerRow): Player {
  return {
    identity: row.identity.toHexString(),
    name: row.name,
    color: row.color,
    x: row.x,
    y: row.y,
    tools: [...row.tools],
    connected: row.connected,
  };
}

// --- connection ---------------------------------------------------------

function connectOnce(): Promise<DbConnection> {
  if (conn) return Promise.resolve(conn);
  // StrictMode mounts twice; without this guard that opens two sockets.
  if (connecting) return connecting;

  status = 'connecting';
  bump();

  connecting = new Promise<DbConnection>((resolve, reject) => {
    DbConnection.builder()
      .withUri(URI)
      .withDatabaseName(DB_NAME)
      .withToken(readToken())
      .onConnect((connection, identity, token) => {
        conn = connection;
        identityHex = identity.toHexString();
        writeToken(token);
        status = 'connected';
        lastError = null;
        wireTableCallbacks(connection);
        bump();
        resolve(connection);
      })
      .onConnectError((_ctx, error) => {
        connecting = null;
        status = 'error';
        lastError = error;
        bump();
        reject(error);
      })
      .onDisconnect(() => {
        conn = null;
        connecting = null;
        subscribedCode = null;
        subscribing = null;
        wired = false;
        status = 'idle';
        bump();
      })
      .build();
  });

  return connecting;
}

function wireTableCallbacks(connection: DbConnection): void {
  if (wired) return;
  wired = true;
  for (const table of [
    connection.db.player,
    connection.db.monster,
    connection.db.room,
    connection.db.boss,
  ]) {
    table.onInsert(bump);
    table.onDelete(bump);
    table.onUpdate(bump);
  }
}

// Room codes are [A-Z2-9]{6} by construction; anything else cannot be a real
// code, and stripping it keeps the value safe to inline into SQL.
function sanitizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
}

function subscribeRoom(connection: DbConnection, code: string): Promise<void> {
  if (subscribedCode === code) return Promise.resolve();
  if (subscribing) return subscribing;

  subscribing = new Promise<void>((resolve, reject) => {
    connection
      .subscriptionBuilder()
      .onApplied(() => {
        subscribedCode = code;
        subscribing = null;
        bump();
        resolve();
      })
      .onError(() => {
        subscribing = null;
        reject(new Error(`subscription failed for room ${code}`));
      })
      .subscribe([
        `SELECT * FROM player WHERE room_code = '${code}'`,
        `SELECT * FROM monster WHERE room_code = '${code}'`,
        `SELECT * FROM room WHERE code = '${code}'`,
      ]);
  });

  return subscribing;
}

/**
 * The boss is subscribed on its own. It arrived later than the rest and a
 * rejected query here must not take the room, players and monsters with it --
 * that turned one bad subscription into "could not connect".
 */
function subscribeBoss(connection: DbConnection): void {
  try {
    connection
      .subscriptionBuilder()
      .onError(() => console.warn('[net] boss subscription rejected; fight will be local'))
      // No WHERE: every other table has a btree index on room_code and this
      // one only has the primary key, which a subscription filter cannot use.
      // The table holds one row per active room, so taking all of it is
      // cheap, and boss() filters to this room anyway.
      .subscribe(['SELECT * FROM boss']);
  } catch (err) {
    console.warn('[net] boss subscription threw', err);
  }
}

// --- the boundary -------------------------------------------------------

export const net = {
  async connect(roomCode: string): Promise<void> {
    const code = sanitizeCode(roomCode);
    const connection = await connectOnce();
    if (code) {
      await subscribeRoom(connection, code);
      subscribeBoss(connection);
    }
  },

  players(): Player[] {
    if (!conn) return [];
    return [...conn.db.player.iter()].map(row => toPlayer(row as unknown as PlayerRow));
  },

  monsters(): Monster[] {
    if (!conn) return [];
    return [...conn.db.monster.iter()].map(row => {
      const m = row as unknown as MonsterRow;
      return { id: m.id, kind: m.kind, x: m.x, y: m.y, hp: m.hp };
    });
  },

  room(): Room {
    const empty: Room = {
      code: subscribedCode ?? '',
      topic: '',
      contentJson: '',
      phase: 'lobby',
      currentWorld: 0,
    };
    if (!conn) return empty;
    for (const row of conn.db.room.iter()) {
      const r = row as unknown as RoomRow;
      if (!subscribedCode || r.code === subscribedCode) {
        return {
          code: r.code,
          topic: r.topic,
          contentJson: r.contentJson,
          phase: r.phase,
          currentWorld: r.currentWorld,
        };
      }
    }
    return empty;
  },

  callReducer(name: string, ...args: any[]): void {
    if (!conn) {
      console.warn('[net] callReducer before connect:', name);
      return;
    }
    switch (name) {
      // Callers pass positional args; the generated reducers take one object.
      case 'createRoom':
        conn.reducers.createRoom({});
        return;
      case 'joinRoom':
        conn.reducers.joinRoom({ code: args[0], name: args[1] });
        return;
      case 'setPosition':
        conn.reducers.setPosition({ x: args[0], y: args[1] });
        return;
      case 'swing':
        conn.reducers.swing({ monsterId: args[0], toolId: args[1] });
        return;
      case 'startGame':
        conn.reducers.startGame({ contentJson: args[0] });
        return;
      case 'bossReset':
        conn.reducers.bossReset({ maxHp: args[0] });
        return;
      case 'bossHit':
        conn.reducers.bossHit({ damage: args[0] });
        return;
      case 'bossMode':
        conn.reducers.bossMode({ mode: args[0] });
        return;
      case 'advanceWorld':
        conn.reducers.advanceWorld({ world: args[0] });
        return;
      case 'setTopic':
        conn.reducers.setTopic({ topic: args[0] });
        return;
      case 'startFinalBattle':
        conn.reducers.startFinalBattle({});
        return;
      case 'leaveRoom':
        conn.reducers.leaveRoom({});
        return;
      case 'disbandRoom':
        conn.reducers.disbandRoom({});
        return;
      default:
        console.warn('[net] unknown reducer:', name, args);
        return;
    }
  },

  identity(): string {
    return identityHex;
  },

  // --- additions; none of the above changed shape ---

  status(): Status {
    return status;
  },

  error(): Error | null {
    return lastError;
  },

  /**
   * Whether the subscribed room row actually exists. room() synthesises an
   * empty Room when it does not, so this is how the app tells "still loading"
   * apart from "the host disbanded the party".
   */
  hasRoom(): boolean {
    if (!conn || !subscribedCode) return false;
    for (const row of conn.db.room.iter()) {
      if ((row as unknown as RoomRow).code === subscribedCode) return true;
    }
    return false;
  },

  /** Host badge without leaking Identity into the Room type. */
  isHost(): boolean {
    if (!conn || !identityHex) return false;
    for (const row of conn.db.room.iter()) {
      const r = row as unknown as RoomRow;
      if (r.host.toHexString() === identityHex) return true;
    }
    return false;
  },

  /**
   * Host flow. create_room cannot return its code, so subscribe to rooms this
   * identity hosts, fire the reducer, and wait for the row to land.
   */
  createRoom(): Promise<string> {
    // StrictMode calls this twice; without the guard that creates two rooms.
    creating ??= createRoomOnce().finally(() => {
      creating = null;
    });
    return creating;
  },




  /** Subscribe to cache changes. Returns an unsubscribe function. */
  onChange(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** The room's shared boss, or null before the fight has been started. */
  boss(): { hp: number; maxHp: number; down: boolean; mode: string } | null {
    if (!conn || !subscribedCode) return null;
    for (const row of conn.db.boss.iter()) {
      const b = row as unknown as {
        roomCode: string;
        hp: number;
        maxHp: number;
        down: boolean;
        mode: string;
      };
      if (b.roomCode === subscribedCode) {
        return { hp: b.hp, maxHp: b.maxHp, down: b.down, mode: b.mode };
      }
    }
    return null;
  },

  /** Monotonic counter for useSyncExternalStore. */
  getVersion(): number {
    return version;
  },
};

let creating: Promise<string> | null = null;

async function createRoomOnce(): Promise<string> {
  const connection = await connectOnce();

  // create_room cannot return its code, so watch the rooms this identity
  // hosts and wait for the row to land.
  await new Promise<void>((resolve, reject) => {
    connection
      .subscriptionBuilder()
      .onApplied(() => resolve())
      .onError(() => reject(new Error('host room subscription failed')))
      .subscribe([`SELECT * FROM room WHERE host = 0x${identityHex}`]);
  });

  const existing = findHostedCode(connection, true);
  if (existing) {
    await net.connect(existing);
    return existing;
  }

  const code = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timed out creating room')), 10000);
    const check = () => {
      const found = findHostedCode(connection, true);
      if (!found) return;
      clearTimeout(timer);
      listeners.delete(check);
      resolve(found);
    };
    listeners.add(check);
    connection.reducers.createRoom({});
    check();
  });

  await net.connect(code);
  return code;
}

/**
 * A room you host that is still in the lobby. Rooms you left mid-run are not
 * reusable: reusing one dropped you straight back into whatever world it had
 * reached, skipping the lobby entirely. Only whoever has old rooms sees it,
 * which is why it looked like it only happened to one person.
 */
function findHostedCode(connection: DbConnection, lobbyOnly = false): string | null {
  for (const row of connection.db.room.iter()) {
    const r = row as unknown as RoomRow;
    if (r.host.toHexString() !== identityHex) continue;
    if (lobbyOnly && r.phase !== 'lobby') continue;
    return r.code;
  }
  return null;
}

// --- React glue --------------------------------------------------------
// Kept in this file on purpose. Splitting the hook out meant useNet.ts
// imported ./index while ./index re-exported useNet -- a cycle of exactly the
// kind that already bit us server-side.

export interface NetState {
  status: Status;
  error: Error | null;
  /** Bumps on every cache change; read it to make a component reactive. */
  version: number;
}

const subscribeToNet = (listener: () => void) => net.onChange(listener);
const getVersionSnapshot = () => net.getVersion();

export function useNet(roomCode: string | null): NetState {
  const version = useSyncExternalStore(subscribeToNet, getVersionSnapshot, getVersionSnapshot);

  // The connection is built here: once per room code, not per render.
  const pending = useMemo(
    () => (roomCode ? net.connect(roomCode) : Promise.resolve()),
    [roomCode]
  );

  useEffect(() => {
    let cancelled = false;
    pending.catch((err: unknown) => {
      if (!cancelled) console.error('[net] connect failed', err);
    });
    return () => {
      cancelled = true;
    };
  }, [pending]);

  return { status: net.status(), error: net.error(), version };
}

// Dev-only handle for poking at live state from the browser console.
if (import.meta.env.DEV) {
  (window as unknown as { __net?: typeof net }).__net = net;
}

export default net;
