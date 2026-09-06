import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * POST /api/welcome, in development.
 *
 * In production this route is the Azure Function in ../api. The dev server is
 * plain Vite and would 404 it, so the same handler is mounted here -- meaning
 * the welcome mail can be tested from `npm run dev` with no deploy.
 *
 * The sending logic and the mail text are imported from ../api/welcome-mail.mjs
 * rather than copied, so the two paths cannot drift. It is imported at request
 * time, not bundled with this config, which keeps the key out of anything Vite
 * writes to disk.
 *
 * RESEND_API_KEY has no VITE_ prefix on purpose: only VITE_* reaches the
 * browser bundle, so the key stays in this Node process. Put it in
 * client/.env.local, which is gitignored.
 */
function welcomeApi(env: Record<string, string>): Plugin {
  return {
    name: 'hacky-welcome-api',
    configureServer(server) {
      server.middlewares.use('/api/welcome', (req, res, next) => {
        if (req.method !== 'POST') return next();

        let raw = '';
        req.on('data', chunk => (raw += chunk));
        req.on('end', () => {
          void (async () => {
            const answer = (status: number, ok: boolean) => {
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok }));
            };
            try {
              const body = JSON.parse(raw || '{}');
              // process.cwd(), not __dirname: this config is ESM (the package
              // is type: module), where __dirname does not exist. The dev
              // server always runs from client/.
              // The query string busts Node's ESM cache. Without it the first
              // version imported is the one this dev server keeps, and edits
              // to the mail only take effect after a full restart.
              const mod = await import(
                `${pathToFileURL(resolve(process.cwd(), '../api/welcome-mail.mjs')).href}?t=${Date.now()}`
              );
              const result = await mod.sendWelcomeMail(body, {
                apiKey: env.RESEND_API_KEY,
                from: env.RESEND_FROM,
                origin: `http://${req.headers.host ?? 'localhost:5173'}`,
              });
              if (!result.ok) {
                console.warn(`[welcome] ${result.status}: ${result.detail}`);
              }
              answer(result.ok ? 200 : result.status === 400 ? 400 : 502, result.ok);
            } catch (err) {
              console.warn('[welcome] dev handler failed', err);
              answer(500, false);
            }
          })();
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads every variable, not just VITE_*, so the server-side key is
  // visible to this config without ever reaching the bundle.
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react(), welcomeApi(env)] };
});
