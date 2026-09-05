import { t, SenderError } from 'spacetimedb/server';
import { Timestamp } from 'spacetimedb';
import spacetimedb from './schema';
import type { Ctx } from './schema';

// World 1 - Newton's tree. Tables are in schema.ts; every reducer the 3D
// meadow needs is here. All of it is additive to the room/player model that
// connection.ts owns: a player still joins a room the same way, this file only
// adds where they stand, what they carry, and which scripted moments have
// already happened.

const ROOM_CODE_SHAPE = /^[A-Z0-9]{1,12}$/;

// The meadow is 120x120 centred on the origin with the tree at z = -18. New
// players land in a loose ring in front of the tree so the party is already
// standing there when the scene loads.
const SPAWN_CENTER_X = 0;
const SPAWN_CENTER_Z = 12;
const SPAWN_RADIUS = 5;

function normaliseCode(raw: string): string {
  const code = raw.trim().toUpperCase();
  if (!ROOM_CODE_SHAPE.test(code)) {
    throw new SenderError('room code must be 1-12 letters or digits');
  }
  return code;
}

function roomOf(ctx: Ctx): string {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (!player) throw new SenderError('not in a room');
  return player.room_code;
}

// Enter the meadow with a room code straight from the link. If the room does
// not exist yet it is created with this code, so a bare link works before the
// lobby has run; if it does exist (lobby ran create_room / join_room) the room
// is left alone and this is just a reconnect for the player.
export const enterWorld = spacetimedb.reducer(
  { roomCode: t.string(), name: t.string() },
  (ctx, { roomCode, name }) => {
    const code = normaliseCode(roomCode);

    if (!ctx.db.room.code.find(code)) {
      ctx.db.room.insert({
        code,
        host: ctx.sender,
        topic: '',
        content_json: '',
        phase: 'world1',
        current_world: 1,
      });
    }

    const trimmed = name.trim().slice(0, 16) || 'kid';
    const existing = ctx.db.player.identity.find(ctx.sender);
    if (existing) {
      ctx.db.player.identity.update({
        ...existing,
        room_code: code,
        name: trimmed,
        tools: existing.room_code === code ? existing.tools : [],
        connected: true,
      });
    } else {
      ctx.db.player.insert({
        identity: ctx.sender,
        room_code: code,
        name: trimmed,
        color: '',
        x: 0,
        y: 0,
        tools: [],
        connected: true,
      });
    }

    const pos = ctx.db.player_position.identity.find(ctx.sender);
    if (pos && pos.room_code === code) return; // reconnect: keep your spot

    const angle = ctx.random() * Math.PI * 2;
    const r = SPAWN_RADIUS * (0.4 + 0.6 * ctx.random());
    const row = {
      identity: ctx.sender,
      room_code: code,
      x: SPAWN_CENTER_X + Math.cos(angle) * r,
      z: SPAWN_CENTER_Z + Math.sin(angle) * r,
      heading: Math.PI, // face the tree
      updated_at: ctx.timestamp,
    };
    if (pos) ctx.db.player_position.identity.update(row);
    else ctx.db.player_position.insert(row);

    // Held items belong to a room; switching rooms drops them.
    const held = ctx.db.held_item.identity.find(ctx.sender);
    if (held && held.room_code !== code) ctx.db.held_item.identity.delete(ctx.sender);
  }
);

export const movePlayer = spacetimedb.reducer(
  { x: t.f32(), z: t.f32(), heading: t.f32() },
  (ctx, { x, z, heading }) => {
    const code = roomOf(ctx);
    const row = { identity: ctx.sender, room_code: code, x, z, heading, updated_at: ctx.timestamp };
    if (ctx.db.player_position.identity.find(ctx.sender)) {
      ctx.db.player_position.identity.update(row);
    } else {
      ctx.db.player_position.insert(row);
    }
  }
);

// Insert-once. The second, third, hundredth caller for the same
// (room, world, name) sees nothing happen, which is exactly what makes the
// apple fall on every screen exactly once.
export const fireWorldEvent = spacetimedb.reducer(
  { world: t.string(), name: t.string() },
  (ctx, { world, name }) => {
    const code = roomOf(ctx);
    for (const ev of ctx.db.world_event.room_code.filter(code)) {
      if (ev.world === world && ev.name === name) return;
    }
    ctx.db.world_event.insert({
      id: 0n,
      room_code: code,
      world,
      name,
      fired_at: ctx.timestamp,
      fired_by: ctx.sender,
    });
  }
);

