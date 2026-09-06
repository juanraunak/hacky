// The welcome mail.
//
// A SpacetimeDB module cannot make outbound requests, so the mail cannot be
// sent from the server. The browser posts the new address to whatever endpoint
// VITE_WELCOME_EMAIL_URL names -- an EmailJS REST call, a Zapier or Make
// webhook, an Azure Function, anything that accepts JSON -- and that endpoint
// owns the API key. Nothing secret is ever in this bundle.
//
// With no endpoint configured this is a no-op that says so in the console. The
// account is still recorded server-side either way, so no signup is ever lost
// while the mail side is being wired up.

const ENDPOINT = (import.meta.env.VITE_WELCOME_EMAIL_URL as string | undefined) ?? '';

export interface WelcomePayload {
  email: string;
  subject: string;
  message: string;
}

function payloadFor(email: string): WelcomePayload {
  return {
    email,
    subject: 'Welcome to Hacky',
    message: [
      'You are in.',
      '',
      'Hacky turns a topic into a game your whole group plays together on their',
      'phones. Pick what to learn, share the code, and fight your way through it.',
      '',
      'Your first world is Newton’s laws of motion: the orchard, the study, and',
      'the giant apple. Nobody finishes it alone.',
      '',
      'See you in there.',
    ].join('\n'),
  };
}

/**
 * Returns true only when the mail was actually accepted by the endpoint, so
 * the caller knows whether to mark the account as welcomed.
 */
export async function sendWelcome(email: string): Promise<boolean> {
  if (!ENDPOINT) {
    console.warn(
      '[welcome] VITE_WELCOME_EMAIL_URL is not set, so no mail was sent to ' +
        `${email}. The account is saved; set the endpoint and it will send.`
    );
    return false;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadFor(email)),
    });
    if (!res.ok) {
      console.warn(`[welcome] endpoint answered ${res.status} for ${email}`);
      return false;
    }
    return true;
  } catch (err) {
    // Never block the game on the mail. They signed in; let them play.
    console.warn('[welcome] send failed', err);
    return false;
  }
}
