# hacky

A room-based multiplayer learning game. SpacetimeDB database `hacky` on
Maincloud.

**Topic: Newton's laws of motion.** The engine is topic-agnostic — all content
lives in `content.json` — but we are shipping one polished topic rather than a
shallow generic one. Dynamic topics are the roadmap, not the demo.

Three worlds, played in sequence, party travelling together:

1. **The Orchard** — Newton under the tree; the apple falls. History framing the physics.
2. **Newton's House** — the three laws taught through props and weapons. Small bosses, baby apples. Where the matrix lives.
3. **The Giant Apple** — boss fight, winnable only with tools learned in World 2.

Monsters have visible properties, players carry tools in limited slots, and a
hidden matrix decides strong / weak / none. The matrix is never shown. No
quizzes, no tooltips, no text questions — players infer it by swinging and
watching. Story and NPC dialogue are fine; a quiz UI is not.

## Setup

```bash
cd client
npm i
npm run dev
```

## Workflow

We are both pushing to the same repo all night. Pull often.

```bash
# before starting any task
git pull --rebase origin main

# after finishing and testing
git add -A && git commit && git push origin main
```

## Publish the module

From the repo root:

```bash
npm run pub
```

Publishes, regenerates the TypeScript bindings into
`client/src/module_bindings`, and stages them. **Never use a raw
`spacetime publish`** — the committed bindings would drift from the deployed
module, and the other person would not find out until their client broke.

Bindings are committed, so nobody needs the CLI just to run the client.

## Schema changes

Adding tables or columns is safe and auto-migrates.

Retyping or reordering an existing column needs:

```bash
cd module && spacetime publish -c
```

which **WIPES all live rooms**. Warn the other person first.

## Ownership

**Ean owns the game, server and client both:**

| Path | What |
| --- | --- |
| `module/spacetimedb/src/game.ts` | monster, worlds, progression, bosses, and any schema he needs |
| `client/src/game` | the entire engine: worlds, characters, props, bosses |
| `content` | `content.json`, his to own and rewrite for Newton's laws |

Ean adds and changes game tables freely. No permission required.

**Juan owns connectivity:**

| Path | What |
| --- | --- |
| `module/spacetimedb/src/connection.ts` | room and player tables |
| `client/src/lobby` | join, avatars, topic, QR |
| `client/src/net` | connection, subscriptions, reducer calls |
| `client/src/controls` | thumbstick and action buttons |

**Shared:** `module/spacetimedb/src/schema.ts` and
`module/spacetimedb/src/index.ts`. Either may edit; tell the other after.

**Ean:** never import the SpacetimeDB SDK from the client. Everything goes
through `client/src/net`.

## Known gap

`content/newton.json` is the contract — the filename is fixed and the lobby
imports it. Its contents are still the wave-particle placeholder and need
rewriting for Newton's laws. That is Ean's, and he can rewrite the file freely
without touching the lobby.

See `CLAUDE.md` for the full shared context and the SpacetimeDB 2.9.0 gotchas.
