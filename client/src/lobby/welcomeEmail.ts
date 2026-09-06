// The letter Newton sends.
//
// Not a product welcome -- a note about a game they have already played: the
// weapon they walked off with, who was on the wall with them, the code to get
// back in. Those come from lastRun.ts, recorded on the way out of a run.
//
// Two ways to send, in this order:
//
// 1. EmailJS, when the three VITE_EMAILJS_* values are set. The mailbox is
//    connected by OAuth and the browser holds only a public key, which is
//    meant to be public -- the one way to send AS a Gmail address with no
//    server. The letter is composed here because EmailJS takes it as
//    template parameters.
// 2. /api/welcome otherwise, which holds a Resend key server-side and writes
//    the same letter from the same fields.
//
// A SpacetimeDB module has no outbound network, which is why neither of these
// can live on the module.

import { lobbyLink, readLastRun, type LastRun } from './lastRun';

const EMAILJS = {
  service: (import.meta.env.VITE_EMAILJS_SERVICE_ID as string | undefined) ?? '',
  template: (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined) ?? '',
  publicKey: (import.meta.env.VITE_EMAILJS_PUBLIC_KEY as string | undefined) ?? '',
};
const ENDPOINT =
  (import.meta.env.VITE_WELCOME_EMAIL_URL as string | undefined) || '/api/welcome';

interface Letter {
  subject: string;
  message: string;
  run: LastRun;
  link: string;
}

/** Newton writes it. Short, in his voice, one link. */
function letterFor(): Letter {
  const run = readLastRun();
  const link = lobbyLink(run.code);
  const where = run.code ? `Same lobby, same code — ${run.code}.` : 'Same lobby, same door.';

  return {
    run,
    link,
    subject: `The cellar's open. You left your ${run.weapon} on the wall.`,
    message: [
      `${run.name},`,
      '',
      'Last time you dropped a stone on my floor, fought off a portal of apples,',
      'and took one of my weapons without asking.',
      '',
      "The cellar door is unlocked now. Whatever's been knocking down there has",
      "stopped knocking, which I'm choosing to find reassuring.",
      '',
      `Your party's still on the wall: ${run.party}. ${where}`,
      '',
      `Go back down: ${link}`,
      '',
      `Bring the ${run.weapon}. It's a lot of paperwork if you don't.`,
      '',
      '— I. Newton',
      '',
      "P.S. Nobody's touched the feather. Good.",
    ].join('\n'),
  };
}

async function sendViaEmailJs(email: string, letter: Letter): Promise<boolean> {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS.service,
      template_id: EMAILJS.template,
      user_id: EMAILJS.publicKey,
      // subject and message are the whole letter, so a template of just
      // {{subject}} and {{message}} works with nothing else set up. The
      // separate fields are there for laying it out in EmailJS instead.
      //
      // The template's "To email" must be {{to_email}} or every letter goes
      // to the account owner rather than to the player who signed up.
      template_params: {
        to_email: email,
        email,
        subject: letter.subject,
        message: letter.message,
        name: letter.run.name,
        weapon: letter.run.weapon,
        party_names: letter.run.party,
        lobby_code: letter.run.code,
        lobby_link: letter.link,
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

async function sendViaEndpoint(email: string, letter: Letter): Promise<boolean> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Fields, not prose. The endpoint writes the letter itself, so it cannot
    // be talked into mailing arbitrary text to arbitrary people.
    body: JSON.stringify({
      email,
      name: letter.run.name,
      weapon: letter.run.weapon,
      party: letter.run.party,
      code: letter.run.code,
      link: letter.link,
    }),
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
  const letter = letterFor();
  const viaEmailJs = EMAILJS.service && EMAILJS.template && EMAILJS.publicKey;
  try {
    return viaEmailJs
      ? await sendViaEmailJs(email, letter)
      : await sendViaEndpoint(email, letter);
  } catch (err) {
    console.warn('[welcome] send failed', err);
    return false;
  }
}
