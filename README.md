# hacky

SpacetimeDB database name `hacky`, running on Maincloud.

## Setup

```bash
cd client
npm i
npm run dev
```

## Publish the module

```bash
cd module
spacetime publish
```

## Regenerate bindings

From `module/`:

```bash
spacetime generate --lang typescript --out-dir ../client/src/module_bindings
```

Bindings are committed. You should not need to run this unless you changed the module.

## Nuke and republish (schema changes)

```bash
spacetime publish -c
```

Wipes all data. Use when the schema changed and a migration is not possible.

## Ownership

| Folder | Owner |
| --- | --- |
| `/module` | Juan |
| `/client/src/lobby` | Juan |
| `/client/src/net` | Juan |
| `/client/src/controls` | Juan |
| `/client/src/game` | Ean |

Nobody edits the other's folders.

**Ean:** never import the SpacetimeDB SDK. Everything goes through `/client/src/net`.
