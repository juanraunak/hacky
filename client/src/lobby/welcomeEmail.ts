// The welcome mail, from the browser's side of it.
//
// Two ways to send, in this order:
//
// 1. EmailJS, when the three VITE_EMAILJS_* values are set. The mailbox is
//    connected to EmailJS by OAuth and the browser holds only a public key,
//    which is meant to be public -- the one way to send AS a Gmail address
//    without a server. The mail text is composed here because EmailJS takes
//    it as template parameters.
// 2. /api/welcome otherwise: the Azure Function in ../api in production, the
//    middleware in vite.config.ts in development. That path holds a Resend
//    key server-side and writes its own text, so the browser sends nothing
//    but an address.
//
// A SpacetimeDB module has no outbound network, which is why neither of these
// can live on the module.

const EMAILJS = {
  service: (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) ?? '',
  template: (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) ?? '',
  publicKey: (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) ?? '',
};
const ENDPOINT =
  (import.meta.env.VITE_WELCOME_EMAIL_URL as string | undefined) || '/api/welcome';

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
      // The template must use these names, and its "To email" field must be
      // {{to_email}} -- otherwise every welcome mail goes to the account
      // owner instead of to the player who just signed up. to_email and email
      // are both sent because EmailJS's starter templates use either one.
      template_params: {
        to_email: email,
        email,
        subject: SUBJECT,
        message: BODY,
      },
    }),
  });
  if (!res.ok) {
    // EmailJS answers in plain text and the text is the real reason: wrong
    // template id, origin not on the allowlist, and so on.
    console.warn(`[welcome] emailjs ${res.status}: ${await res.text().catch(() => '')}`);
    return false;
  }
  return true;
}

async function sendViaEndpoint(email: string): Promise<boolean> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Only the address. The endpoint writes the mail, so it cannot be talked
    // into sending arbitrary text to arbitrary people.
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    console.warn(`[welcome] ${ENDPOINT} answered ${res.status} for ${email}`);
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
  try {
    return viaEmailJs ? await sendViaEmailJs(email) : await sendViaEndpoint(email);
  } catch (err) {
    console.warn('[welcome] send failed', err);
    return false;
  }
}
