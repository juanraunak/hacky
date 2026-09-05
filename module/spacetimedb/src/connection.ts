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
  });
});

export const joinRoom = spacetimedb.reducer(
  { code: t.string(), name: t.string() },
  (ctx, { code, name }) => {
    if (!ctx.db.room.code.find(code)) {
      throw new SenderError(`no room with code ${code}`);
    }

    // One identity is only ever one player row; a second would be a duplicate
    // player in the world. So an existing row is either a reconnect to the same
    // room or a move to a different one.
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      ctx.db.player.identity.update({
        ...existing,
        room_code: code,
        // Tools belong to the room, so a switch starts empty like a fresh join.
        tools: existing.room_code === code ? existing.tools : [],
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
      tools: [],
      connected: true,
    });
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
