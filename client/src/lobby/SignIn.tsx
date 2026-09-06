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
      setSignedIn(address);
      // Every sign-in gets the letter, not just the first. Juan's call: an
      // account that already existed -- from a test, or a second device --
      // silently sent nothing, which reads as "the email is broken".
      // Never block the game on it: a mail that fails to send is our problem.
      void sendWelcome(address).then(sent => {
        console.log(`[welcome] ${sent ? 'sent to' : 'FAILED for'} ${address} (new account: ${created})`);
        if (sent) net.callReducer('markWelcomed', address);
      });
      onDone();
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
