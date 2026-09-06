// The second-game door.
//
// Nobody meets this on their first game, and nobody meets it by joining a
// friend's link. It appears once, when someone who has already played comes
// back to start another game of their own -- at which point asking who they
// are is a fair trade rather than a toll gate.

import { useState } from 'react';
import { net } from '../net';
import { passwordHash } from './sha256';
import { setSignedIn } from './account';
import { sendWelcome } from './welcomeEmail';
import './signin.css';

export function SignIn({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The mail result, shown on this screen. It used to go only to the console,
  // and onDone() navigated away in the same tick -- so nobody ever saw whether
  // the letter went out, which is indistinguishable from it never being sent.
  const [mail, setMail] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const address = email.trim().toLowerCase();
    if (!address.includes('@') || !address.split('@')[1]?.includes('.')) {
      setError('That does not look like an email address.');
      return;
    }
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const { created } = await net.signIn(address, passwordHash(address, password));
      void created; // the letter goes out either way now
      setSignedIn(address);

      // Every sign-in gets the letter, not just the first: an account that
      // already existed -- from a test, or a second device -- silently sent
      // nothing, which reads as "the email is broken".
      setMail('Sending Newton’s letter…');
      const sent = await sendWelcome(address);
      console.log(`[welcome] ${sent.ok ? 'sent' : 'FAILED'} for ${address}: ${sent.detail}`);
      if (sent.ok) net.callReducer('markWelcomed', address);

      // Stay on this screen long enough to read the outcome. Leaving in the
      // same tick is what made this impossible to diagnose.
      setMail(
        sent.ok
          ? `Letter sent to ${address}. Check spam if it is not in your inbox.`
          : `Mail did not send — ${sent.detail}`
      );
      window.setTimeout(onDone, sent.ok ? 2200 : 6000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign you in.');
      setBusy(false);
    }
  }

  return (
    <form className="signin" onSubmit={submit}>
      <button type="button" className="back-button" onClick={onBack} disabled={busy}>
        Back
      </button>

      <p className="title-kicker">Welcome back</p>
      <p className="signin-why">
        Your first game was on us. Make an account to keep playing — it saves your
        progress and takes about ten seconds.
      </p>

      <label className="signin-field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={busy}
          required
        />
      </label>

      <label className="signin-field">
        <span>Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="at least 6 characters"
          disabled={busy}
          required
        />
      </label>

      {error && <p className="signin-error">{error}</p>}
      {mail && <p className="signin-mail">{mail}</p>}

      <button type="submit" className="title-play signin-go" disabled={busy}>
        {busy ? 'One moment…' : 'Play on'}
      </button>

      <p className="signin-note">
        New here? Typing an email you have not used before makes the account.
      </p>
    </form>
  );
}

export default SignIn;