// Pick a world item up. A given item is held by one player per room; if
// someone already has it the call is a silent no-op so two players lunging
// for the apple never both get it.
export const pickUpItem = spacetimedb.reducer({ item: t.string() }, (ctx, { item }) => {
  const code = roomOf(ctx);
  for (const held of ctx.db.held_item.room_code.filter(code)) {
    if (held.item === item) return;
  }
  const row = { identity: ctx.sender, room_code: code, item, since: ctx.timestamp };
  if (ctx.db.held_item.identity.find(ctx.sender)) {
    ctx.db.held_item.identity.update(row);
  } else {
    ctx.db.held_item.insert(row);
  }
});

export const dropItem = spacetimedb.reducer(ctx => {
  ctx.db.held_item.identity.delete(ctx.sender);
});

// Demo helper: forget every scripted moment and held item in the caller's
// room for one world, so the apple can fall again. Anyone in the room may
// call it; it is a party of friends, not a competition.
export const resetWorld = spacetimedb.reducer({ world: t.string() }, (ctx, { world }) => {
  const code = roomOf(ctx);
  const events = [...ctx.db.world_event.room_code.filter(code)].filter(ev => ev.world === world);
  for (const ev of events) ctx.db.world_event.id.delete(ev.id);
  const held = [...ctx.db.held_item.room_code.filter(code)];
  for (const h of held) ctx.db.held_item.identity.delete(h.identity);
  for (const apple of [...ctx.db.study_apple.room_code.filter(code)]) {
    ctx.db.study_apple.id.delete(apple.id);
  }
});

// --- World 2: the study --------------------------------------------------

// Per-player kit. Unlike pick_up_item this has no room exclusivity: the pen,
// and later a sword or a bow, is one each, not one between all of you.
export const equipItem = spacetimedb.reducer({ item: t.string() }, (ctx, { item }) => {
  const code = roomOf(ctx);
  const row = { identity: ctx.sender, room_code: code, item, since: ctx.timestamp };
  if (ctx.db.held_item.identity.find(ctx.sender)) {
    ctx.db.held_item.identity.update(row);
  } else {
    ctx.db.held_item.insert(row);
  }
});

const AppleSpec = t.object('AppleSpec', {
  seq: t.u32(),
  size: t.string(),
  target: t.identity(),
  from_x: t.f32(),
  from_y: t.f32(),
  from_z: t.f32(),
  to_x: t.f32(),
  to_z: t.f32(),
  delay_ms: t.u32(),
});

// One client in the room conducts the fight and calls this once per wave.
// Insert-once per (room, wave): a second caller changes nothing, so two
// clients racing to conduct cannot double-spawn a wave.
export const spawnWave = spacetimedb.reducer(
  { wave: t.u32(), apples: t.array(AppleSpec) },
  (ctx, { wave, apples }) => {
    const code = roomOf(ctx);
    for (const existing of ctx.db.study_apple.room_code.filter(code)) {
      if (existing.wave === wave) return;
    }
    const base = ctx.timestamp.microsSinceUnixEpoch;
    for (const a of apples) {
      ctx.db.study_apple.insert({
        id: 0n,
        room_code: code,
        wave,
        seq: a.seq,
        size: a.size,
        target: a.target,
        from_x: a.from_x,
        from_y: a.from_y,
        from_z: a.from_z,
        to_x: a.to_x,
        to_z: a.to_z,
        spawn_at: new Timestamp(base + BigInt(a.delay_ms) * 1000n),
        dead: false,
        hit_by: ctx.sender,
      });
    }
  }
);

// First swing to land wins. A second caller finds it already dead and stops,
// so two players hitting the same apple never double-count.
export const killApple = spacetimedb.reducer({ appleId: t.u64() }, (ctx, { appleId }) => {
  const apple = ctx.db.study_apple.id.find(appleId);
  if (!apple || apple.dead) return;
  const player = ctx.db.player.identity.find(ctx.sender);
  if (!player || player.room_code !== apple.room_code) return;
  ctx.db.study_apple.id.update({ ...apple, dead: true, hit_by: ctx.sender });
});

export const clearStudy = spacetimedb.reducer(ctx => {
  const code = roomOf(ctx);
  for (const apple of [...ctx.db.study_apple.room_code.filter(code)]) {
    ctx.db.study_apple.id.delete(apple.id);
  }
});
