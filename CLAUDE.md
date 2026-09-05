# hacky — shared context

Read by both devs every session. Keep it short and true; delete anything
that stops being accurate.

## The game

A room-based multiplayer learning game. One player hosts, gets a 6-character
room code, and shares it (QR in the lobby). Everyone joins on their phone,
picks a name and colour, and drops into a shared world with a thumbstick and
action buttons.

The host picks a topic. That topic becomes a `content.json`: a set of **tools**
and a set of **monsters**, plus a **matrix** saying what each tool does to each
monster — `"strong"`, `"weak"`, or `"none"`. Players swing tools at monsters and
watch the feedback. That is the whole teaching mechanic.

**There are no quizzes.** Players learn the matrix by experiment, so the matrix
*is* the subject. Someone who internalises it has learned the topic; someone who
internalises a wrong one has been taught something false. Content authoring is
therefore a correctness problem, not a flavour problem. Traps — pairings that
intuition says should work and don't — are the point, not a garnish.

A boss requires two or more specific tools, so nobody finishes by mashing one
button.

See `content/duality.json` for a complete worked example (wave-particle
duality: 5 tools, 7 monsters, all 35 cells filled).

## Stack

- **Server:** SpacetimeDB 2.9.0 TypeScript module, published to Maincloud as
  database `hacky`. The module *is* the backend — there is no other server.
- **Client:** Vite + React + TypeScript, npm. No router, no state library, no
  UI kit. Keep it that way unless we both agree otherwise.
- `module/spacetime.local.json` holds the local server config and is
  gitignored. The database name is `hacky`; that is the only fact you need
  from it.

## Ownership

| Folder | Owner |
| --- | --- |
| `/module` | Juan |
| `/client/src/lobby` | Juan |
| `/client/src/net` | Juan |
| `/client/src/controls` | Juan |
| `/client/src/game` | Ean |
| `/content` | Juan |

Nobody edits the other's folders.

## The two client interface points

Everything crossing between Juan's code and Ean's code goes through exactly
these two. If you need something that isn't here, ask for it to be added rather
than reaching around.

**1. `/client/src/net` — the only code that touches SpacetimeDB.**
Ean: never import the SpacetimeDB SDK or `module_bindings` directly. `/net` owns
the connection, the subscriptions, and every reducer call, and hands `/game`
plain data and plain callbacks. This is what lets the netcode change without
touching the game, and lets the game run against fakes.

**2. `content.json` — the content contract.**
The `"strong" | "weak" | "none"` vocabulary is shared. The server turns it into
damage; the client renders hit feedback from the same three words. Neither side
invents a fourth value.

## content.json shape

```jsonc
{
  "topic": "wave-particle duality",
  "tools":    [{ "id", "name", "icon" }],            // 5
  "monsters": [{ "id", "name", "props": [], "sprite" }], // 7
  "matrix":   { "<toolId>": { "<monsterId>": "strong" | "weak" | "none" } },
  "boss":     { "id", "name", "props": [], "requires": ["<toolId>", ...] },
  "lore":     { "<entityId>": "one sentence, shown AFTER a correct hit" }
}
```

Rules a content file must satisfy:

- The matrix is **complete** — every tool against every monster, no gaps.
- Every tool is `"strong"` against at least one monster and `"none"` against at
  least one, so no tool is a universal key and none is dead weight.
- At least two traps.
- The boss requires 2+ tools.
- `lore` covers every tool id, monster id, and the boss id.

**Wiring gotcha:** the server looks up `matrix[toolId][monster.kind]`, so a
monster row's `kind` column must equal the monster's `id` in the content file.

## Damage

`module/spacetimedb/src/game.ts`:

```
strong -> 40    weak -> 10    none -> 0
```

Missing, unknown, or malformed content yields 0 damage and never throws, so bad
content degrades to a dead swing instead of a broken room.

There is **no HP or difficulty scaling rule yet** — nothing currently spawns
monsters or sets their starting HP. When we add one, it goes here.

## Module gotchas — SpacetimeDB 2.9.0

Each of these cost us real time. All four are verified, not folklore.

**1. `index.ts` must RE-EXPORT, not bare-import.**
`import './game'` does *not* register reducers. The build passes, the publish
passes, and the module ships with **zero reducers and no error at any step** —
the first sign is `spacetime generate` offering to delete your reducer files.
Registration reads the entry file's *named exports*. The entry is:

```ts
export * from './connection';
export * from './game';
export { default } from './schema';
```

A fourth file must be added as `export *` or it silently ships nothing.

**2. Tables live in `schema.ts`, not alongside their reducers.**
`schema()` needs every table and reducers need the schema object back, so
co-locating them cycles (`index -> connection -> index`) and dies with
`Cannot access 'spacetimedb' before initialization`. `spacetime build` reports
**SUCCESS** on top of that fatal error. Keep `schema.ts` importing nothing of
ours.

**3. Adding columns or tables is safe. Retyping or reordering an existing
column is not** — it needs `publish -c`, which **WIPES all live rooms**. Add
new columns at the end; never renumber.

**4. Always `npm run pub`, never a raw `spacetime publish`.** `pub` publishes,
regenerates the bindings, and stages them, which is what keeps
`client/src/module_bindings` in sync with the deployed module. Bindings are
committed so nobody else has to run the CLI; a raw publish silently breaks that
promise.

## Layout

```
module/
  spacetimedb/src/
    index.ts       entry: re-exports only (see gotcha 1)
    schema.ts      all tables + schema() + Ctx type
    connection.ts  room/player reducers, lifecycle
    game.ts        monster reducers, damage
client/
  src/lobby/       join, avatars, topic input, QR
  src/net/         connection, subscriptions, reducer calls
  src/controls/    thumbstick + action buttons
  src/game/        Ean's
  src/module_bindings/   generated, committed — do not gitignore
content/           content.json per topic
```

`README.md` has the commands.
