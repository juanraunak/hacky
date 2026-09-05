import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';
import type { Ctx } from './schema';

// Room codes: uppercase, 6 chars, no I O 0 1 (unreadable when spoken or printed).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

// Placeholder spawn box, centred on the origin. World coords are the client's
// concern; widen or move this once /client/src/game settles on a world size.
const SPAWN_HALF_EXTENT = 64;

const COLORS = [
  '#e6194b',
  '#3cb44b',
  '#ffe119',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#46f0f0',
  '#f032e6',
  '#bcf60c',
  '#fabebe',
];

function newRoomCode(ctx: Ctx): string {
  for (let attempt = 0; attempt < 64; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[ctx.random.integerInRange(0, CODE_ALPHABET.length - 1)];
    }
    if (!ctx.db.room.code.find(code)) return code;
  }
  throw new SenderError('could not allocate a unique room code');
}

function spawnCoord(ctx: Ctx): number {
  return (ctx.random() * 2 - 1) * SPAWN_HALF_EXTENT;
}

/**
 * The room this caller hosts. Prefer the one they are standing in: a host who
 * opened "/" twice hosts more than one room, and scanning would pick an
 * arbitrary one of them.
 */
function hostedRoom(ctx: Ctx) {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (player) {
    const current = ctx.db.room.code.find(player.room_code);
    if (current && current.host.equals(ctx.sender)) return current;
  }
  for (const room of ctx.db.room.iter()) {
    if (room.host.equals(ctx.sender)) return room;
  }
  return null;
}

/**
 * Every tool id in the room's content. A player who joins mid-game gets the
 * whole kit: a one-link join must never drop someone into a running world with
 * nothing to swing.
 */
function toolkitFor(contentJson: string): string[] {
  if (!contentJson) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return [];
  }
  const tools = (parsed as { tools?: unknown } | null)?.tools;
  if (!Array.isArray(tools)) return [];
  return tools
    .map(tool => (tool as { id?: unknown } | null)?.id)
    .filter((id): id is string => typeof id === 'string');
}

export const init = spacetimedb.init(_ctx => {
  // Called when the module is initially published
});

export const onConnect = spacetimedb.clientConnected(_ctx => {
  // Called every time a new client connects
});

export const onDisconnect = spacetimedb.clientDisconnected(ctx => {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (!player) return;
  ctx.db.player.identity.update({ ...player, connected: false });
});

export const createRoom = spacetimedb.reducer(ctx => {
  ctx.db.room.insert({
    code: newRoomCode(ctx),
    host: ctx.sender,
    topic: '',
    content_json: '',
    phase: 'lobby',
    current_world: 0,
  });
});

export const joinRoom = spacetimedb.reducer(
  { code: t.string(), name: t.string() },
  (ctx, { code, name }) => {
    const room = ctx.db.room.code.find(code);
    if (!room) {
      throw new SenderError(`no room with code ${code}`);
    }

    // Past the lobby, anyone arriving is a late joiner and is equipped in full.
    const toolkit = room.phase === 'lobby' ? [] : toolkitFor(room.content_json);

    // One identity is only ever one player row; a second would be a duplicate
    // player in the world. So an existing row is either a reconnect to the same
    // room or a move to a different one.
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      // Keep the tools they already hold in this room; otherwise equip them.
      // Switching rooms, or reconnecting empty-handed into a running world,
      // both land here.
      const keepTools = existing.room_code === code && existing.tools.length > 0;
      ctx.db.player.identity.update({
        ...existing,
        room_code: code,
        tools: keepTools ? existing.tools : toolkit,
        connected: true,
      });
      return;
    }

    ctx.db.player.insert({
      identity: ctx.sender,
      room_code: code,
      name,
      color: COLORS[ctx.random.integerInRange(0, COLORS.length - 1)],
      x: spawnCoord(ctx),
      y: spawnCoord(ctx),
      tools: toolkit,
      connected: true,
    });
  }
);

/** Leave the party. The row is deleted, so rejoining is a clean first join. */
export const leaveRoom = spacetimedb.reducer(ctx => {
  if (!ctx.db.player.identity.find(ctx.sender)) return;
  ctx.db.player.identity.delete(ctx.sender);
});

/**
 * Host tears the whole party down: every player row, then the room itself.
 * Everyone still connected sees the room vanish and gets bounced to a fresh
 * start. This is what makes the thing testable more than once.
 */
export const disbandRoom = spacetimedb.reducer(ctx => {
  const room = hostedRoom(ctx);
  if (!room) throw new SenderError('only the host can disband the party');
  for (const player of [...ctx.db.player.room_code.filter(room.code)]) {
    ctx.db.player.identity.delete(player.identity);
  }
  ctx.db.room.code.delete(room.code);
});

/**
 * Move the whole party to the next world. Any player may call it -- the worlds
 * are cooperative and the phase is shared, so whoever reaches the portal first
 * takes everyone through. Idempotent: calling it for a world you are already
 * in does nothing.
 */
export const advanceWorld = spacetimedb.reducer(
  { world: t.u32() },
  (ctx, { world }) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new SenderError('not in a room');
    const room = ctx.db.room.code.find(player.room_code);
    if (!room) throw new SenderError('no such room');
    const next = world < 1 ? 1 : world > 4 ? 4 : world;
    const phase = next >= 4 ? 'done' : `world${next}`;
    if (room.phase === phase) return;
    ctx.db.room.code.update({ ...room, phase, current_world: next });
  }
);

export const setTopic = spacetimedb.reducer(
  { topic: t.string() },
  (ctx, { topic }) => {
    const room = hostedRoom(ctx);
    if (!room) throw new SenderError('only the host can set the topic');
    ctx.db.room.code.update({ ...room, topic });
  }
);

export const setPosition = spacetimedb.reducer(
  { x: t.f32(), y: t.f32() },
  (ctx, { x, y }) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new SenderError('not in a room');
    ctx.db.player.identity.update({ ...player, x, y });
  }
);
