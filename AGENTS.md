# hacky — shared context

Read by both devs every session. Keep it short and true; delete anything
that stops being accurate.

## The game

A room-based multiplayer learning game. One player hosts, gets a 6-character
room code, and shares it (QR in the lobby). Everyone joins on their phone,
picks a name and colour, and drops into a shared world with a thumbstick and
action buttons.

## Scope: one topic, built properly

The topic is **Newton's laws of motion**. Not "any topic" — one.

The engine stays topic-agnostic: all content lives in `content.json` and nothing
about Newton is hardcoded. But tonight we ship one polished experience rather
than a shallow generic one. Dynamic topics are the roadmap, not the demo.

## Structure: three worlds

Played in sequence. The party travels together.

`room.phase` is the agreed value: `lobby | world1 | world2 | world3 | done`,
with `room.current_world` as `0` in the lobby then `1..3`. The lobby hands off
to the game the moment phase leaves `lobby`; everything after that is the
game's business. `start_game` sets `world1` / `1`; advancing from there is
Ean's.

**World 1 — The Orchard.** Spawn beside Newton under the tree, friends nearby,
book, apple. The host starts; Newton narrates what physics looked like before
him, walks to the tree, and the apple falls. History framing the physics.

**World 2 — Newton's House.** The three laws taught through props and weapons.
Small bosses, baby apples. This is where the effectiveness matrix lives and
where players learn their tools by using them.

**World 3 — The Giant Apple.** Boss fight, only winnable with tools learned in
World 2. The boss is the assessment and is never called one.

## The core mechanic (unchanged)

Monsters have **visible properties**. Players carry **tools in limited slots**.
A **hidden matrix** decides `"strong"`, `"weak"`, or `"none"`.

**The matrix is never shown.** No quizzes, no tooltips, no text questions.
Players infer it by swinging and watching what happens. Story and NPC dialogue
are welcome — a quiz UI is not.

The matrix *is* the subject. Someone who internalises it has learned the topic;
someone who internalises a wrong one has been taught something false. Content
authoring is a correctness problem, not a flavour problem. Traps — pairings
intuition says should work and don't — are the point, not a garnish.

A boss requires two or more specific tools, so nobody finishes by mashing one
button.

> `content/newton.json` is **the contract**: the filename is fixed and the lobby
> imports it. The contents are still the wave-particle placeholder and need
> rewriting for Newton's laws. That rewrite is Ean's, and he can change the file
> freely without touching the lobby.

## Stack

- **Server:** SpacetimeDB 2.9.0 TypeScript module, published to Maincloud as
  database `hacky`. The module *is* the backend — there is no other server.
- **Client:** Vite + React + TypeScript, npm. No router, no state library, no
  UI kit. Keep it that way unless we both agree otherwise.
- `module/spacetime.local.json` holds the local server config and is
  gitignored. The database name is `hacky`; that is the only fact you need
  from it.

## Ownership

**Ean owns the game — server and client both.**

| Path | What |
| --- | --- |
| `module/spacetimedb/src/game.ts` | monster, worlds, progression, bosses, and **any schema he needs** |
| `/client/src/game` | the entire engine: worlds, characters, props, bosses |
| `/content` | `content.json`, his to own and rewrite for Newton's laws |

Ean adds and changes game tables freely. **No permission required.**

**Juan owns connectivity.**

| Path | What |
| --- | --- |
| `module/spacetimedb/src/connection.ts` | room and player tables |
| `/client/src/lobby` | join, avatars, topic, QR |
| `/client/src/net` | connection, subscriptions, reducer calls |
| `/client/src/controls` | thumbstick and action buttons |

**Shared:** `module/spacetimedb/src/schema.ts` and
`module/spacetimedb/src/index.ts`. Either of us may edit them — tell the other
afterwards.

### The rule that still holds

Adding tables or columns is safe and auto-migrates. **Retyping or reordering an
existing column needs `publish -c`, which WIPES all live rooms.** Warn the other
person before you do it.

## The two client interface points

Everything crossing between Juan's code and Ean's code goes through exactly
these two. **Both signatures are final.** Real implementations land under them
without the game layer changing a line, so build against them now.

