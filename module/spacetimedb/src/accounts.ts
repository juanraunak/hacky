// Accounts, and only for the second visit.
//
// The first game is free and login-free: someone who opens a shared link, or
// who presses play for the first time, never sees a form. Once they have
// finished a run and come back for another, this is where the email lands.
//
// The module has no outbound network, so it cannot send the welcome mail
// itself. It records the account and says whether this call created it; the
// browser sends the mail and calls markWelcomed.

import { t } from 'spacetimedb/server';
import spacetimedb from './schema';
import type { Ctx } from './schema';

/** Same shape the client checks, so a bad address never reaches the table. */
function looksLikeEmail(value: string): boolean {
  if (value.length < 6 || value.length > 254) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

function say(ctx: Ctx, ok: boolean, created: boolean, message: string): void {
  const row = {
    identity: ctx.sender,
    ok,
    created,
    message,
    at: ctx.timestamp,
  };
  const existing = ctx.db.auth_result.identity.find(ctx.sender);
  if (existing) ctx.db.auth_result.identity.update(row);
  else ctx.db.auth_result.insert(row);
}

/**
 * Sign in, or sign up -- the same door. An email nobody has used creates the
 * account; an email that exists has to match the hash it was created with.
 *
 * The password is hashed in the browser and only the hash arrives here, so a
 * plaintext password is never stored and never crosses the wire.
 *
 * Never throws. The outcome goes to auth_result for the caller to read, so
 * "wrong password" is distinguishable from "still connecting".
 */
export const signIn = spacetimedb.reducer(
  { email: t.string(), passwordHash: t.string() },
  (ctx, { email, passwordHash }) => {
    const address = email.trim().toLowerCase();

    if (!looksLikeEmail(address)) {
      say(ctx, false, false, 'That does not look like an email address.');
      return;
    }
    if (passwordHash.length < 16) {
      say(ctx, false, false, 'Password is too short.');
      return;
    }

    const existing = ctx.db.account.email.find(address);
    if (!existing) {
      ctx.db.account.insert({
        email: address,
        password_hash: passwordHash,
        identity: ctx.sender,
        created_at: ctx.timestamp,
        last_seen_at: ctx.timestamp,
        welcome_sent: false,
      });
      say(ctx, true, true, 'welcome');
      return;
    }

    if (existing.password_hash !== passwordHash) {
      say(ctx, false, false, 'Wrong password for that email.');
      return;
    }

    ctx.db.account.email.update({
      ...existing,
      identity: ctx.sender,
      last_seen_at: ctx.timestamp,
    });
    say(ctx, true, false, 'welcome back');
  }
);

/** The browser reports back that the welcome mail actually went out. */
export const markWelcomed = spacetimedb.reducer(
  { email: t.string() },
  (ctx, { email }) => {
    const address = email.trim().toLowerCase();
    const existing = ctx.db.account.email.find(address);
    if (!existing || existing.welcome_sent) return;
    ctx.db.account.email.update({ ...existing, welcome_sent: true });
  }
);
