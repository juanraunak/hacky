// POST /api/welcome  { "email": "someone@example.com" }
//
// Azure Static Web Apps picks up this folder as its managed API, so the route
// is served from the same origin as the site and needs no CORS.
//
// RESEND_API_KEY lives in the Static Web App's Application Settings, never in
// the repo. RESEND_FROM is optional and defaults to Resend's test sender.

import { app } from '@azure/functions';
import { sendWelcomeMail } from '../../welcome-mail.mjs';

app.http('welcome', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'welcome',
  handler: async request => {
    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { ok: false, error: 'expected JSON' } };
    }

    const result = await sendWelcomeMail(body, {
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.RESEND_FROM,
      // The link in the letter is built from our own origin, never from
      // anything the caller sends.
      origin: process.env.SITE_ORIGIN || new URL(request.url).origin,
    });

    if (!result.ok) {
      // Logged in full for us; the caller is told only that it did not send,
      // so a probe cannot read back the sending configuration.
      console.warn(`[welcome] ${result.status}: ${result.detail}`);
      return { status: result.status === 400 ? 400 : 502, jsonBody: { ok: false } };
    }
    return { status: 200, jsonBody: { ok: true } };
  },
});
