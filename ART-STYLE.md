# Art style — one page, no exceptions

Read this before making anything the player sees: lobby, HUD, world, monsters, cards, buttons.

## The look in one sentence

Cel-shaded anime with arcade colour. Hard light bands, black ink outlines, flat saturated paint, chunky readable shapes, and UI that looks like a comic panel. Think a Saturday-morning anime fight scene rendered like a bright kart racer. Not pixel art. Not realistic. Not soft.

## Reference points (style only — we never copy a character or asset)

- Shading: modern shonen anime cel look (three hard bands, no gradients)
- Colour and chunkiness: bright kart racers, mascot platformers
- UI: comic panels — thick black borders, hard offset shadows, punchy display type

## Rendering rules (3D)

1. Every material is toon-shaded with exactly three bands: shadow, mid, light. No smooth gradients anywhere.
2. Every object has a black ink outline, ~4–5% of its size. Inverted hull, not a post-effect. Small parts (horns, spikes, hair) get thicker outlines (7–10%) so they read.
3. Flat colour. One base colour per part. No textures, no roughness maps, no decals. Colour variation comes from separate parts, not from paint on a part.
4. Light: one warm key light casting hard shadows, one cool hemisphere fill. Torches are orange point lights with flicker. Nothing else.
5. Camera: top-down at ~52° tilt, follows the player, shakes on impact. Encounters cut to a low side angle looking up at the beast.
6. Shapes: chunky and readable from across the room. If a silhouette needs a label to be understood, it's wrong.

## Palette

Backgrounds and world
- Void / sky: `#141426` (deep navy-black)
- Dungeon floor: `#7d68a0` / `#6e5a8c` checker
- Dungeon wall: `#5b6b8f`
- Torch flame: `#ffb03a`
- Ink (all outlines, all borders, all text strokes): `#111111`

UI and accents
- Paper (cards, panels): `#fff8e7`
- Gold (primary buttons, chips, zone name): `#ffd93b`
- Strong hit: `#ff4d4d` · Weak hit: `#ffb02e` · Useless hit: `#8a8a9a`

Monster slot colours (topic JSON uses these names; nothing else picks them)
- blue `#3aa0ff` · gold `#ffc72c` · red `#ff4d4d` · green `#4be36b` · purple `#b06cff` · orange `#ff8c3a` · teal `#2fd6c4` · pink `#ff7ad1` · white `#f3f3f3` · black `#2a2a3a`

Tool colours (hotbar slot 1–4, in JSON order): `#3aa0ff` `#ff4d4d` `#4be36b` `#b06cff`

## Characters

- Proportions: big head (about 1/3 of height), short body, big hands and feet. Anime-kid, not realistic.
- Hair is spiky cones in one flat colour. Eyes are flat black ovals. No mouths unless shouting.
- Every character is original. No headbands, no existing hero silhouettes, no borrowed colourways. If someone could name the character it's from, redo it.
- Current player: navy spike hair, yellow jacket, red scarf with a tail that swings. Other players get the same body with a different jacket + hair colour from the palette.
- The held tool is always visible in the right hand.

## Monsters

- ONE body for the whole game: torso, horned head, jaw with white teeth, four clawed legs, spine ridge, tail. Everything else is driven by the topic's three slots.
- colour slot → body colour. symbol slot → floating black badge with a white glyph above the head. movement slot → idle: `slow` = heavy breathing sway, `fast` = twitch and shiver.
- Eyes glow. Yellow at rest, orange when fast, red when roaring.
- Horns, claws and spikes are always dark ink-purple `#2a2438` so they read against any body colour.
- No name shown until the player has met the beast.

## UI

- Fonts: **Bangers** for anything shouted (zone name, monster name, hit text, big buttons). **Nunito 800** for everything else. Never a third font.
- Every panel and button: 3px black border, hard offset shadow (0 3–6px 0 #111), radius 12–16px. No blur shadows, no gradients, no glass.
- Buttons press down (translate 2–3px, shadow shrinks). That's the only hover/press effect.
- Big text gets a black stroke and a hard offset text-shadow so it sits on any background.
- Hotbar is Minecraft-shaped: a row of square slots, the selected one lifts and gets a white border, its name floats above it.
- Cards enter with one slam (scale from 0.4 with overshoot). Nothing else animates on its own.

## Feedback (the part that has to be unmistakable)

- Strong: screen shake, 30+ particle burst in the monster's colour plus white, body flashes white, deep squash, red STRONG text slams in.
- Weak: small chip of 6 particles, slight squash, no shake, orange "weak" text.
- Useless: the tool visibly bounces back off the beast, a grey ring expands on the floor, the beast does not react at all, grey "…nothing" text. Useless must feel like information, never like lag.
- Kill: big burst in body colour + black smoke, the beast sinks, "DOWN".

## Do not

- No pixel art, no dithering, no scanlines.
- No photoreal textures, no PBR metals, no bloom or glow post-effects.
- No soft drop shadows or rounded-everything SaaS look.
- No emoji in UI. Glyphs are drawn shapes or a single unicode symbol in Bangers.
- No text that explains a slot's meaning inside the game. Meanings live only in the bestiary, after the player has tried it.
