// The welcome mail, sent through Resend.
//
// This runs on a server, never in the browser, because a Resend key is a
// secret: anything in the client bundle is readable by every visitor, and
// Resend's API blocks browser calls outright. Both callers -- the Azure
// Function in ./src/functions/welcome.mjs and the dev middleware in
// client/vite.config.ts -- come through here, so there is one copy of the
// text and one copy of the sending logic.
//
// The caller supplies only an address. Subject and body are fixed here on
// purpose: an endpoint that mails whatever text it is handed is an open relay,
// and ours is reachable by anyone who can find the URL.

const SUBJECT = 'Welcome to Hacky';

const TEXT = [
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

const HTML = `
<div style="font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:520px">
  <h1 style="font-size:26px;margin:0 0 14px">You are in.</h1>
  <p style="margin:0 0 14px">
    Hacky turns a topic into a game your whole group plays together, on the
    phones already in their pockets. Pick what to learn, share the code, and
    fight your way through it.
  </p>
  <p style="margin:0 0 14px">
    Your first world is <b>Newton&rsquo;s laws of motion</b> &mdash; the orchard,
    the study, and the giant apple. Nobody finishes that one alone.
  </p>
  <p style="margin:0;color:#666">See you in there.</p>
</div>`;

/** Same shape the client checks, so a bad address never reaches Resend. */
export function looksLikeEmail(value) {
  if (typeof value !== 'string' || value.length < 6 || value.length > 254) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

/**
 * Returns { ok, status, detail }. Never throws: a mail that fails to send is
 * our problem, not something a player should be held up by.
 */
export async function sendWelcomeMail(email, { apiKey, from }) {
  if (!looksLikeEmail(email)) {
    return { ok: false, status: 400, detail: 'not an email address' };
  }
  if (!apiKey) {
    return { ok: false, status: 500, detail: 'RESEND_API_KEY is not set' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'Hacky <onboarding@resend.dev>',
        to: [email],
        subject: SUBJECT,
        text: TEXT,
        html: HTML,
      }),
    });

    if (!res.ok) {
      // Resend answers with JSON that names the actual reason -- an unverified
      // sending domain, a bad key, a recipient the test sender may not reach.
      const detail = await res.text().catch(() => '');
      return { ok: false, status: res.status, detail };
    }
    return { ok: true, status: 200, detail: '' };
  } catch (err) {
    return { ok: false, status: 502, detail: String(err) };
  }
}
