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
      phase: t.string(), // lobby | generating | playing | done
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
