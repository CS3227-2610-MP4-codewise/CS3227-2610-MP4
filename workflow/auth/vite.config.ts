import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { authDatabase } from './database';
import { AuthStore } from '../../src/server/auth/store';
import { AuthRoutes } from '../../src/server/auth/routes';
import {
  INVITE_TTL,
  hash,
  randomToken,
  setCookie,
} from '../../src/server/auth/primitives';
const origin = 'http://127.0.0.1:5176',
  config = {
    origin,
    clientId: 'synthetic-preview',
    clientSecret: 'synthetic-preview-only',
    secure: false,
  };
/** Explicit loopback fixture composition, never imported by src/server or a production build. */
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'guarded-synthetic-auth-preview',
      transformIndexHtml() {
        return [
          {
            tag: 'aside',
            attrs: { class: 'cw-status', role: 'note' },
            children:
              'Synthetic authentication preview — invented accounts, isolated local D1. Google and course integration are not verified.',
            injectTo: 'body-prepend' as const,
          },
        ];
      },
      async configureServer(server) {
        const database = await authDatabase(),
          store = new AuthStore(database.db);
        const provider = {
          async authorization(input: { state: string }) {
            return (
              origin +
              '/api/auth/callback?code=synthetic-preview&state=' +
              input.state
            );
          },
          async exchange() {
            return {
              issuer: 'https://accounts.google.com',
              subject: 'synthetic-preview-member',
              email: 'member@example.test',
            };
          },
        };
        const routes = new AuthRoutes(store, config, provider);
        server.httpServer?.once('close', () => {
          void database.close();
        });
        server.middlewares.use(async (req, res, next) => {
          if (
            req.headers.host !== '127.0.0.1:5176' ||
            (req.headers.origin && req.headers.origin !== origin) ||
            req.headers['sec-fetch-site'] === 'cross-site'
          ) {
            res.writeHead(403);
            res.end('Local preview refused');
            return;
          }
          if (req.url === '/__auth-preview/start' && req.method === 'POST') {
            if (req.headers.origin !== origin) {
              res.writeHead(403);
              res.end();
              return;
            }
            const invite = randomToken(),
              now = Date.now();
            await database.db
              .prepare(
                'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
              )
              .bind(
                crypto.randomUUID(),
                await hash(invite),
                'admin@example.test',
                now,
                now + INVITE_TTL,
              )
              .run();
            const browser = randomToken(),
              start = await store.begin(browser, invite, '/workspace');
            const token = await store.complete(
              await store.claim(start.state, browser),
              {
                issuer: 'https://accounts.google.com',
                subject: 'synthetic-admin',
                email: 'admin@example.test',
              },
            );
            const session = await store.session(token);
            await database.db
              .prepare(
                'INSERT INTO auth_administrators(user_id) VALUES(?) ON CONFLICT DO NOTHING',
              )
              .bind(session.user_id)
              .run();
            res.writeHead(303, {
              'Set-Cookie': setCookie(config, 'session', token, 28800),
              Location: '/auth/invitations',
              'Cache-Control': 'no-store',
            });
            res.end();
            return;
          }
          if (!req.url?.startsWith('/api/auth/')) {
            next();
            return;
          }
          try {
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers))
              if (v !== undefined)
                headers.set(k, Array.isArray(v) ? v.join(',') : v);
            const method = req.method ?? 'GET',
              body =
                method === 'GET' || method === 'HEAD'
                  ? undefined
                  : Readable.toWeb(req);
            const response = await routes.fetch(
              new Request(new URL(req.url, origin), {
                method,
                headers,
                ...(body ? { body, duplex: 'half' } : {}),
              } as RequestInit),
            );
            const out: Record<string, string | string[]> = {};
            response.headers.forEach((v, k) => {
              out[k] = v;
            });
            if (response.headers.getSetCookie().length)
              out['set-cookie'] = response.headers.getSetCookie();
            res.writeHead(response.status, out);
            res.end(await response.text());
          } catch {
            res.writeHead(503, { 'Cache-Control': 'no-store' });
            res.end('Synthetic preview unavailable');
          }
        });
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5176,
    strictPort: true,
    allowedHosts: ['127.0.0.1'],
  },
});
