import { schema, table, t } from 'spacetimedb/server';
import type { InferSchema, ReducerCtx } from 'spacetimedb/server';

// All tables live here, not beside their reducers. schema() needs every table,
// and reducers need the schema object back, so co-locating the two creates an
// import cycle: connection.ts -> schema -> connection.ts. That cycle fails at
// runtime with "Cannot access 'spacetimedb' before initialization" while
// `spacetime build` still reports success, so keep this file dependency-free.
const spacetimedb = schema({
  room: table(
    { public: true },
    {
      code: t.string().primaryKey(),
      host: t.identity(),
      topic: t.string(),
      content_json: t.string(),
      // lobby | world1 | world2 | world3 | done
      // The lobby hands off to the game as soon as this leaves 'lobby'.
      phase: t.string(),
      // 0 while in the lobby, then 1..3. Appended with a default so the column
      // auto-migrates instead of needing a wiping `publish -c`.
      current_world: t.u32().default(0),
    }
  ),

  player: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      room_code: t.string().index('btree'),
      name: t.string(),
      color: t.string(),
      x: t.f32(),
      y: t.f32(),
      tools: t.array(t.string()),
      connected: t.bool(),
    }
  ),

  monster: table(
    { public: true },
    {
      id: t.u32().primaryKey().autoInc(),
      room_code: t.string().index('btree'),
      kind: t.string(),
      x: t.f32(),
      y: t.f32(),
      hp: t.i32(),
    }
  ),

  // --- World 1 (Newton's tree) -------------------------------------------
  // Added at the end, additive only. Adding tables is a safe migration; see
  // CLAUDE.md gotcha 3. Reducers for these live in world.ts.

  // Where each player stands in the 3D meadow. Separate from player.x/y so the
  // existing player row keeps its shape. heading is radians around +Y.
  player_position: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      room_code: t.string().index('btree'),
      x: t.f32(),
      z: t.f32(),
      heading: t.f32(),
      updated_at: t.timestamp(),
    }
  ),

  // One-shot scripted moments, e.g. the apple falling. A (room, world, name)
  // triple is inserted at most once; fire_world_event ignores repeats, so every
  // client sees the same single row and plays the moment together.
  world_event: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      room_code: t.string().index('btree'),
      world: t.string(),
      name: t.string(),
      fired_at: t.timestamp(),
      fired_by: t.identity(),
    }
  ),

  // What a player is carrying. One row per player; a world item (the apple)
  // is carried by at most one player in a room.
  // One boss per room. Additive, so it auto-migrates.
  boss: table(
    { public: true },
    {
      room_code: t.string().primaryKey(),
      hp: t.i32(),
      max_hp: t.i32(),
      down: t.bool(),
      mode: t.string(),
      mode_since: t.timestamp(),
    }
  ),

  // Append-only record of who reached what. Additive, auto-migrates.
  run_event: table(
    { public: true },
    {
      id: t.u32().primaryKey().autoInc(),
      identity: t.identity(),
      name: t.string(),
      room_code: t.string().index('btree'),
      kind: t.string().index('btree'),
      at: t.timestamp(),
    }
  ),

  // Accounts. The FIRST game is deliberately login-free -- a stranger with a
  // link must never meet a form -- so a row here means somebody came back for
  // a second one. Private: hashes must not be readable by any client.
  account: table(
    { public: false },
    {
      email: t.string().primaryKey(),
      password_hash: t.string(),
      identity: t.identity(),
      created_at: t.timestamp(),
      last_seen_at: t.timestamp(),
      // The module cannot make outbound requests, so the browser sends the
      // welcome mail and flips this back here. See client/src/lobby.
      welcome_sent: t.bool(),
    }
  ),

  // How a sign-in went, for the caller only. The reducer writes the outcome
  // here instead of throwing: a thrown SenderError is awkward to read back
  // through the subscription cache, and a wrong password has to be tellable
  // from a slow network.
  auth_result: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      ok: t.bool(),
      // True only when this call created the account, which is what decides
      // whether a welcome mail goes out.
      created: t.bool(),
      message: t.string(),
      at: t.timestamp(),
    }
  ),

  held_item: table(
    { public: true },
    {
      identity: t.identity().primaryKey(),
      room_code: t.string().index('btree'),
      item: t.string(),
      since: t.timestamp(),
    }
  ),

  // World 2: the apples the portal throws at the party. One row per apple so
  // every phone sees the same ones on the same arcs. The flight is pure
  // interpolation from spawn_at, so nothing has to be streamed per frame.
  study_apple: table(
    { public: true },
    {
      id: t.u64().primaryKey().autoInc(),
      room_code: t.string().index('btree'),
      wave: t.u32(),
      seq: t.u32(),
      size: t.string(), // small | medium | big — all fall at the same rate
      target: t.identity(),
      from_x: t.f32(),
      from_y: t.f32(),
      from_z: t.f32(),
      to_x: t.f32(),
      to_z: t.f32(),
      spawn_at: t.timestamp(),
      dead: t.bool(),
      hit_by: t.identity(),
    }
  ),
});
export default spacetimedb;

export type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;
