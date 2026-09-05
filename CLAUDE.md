<!-- ==========================================================
     SHARED CONTEXT — PASTE BLOCK GOES HERE
     Juan has not supplied this yet. Replace this comment with
     the shared context block so both devs get it every session.
     ========================================================== -->

# hacky — shared context

_(Awaiting the SHARED CONTEXT block.)_

---

## Ownership (do not edit outside your lane)

- **Juan:** `/module`, `/client/src/lobby`, `/client/src/net`, `/client/src/controls`
- **Ean:** `/client/src/game`

Ean: never import the SpacetimeDB SDK directly. All database access goes
through `/client/src/net`.

## Layout

```
module/            SpacetimeDB module (TypeScript). Do not restructure.
client/            Vite + React + TypeScript
  src/lobby/       join, avatars, topic input, QR
  src/net/         connection, subscriptions, reducer calls
  src/controls/    thumbstick + action buttons
  src/game/        Ean's. Leave empty.
  src/module_bindings/   generated, committed — do not gitignore
content/           content.json per topic
```

See `README.md` for the CLI commands.