**1. `net` — the sole SpacetimeDB boundary.** `/client/src/net`

```ts
net.connect(roomCode: string): Promise<void>
net.players():  Player[]
net.monsters(): Monster[]
net.room():     Room
net.callReducer(name: string, ...args: unknown[]): void
net.identity(): string
```

The game layer calls these and nothing else. It never imports the SpacetimeDB
SDK or `module_bindings`. That is what lets the netcode be swapped, faked, or
rewritten without touching the game.

Reducer names for `callReducer`: `createRoom`, `joinRoom`, `setPosition`,
`swing`, `startGame`, `setTopic`.

`net` also carries additions that do not change any signature above:
`status()`, `error()`, `isHost()`, `createRoom()`, `onChange()`, `getVersion()`,
and the `useNet(roomCode)` hook, which builds the connection inside `useMemo`
and re-renders on cache changes. The game view does not need the hook: it polls
`net.players()` per animation frame, which is what interpolation wants anyway.

Reads come from the local cache, scoped by three room subscriptions. Auth is
anonymous: SpacetimeDB mints an Identity on first connect and the token is kept
in `localStorage`, so reopening the link rejoins as the same player.

**2. `<Controls />` — the sole input boundary.** `/client/src/controls`

```tsx
<Controls
  onInput={(vec: { x: number; y: number }) => void}   // normalized
  onAction={(slotIndex: number) => void}              // 0-3
/>
```

The game layer never touches touch or keyboard events. Thumbstick, action
buttons, WASD, and every `preventDefault` live behind this component.

## content.json shape

A **data contract**, not an interface point — both sides read it, neither side
calls the other through it.

```jsonc
{
  "topic": "Newton's laws of motion",
  "tools":    [{ "id", "name", "icon" }],
  "monsters": [{ "id", "name", "props": [], "sprite" }],
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

Shape and rules are Ean's to extend — worlds and progression will need more
than this. The rules above are what makes a matrix teachable, not a schema
someone else has to approve.

**Wiring gotcha:** the server looks up `matrix[toolId][monster.kind]`, so a
monster row's `kind` column must equal the monster's `id` in the content file.

## Damage

`module/spacetimedb/src/game.ts`:

```
strong -> 40    weak -> 10    none -> 0
```

Missing, unknown, or malformed content yields 0 damage and never throws, so bad
content degrades to a dead swing instead of a broken room.

## Scaling

```
slotsPerPlayer = clamp(6 - floor(playerCount / 3), 2, 4)
```

Assigned in `joinRoom` from the tool ids in `room.content_json`.

Two players carry nearly every tool and can solve a room alone with effort.
Fifteen carry two each, so a boss that needs several property-counters landing
together forces specialisation and shouting — which is the point.

Map size stays **fixed**. Monster count scales with player count.

**Not yet in force.** Right now `join_room` and `start_game` hand out the
**full** toolkit — every tool id in `content_json` — because a one-link join
must never drop someone into a running world with nothing to swing. Narrowing
that to `slotsPerPlayer` is progression, and progression is Ean's. The formula
above is the target, not the current behaviour.

## Workflow

We are both pushing to the same repo all night. Pull often.

```bash
# before starting any task
git pull --rebase origin main

# after finishing and testing
git add -A && git commit && git push origin main
```

Publish the module with **`npm run pub`** from the repo root, never a raw
`spacetime publish` — `pub` publishes, regenerates the bindings, and stages
them, which is what keeps `client/src/module_bindings` in sync with the
deployed module.

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
    connection.ts  room/player reducers, lifecycle   (Juan)
    game.ts        monsters, worlds, progression, bosses  (Ean)
client/
  src/lobby/       join, avatars, topic input, QR        (Juan)
  src/net/         connection, subscriptions, reducer calls (Juan)
  src/controls/    thumbstick + action buttons           (Juan)
  src/game/        the whole engine                      (Ean)
  src/placeholder/ throwaway game view, delete once src/game/ exists
  src/module_bindings/   generated, committed — do not gitignore
content/           content.json                          (Ean)
```

`README.md` has the commands.
