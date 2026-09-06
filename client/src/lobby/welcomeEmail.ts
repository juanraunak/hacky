// The welcome mail.
//
// A SpacetimeDB module cannot make outbound requests, so the mail cannot be
// sent from the server. It goes from the browser, which rules out anything
// that needs a secret: an API key in this bundle is an API key every visitor
// can read and spend.
//
// Two ways to send, in order:
//
// 1. EmailJS. The only browser-safe way to send AS a Gmail address: you
//    connect the mailbox to EmailJS by OAuth, and the browser only ever holds
//    a public key, which is meant to be public. Set the three VITE_EMAILJS_*
//    values and this uses it.
// 2. Any JSON endpoint, via VITE_WELCOME_EMAIL_URL -- a Zapier or Make
//    webhook, an Azure Function, anything that holds its own key server-side.
//
// With neither set this is a no-op that says so in the console. The account is
// recorded server-side regardless, so no signup is ever lost while the mail
// side is being wired up.

const EMAILJS = {
  service: (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) ?? '',
  template: (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) ?? '',
  publicKey: (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) ?? '',
};
const ENDPOINT = (import.meta.env.VITE_WELCOME_EMAIL_URL as string | undefined) ?? '';

const SUBJECT = 'Welcome to Hacky';

const BODY = [
  'You are in.',
  '',
  'Hacky turns a topic into a game your whole group plays together on their',
  'phones. Pick what to learn, share the code, and fight your way through it.',
  '',
  'Your first world is Newton’s laws of motion: the orchard, the study, and',
  'the giant apple. Nobody finishes that one alone.',
  '',
  'See you in there.',
].join('\n');

async function sendViaEmailJs(email: string): Promise<boolean> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.service,
      template_id: EMAILJS.template,
      user_id: EMAILJS.publicKey,
      // Names the template expects. A template built from EmailJS's default
      // has {{to_email}}, {{subject}} and {{message}}; anything else needs the
      // template edited to match, not this file.
      template_params: {
        to_email: email,
        email,
        subject: SUBJECT,
        message: BODY,
      },
    }),
  });
  if (!res.ok) {
    // EmailJS answers in plain text, and the text is the actual reason
    // (wrong template id, origin not allowed, and so on).
    console.warn(`[welcome] emailjs ${res.status}: ${await res.text().catch(() => '')}`);
    return false;
  }
  return true;
}

async function sendViaEndpoint(email: string): Promise<boolean> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, subject: SUBJECT, message: BODY }),
  });
  if (!res.ok) {
    console.warn(`[welcome] endpoint answered ${res.status} for ${email}`);
    return false;
  }
  return true;
}

/**
 * Returns true only when the mail was actually accepted, so the caller knows
 * whether to mark the account as welcomed. Never throws: a mail that fails to
 * send is our problem, not something a player should be held up by.
 */
export async function sendWelcome(email: string): Promise<boolean> {
  const viaEmailJs = EMAILJS.service && EMAILJS.template && EMAILJS.publicKey;
  if (!viaEmailJs && !ENDPOINT) {
    console.warn(
      `[welcome] no mail sender configured, so nothing was sent to ${email}. ` +
        'Set VITE_EMAILJS_* (see client/.env.example) and it will send. ' +
        'The account is saved either way.'
    );
    return false;
  }
  try {
    return viaEmailJs ? await sendViaEmailJs(email) : await sendViaEndpoint(email);
  } catch (err) {
    console.warn('[welcome] send failed', err);
    return false;
  }
}
