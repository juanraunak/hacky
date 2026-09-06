// Who has played before, on this device.
//
// The rule the product is built around: the FIRST game asks for nothing. No
// email, no password, no account. You press play and you are in. Only when
// somebody comes back for a second game do we ask who they are.
//
// Joining someone else's party through a link is never gated, whether it is
// your first game or your tenth -- a guest who meets a login form is a guest
// who leaves. Only starting a game of your own goes through here.

const PLAYED_KEY = 'hacky.played';
const EMAIL_KEY = 'hacky.email';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // private mode, storage disabled
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Non-fatal. The worst case is that someone gets a second free game.
  }
}

/** Has this device started a game before? */
export function hasPlayedBefore(): boolean {
  return read(PLAYED_KEY) === '1';
}

/** Called the moment a game of their own actually starts. */
export function markPlayed(): void {
  write(PLAYED_KEY, '1');
}

/** The account this device is signed in as, if any. */
export function signedInEmail(): string | null {
  const email = read(EMAIL_KEY);
  return email && email.includes('@') ? email : null;
}

export function setSignedIn(email: string): void {
  write(EMAIL_KEY, email.trim().toLowerCase());
}

/**
 * The gate, in one place: a second game, from someone we have never met.
 */
export function needsAccount(): boolean {
  return hasPlayedBefore() && !signedInEmail();
}
