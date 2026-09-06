// The letter Newton sends, through Resend.
//
// This runs on a server, never in the browser, because a Resend key is a
// secret: anything in the client bundle is readable by every visitor, and
// Resend's API blocks browser calls outright. Both callers -- the Azure
// Function in ./src/functions/welcome.mjs and the dev middleware in
// client/vite.config.ts -- come through here, so there is one copy of the
// letter and one copy of the sending logic.
//
// The caller supplies fields, never prose. An endpoint that mails whatever
// text it is handed is an open relay, and ours is reachable by anyone who
// finds the URL. Every field is escaped before it reaches the HTML.

const FALLBACK = { name: 'friend', weapon: 'sword', party: 'the others' };

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Trim, cap, and fall back -- these land in a subject line and in HTML. */
function field(value, fallback) {
  const clean = typeof value === 'string' ? value.trim().slice(0, 120) : '';
  return clean || fallback;
}

/** Same shape the client checks, so a bad address never reaches Resend. */
export function looksLikeEmail(value) {
  if (typeof value !== 'string' || value.length < 6 || value.length > 254) return false;
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.');
}

function compose({ name, weapon, party, code, link }, origin) {
  const who = field(name, FALLBACK.name);
  const arm = field(weapon, FALLBACK.weapon);
  const friends = field(party, FALLBACK.party);
  // Room codes are [A-Z2-9]{6} by construction; anything else is not a code.
  const room = field(code, '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
  // Only ever our own origin, so the letter cannot be used to point people at
  // somebody else's site.
  const href = room ? `${origin}/r/${room}` : origin;
  const where = room ? `Same lobby, same code — ${room}.` : 'Same lobby, same door.';

  const subject = `The cellar's open. You left your ${arm} on the wall.`;

  const text = [
    `${who},`,
    '',
    'Last time you dropped a stone on my floor, fought off a portal of apples,',
    'and took one of my weapons without asking.',
    '',
    "The cellar door is unlocked now. Whatever's been knocking down there has",
    "stopped knocking, which I'm choosing to find reassuring.",
    '',
    `Your party's still on the wall: ${friends}. ${where}`,
    '',
    `Go back down: ${href}`,
    '',
    `Bring the ${arm}. It's a lot of paperwork if you don't.`,
    '',
    '— I. Newton',
    '',
    "P.S. Nobody's touched the feather. Good.",
  ].join('\n');

  const html = `
<div style="font:16px/1.6 Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:520px">
  <p style="margin:0 0 16px">${escapeHtml(who)},</p>
  <p style="margin:0 0 16px">
    Last time you dropped a stone on my floor, fought off a portal of apples,
    and took one of my weapons without asking.
  </p>
  <p style="margin:0 0 16px">
    The cellar door is unlocked now. Whatever&rsquo;s been knocking down there
    has stopped knocking, which I&rsquo;m choosing to find reassuring.
  </p>
  <p style="margin:0 0 16px">
    Your party&rsquo;s still on the wall: ${escapeHtml(friends)}. ${escapeHtml(where)}
  </p>
  <p style="margin:0 0 22px">
    <a href="${escapeHtml(href)}"
       style="display:inline-block;padding:12px 22px;border:3px solid #111;border-radius:12px;
              background:#ffd93b;color:#111;text-decoration:none;font-weight:700">
      Go back down
    </a>
  </p>
  <p style="margin:0 0 16px">
    Bring the ${escapeHtml(arm)}. It&rsquo;s a lot of paperwork if you don&rsquo;t.
  </p>
  <p style="margin:0 0 16px">&mdash; I. Newton</p>
  <p style="margin:0;color:#666;font-size:14px">
    P.S. Nobody&rsquo;s touched the feather. Good.
  </p>
</div>`;

  return { subject, text, html };
}

/**
 * Returns { ok, status, detail }. Never throws: a mail that fails to send is
 * our problem, not something a player should be held up by.
 */
export async function sendWelcomeMail(fields, { apiKey, from, origin }) {
  const email = typeof fields?.email === 'string' ? fields.email.trim().toLowerCase() : '';
  if (!looksLikeEmail(email)) {
    return { ok: false, status: 400, detail: 'not an email address' };
  }
  if (!apiKey) {
    return { ok: false, status: 500, detail: 'RESEND_API_KEY is not set' };
  }

  const { subject, text, html } = compose(fields, origin || 'https://hacky.app');

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: from || 'Newton <onboarding@resend.dev>',
        to: [email],
        subject,
        text,
        html,
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
