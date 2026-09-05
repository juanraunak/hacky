# World 2 — Newton's study

Built on top of World 1, which is unchanged in behaviour. Entering the cottage
door in the meadow cuts to black for a second and puts the whole party in the
study.

## What works, and how it was verified

| Thing | Verified |
| --- | --- |
| Entry: cottage door → black cut → study, party together | Fired `study_entered` from the CLI, loaded a client, saw the study render |
| The room: dim, two flickering candles, papers, desk, bookshelf, Newton | Screenshot |
| Newton walks and teaches, routing around his own desk | Screenshot mid-stride, bubble typing |
| Drop test: stone, pen, feather; pick up and drop | Screenshot with the stone on the floor and the pen in hand |
| Portal rises, candles gutter, rumble | Fired `study_portal`, screenshot |
| Pause card with Ready | Rendered while `study_portal` exists and `study_ready` does not |
| Five waves of apples | Fired `study_ready`, wave 1 appeared as three `study_apple` rows with the right sizes |
| Weapon rack, three types, stock from the party size | Screenshot: shields and swords hanging on the wall |
| Oak post, swinging sandbag, wall torches | Screenshot |
| `equip_item` reducer | `spacetime call hacky-world1 equip_item '"sword"'` → row became `sword` |
| `reset_world` clears the study | Held items and apples both gone after the call |
| Build | `tsc -b` clean, `vite build` passes, `oxlint` no errors |

Not verified: two real devices in the same room at once, and a phone. Everything
multiplayer is driven off database rows rather than local state, and it was
exercised with a browser client and a CLI client in the same room, but I have
not held two handsets.

## The three laws

Each weapon is one law, and the law is the mechanic. Take the numbers out of
`world2/laws.ts` and the weapon stops working. There is nothing here to read
and then ignore.

**Shield — first law.** A sandbag swings on a rope from the ceiling and keeps
swinging. Hold to brace. Braced, the forces cancel and you do not move at all,
and you get a green HELD. Not braced, its momentum becomes yours and it throws
you three units. The bag does not care which.

**Sword — second law.** Hold to wind up, release to swing. The charge bar has a
notch on it. Release below the notch and the blade slides off the oak post with
a grey "…nothing". Release above it and it takes a chip out of the post, which
stays chipped. Same blade, same arm, different acceleration.

**Gun — third law.** Firing sends a bolt away from you and shoves you backwards
by the same push. The recoil is applied to your position over a quarter of a
second, so it moves you whatever you are doing about it.

## Every call I made on an open decision

- **World id.** Study events use world `world1` with `study_` prefixes rather
  than a second world id, so the Reset button clears the meadow and the study
  together and the store needed no second event map.
- **One conductor.** Wave spawning is done by whichever connected player has the
  lowest identity. No election; if they leave, the next one picks it up on the
  following frame. `spawn_wave` is insert-once per wave so a race cannot
  double-spawn.
- **Apple targeting.** The brief says apples fall toward the nearest player.
  With several players that would dogpile one person, so apples round-robin the
  party and land at that player's position at spawn time, with jitter. The
  landing point is fixed at spawn so every client animates the identical arc.
- **The pen is everyone's.** There is one quill on the desk, but the fight needs
  one each. Dropping it fires the event and every client equips itself.
- **Newton speaks locally.** Beats are triggered by database events, so the room
  hears the same lecture, but the bubble itself is client-side. The "it has no
  legs" line and the three law lessons fire only for the player they happened to.
- **Feather stays unexplained.** He says it is a story for another time and
  walks off. Resolving it would spoil the one exception in the lesson.
- **No World 3.** The cellar door opens onto black and stops, as specified. It is
  not wired to Juan's `world3` phase.
- **Sound.** Synthesised with WebAudio, no assets: a low swell for the portal and
  a knock for impacts. Every call is wrapped, so a browser refusing audio is
  simply silence.
- **Torches.** The far half of the room was unlit and unusable. Two wall torches
  catch when the portal opens, which is when that end starts to matter. The art
  doc allows torches as flickering orange point lights.

## Tables and reducers added

Added to `module/spacetimedb/src/schema.ts` and `world.ts`. All additive, so the
publish auto-migrated and no live room was wiped.

```
study_apple
  id u64 pk autoInc, room_code string btree, wave u32, seq u32,
  size string, target identity,
  from_x f32, from_y f32, from_z f32, to_x f32, to_z f32,
  spawn_at timestamp, dead bool, hit_by identity
```

```
equip_item(item: string)
    Per-player kit, no room exclusivity. A pen each, not one between all.

spawn_wave(wave: u32, apples: AppleSpec[])
    AppleSpec { seq u32, size string, target identity,
                from_x/from_y/from_z f32, to_x/to_z f32, delay_ms u32 }
    Insert-once per (room, wave).

kill_apple(appleId: u64)
    First swing to land wins; a second caller finds it dead and stops.

clear_study()
    Drops every apple row for the room.

reset_world(world: string)   -- existing, extended to clear study_apple too
```

Event names used with the existing `fire_world_event`, all under world `world1`:
`study_entered`, `study_stone`, `study_pen`, `study_feather`, `study_portal`,
`study_ready`, `study_fight_done`, `study_cellar`.

## For Juan

Nothing is required of you. The study runs off the same connection World 1
already opened, and the lobby hands off exactly as before.

Two things worth knowing:

1. **`NewtonGame` now owns the connection.** `App.tsx` renders
   `<NewtonGame roomCode name resetOnEntry forcedCamera />` instead of
   `<World1 />`. It opens the connection and switches between the meadow and the
   study itself. `World1` no longer connects.

2. **A connection bug is fixed in `world1/sync.ts`.** The socket was keyed on the
   player's display name, which arrives a moment after your net layer connects.
   The name changing tore down a socket that was still opening, and the aborted
   socket's error then overwrote the live connection's state, leaving the game
   stuck on "Lost the meadow". It is now keyed on the room code alone, and a
   generation counter stops a stale connection writing to the store. If you see
   the same shape of bug in `/client/src/net`, that is the cause.

## Publish status

Done. `spacetime publish hacky-world1` succeeded and bindings were regenerated
into `client/src/module_bindings`; both are committed. Module logs show
`Creating table study_apple` and `Database updated`.

One standing caveat: the lobby talks to database `hacky` and the game talks to
`hacky-world1`, because the Maincloud account logged in on this machine is not a
collaborator on `hacky`. Both use the same token so identities match. Once
someone with access runs `npm run pub`, change the one line in
`world2/../world1/sync.ts` that reads `'hacky-world1'` back to `'hacky'`.

## Time spent

| Section | Roughly |
| --- | --- |
| Module tables and reducers, publish, bindings | 20 min |
| The room, desk, candles, bookshelf | 35 min |
| Drop test | 30 min |
| Portal and notebook | 25 min |
| The fight, waves, hit and miss | 45 min |
| Chasing the connection bug | 40 min |
| Newton's walk rig and the teaching script | 40 min |
| Weapon wall, three laws, practice objects | 60 min |
| Screenshots and verification throughout | 35 min |
