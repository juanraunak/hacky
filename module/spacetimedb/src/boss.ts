// The boss is one creature, not one per phone.
//
// Health, phase and death live on the server so a party fights the same apple:
// everyone sees the same bar drain, and it dies once, for everybody.

import { t, SenderError } from 'spacetimedb/server';
import spacetimedb from './schema';
import type { Ctx } from './schema';

function roomOf(ctx: Ctx): string {
  const player = ctx.db.player.identity.find(ctx.sender);
  if (!player) throw new SenderError('not in a room');
  return player.room_code;
}

/** Start (or restart) the fight with a pool sized for the party. */
export const bossReset = spacetimedb.reducer(
  { maxHp: t.i32() },
  (ctx, { maxHp }) => {
    const code = roomOf(ctx);
    const hp = Math.max(1, maxHp);
    const existing = ctx.db.boss.room_code.find(code);
    if (existing) {
      ctx.db.boss.room_code.update({ ...existing, hp, max_hp: hp, down: false, mode: 'charging' });
      return;
    }
    ctx.db.boss.insert({
      room_code: code,
      hp,
      max_hp: hp,
      down: false,
      mode: 'charging',
      mode_since: ctx.timestamp,
    });
  }
);

/** Everyone's hits land on the same pool. */
export const bossHit = spacetimedb.reducer(
  { damage: t.i32() },
  (ctx, { damage }) => {
    const code = roomOf(ctx);
    const boss = ctx.db.boss.room_code.find(code);
    if (!boss || boss.down || damage <= 0) return;
    const hp = Math.max(0, boss.hp - damage);
    ctx.db.boss.room_code.update({ ...boss, hp, down: hp === 0 });
  }
);

/** The state machine is shared too, or players would be told to use
    different laws at the same moment. */
export const bossMode = spacetimedb.reducer(
  { mode: t.string() },
  (ctx, { mode }) => {
    const code = roomOf(ctx);
    const boss = ctx.db.boss.room_code.find(code);
    if (!boss || boss.down || boss.mode === mode) return;
    ctx.db.boss.room_code.update({ ...boss, mode, mode_since: ctx.timestamp });
  }
);
