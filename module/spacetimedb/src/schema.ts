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
});
export default spacetimedb;

export type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;
