// The welcome mail, from the browser's side of it.
//
// All this does is name an address. It cannot send the mail itself: a
// SpacetimeDB module has no outbound network, and Resend needs a secret key
// that must never be in this bundle -- anything here is readable by every
// visitor, and Resend's API refuses browser calls anyway.
//
// So the send happens behind /api/welcome, which holds the key and composes
// the text (see api/welcome-mail.mjs). In production that is the Azure
// Function; in development it is the middleware in client/vite.config.ts.
// Same route, same handler, either way.

const ENDPOINT =
  (import.meta.env.VITE_WELCOME_EMAIL_URL as string | undefined) || '/api/welcome';

/**
 * Returns true only when the endpoint actually sent it, so the caller knows
 * whether to mark the account as welcomed. Never throws: a mail that fails to
 * send is our problem, not something a player should be held up by.
 */
export async function sendWelcome(email: string): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Only the address. The endpoint writes the mail, so it cannot be talked
      // into sending arbitrary text to arbitrary people.
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      console.warn(
        `[welcome] ${ENDPOINT} answered ${res.status} for ${email}. ` +
          'Is RESEND_API_KEY set? The account is saved either way.'
      );
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[welcome] send failed', err);
    return false;
  }
}
