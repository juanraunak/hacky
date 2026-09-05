import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';

// content_json shape this reads:
//   { "matrix": { "<toolId>": { "<monsterKind>": "strong" | "weak" | "none" } } }
// The effect stays a string in the content file because the client renders its
// hit feedback from that vocabulary; only this reducer turns it into a number.
// Anything missing or malformed means zero damage rather than a thrown reducer.
const STRONG_DAMAGE = 40;
const WEAK_DAMAGE = 10;

function damageFor(contentJson: string, toolId: string, kind: string): number {
  if (!contentJson) return 0;
  let parsed: unknown;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return 0;
  }
  const matrix = (parsed as { matrix?: Record<string, Record<string, string>> } | null)?.matrix;
  switch (matrix?.[toolId]?.[kind]) {
    case 'strong':
      return STRONG_DAMAGE;
    case 'weak':
      return WEAK_DAMAGE;
    default:
      return 0; // covers 'none', an unknown effect, and a missing entry
  }
}

export const swing = spacetimedb.reducer(
  { monsterId: t.u32(), toolId: t.string() },
  (ctx, { monsterId, toolId }) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    if (!player) throw new SenderError('not in a room');

    const monster = ctx.db.monster.id.find(monsterId);
    if (!monster) throw new SenderError(`no monster with id ${monsterId}`);
    if (monster.room_code !== player.room_code) {
      throw new SenderError('monster is in another room');
    }

    const room = ctx.db.room.code.find(player.room_code);
    if (!room) throw new SenderError(`no room with code ${player.room_code}`);

    const damage = damageFor(room.content_json, toolId, monster.kind);
    const hp = Math.max(0, monster.hp - damage);
    ctx.db.monster.id.update({ ...monster, hp });
  }
);

export const startGame = spacetimedb.reducer(
  { contentJson: t.string() },
  (ctx, { contentJson }) => {
    let hosted = null as ReturnType<typeof ctx.db.room.code.find>;
    for (const room of ctx.db.room.iter()) {
      if (room.host.equals(ctx.sender)) {
        hosted = room;
        break;
      }
    }
    if (!hosted) throw new SenderError('only the host can start the game');

    ctx.db.room.code.update({ ...hosted, content_json: contentJson, phase: 'playing' });
  }
);
