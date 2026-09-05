// Who played, and how far they got.
//
// One append-only row per milestone. Deliberately coarse: a handful of named
// moments, not a behavioural trace.

import { t } from 'spacetimedb/server';
import spacetimedb from './schema';

/**
 * kind is one of: joined, world1, world2, world3, finished.
 * Recording is best-effort and never blocks play.
 */
export const logEvent = spacetimedb.reducer(
  { kind: t.string(), name: t.string() },
  (ctx, { kind, name }) => {
    const player = ctx.db.player.identity.find(ctx.sender);
    ctx.db.run_event.insert({
      id: 0,
      identity: ctx.sender,
      name: name.trim().slice(0, 16),
      room_code: player?.room_code ?? '',
      kind: kind.slice(0, 16),
      at: ctx.timestamp,
    });
  }
);
