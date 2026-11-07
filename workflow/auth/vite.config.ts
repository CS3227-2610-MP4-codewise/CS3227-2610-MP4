import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { readFile } from 'node:fs/promises';
import { authDatabase } from './database';
import { ManagedStore } from '../../src/server/auth/managed-store';
import { ManagedAuthRoutes } from '../../src/server/auth/managed-routes';
import { SyntheticFirebase } from './synthetic-firebase';
import { CourseAuthority } from '../../src/server/courses/authority';
import { hash, randomToken, setCookie } from '../../src/server/auth/primitives';
const origin = 'http://127.0.0.1:5176',
  config = { origin, clientId: '', clientSecret: '', secure: false };
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
/** Loopback-only synthetic composition; never imported by production. */
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'guarded-synthetic-auth-preview',
      transformIndexHtml() {
        return [
          {
            tag: 'aside',
            attrs: { class: 'cw-preview-notice', role: 'note' },
            children:
              'Synthetic preview · No live authentication or email. Use invented passwords.',
            injectTo: 'body-prepend' as const,
          },
        ];
      },
      async configureServer(server) {
        const database = await authDatabase();
        for (const name of [
          '0007_courses.sql',
          '0009_course_creation.sql',
          '0010_invitation_target_role.sql',
        ]) {
          const sql = await readFile(
            'src/server/db/migrations/' + name,
            'utf8',
          );
          await database.db.batch(
            sql
              .split(/^-- statement\s*$/m)
              .map((s) => s.trim())
              .filter((s) => s.replace(/^--.*$/gm, '').trim())
              .map((s) => database.db.prepare(s)),
          );
        }
        await database.db
          .prepare('INSERT INTO courses(id,name) VALUES(?,?)')
          .bind('synthetic-course', 'Synthetic course')
          .run();
        const store = new ManagedStore(database.db),
          provider = new SyntheticFirebase();
        const mails: { email: string; subject: string; text: string }[] = [];
        const mailer = {
          async send(email: string, continuation: string) {
            const subject = 'Codewise password setup or recovery';
            const text = continuation;
            mails.unshift({ email, subject, text });
            return { state: 'queued' as const, messageId: 'synthetic-preview' };
          },
        };
        const courses = new CourseAuthority(database.db);
        const routes = new ManagedAuthRoutes(
          store,
          config,
          provider,
          mailer,
          courses,
          undefined,
          (work) => {
            void work().catch(() => {});
          },
        );
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
            const uid = 'synthetic-instructor',
              email = 'instructor@u.nus.edu',
              token = randomToken(),
              now = Date.now();
            await provider.provision(uid, email);
            await provider.verifyEmail(uid);
            provider.passwords.set(uid, 'preview instructor passphrase');
            await database.db
              .prepare(
                'INSERT INTO auth_invites(id,token_hash,email,created_at,expires_at) VALUES(?,?,?,?,?)',
              )
              .bind(
                crypto.randomUUID(),
                await hash(token),
                email,
                now,
                now + 86400000,
              )
              .run();
            const cookie = await store.loginManaged(
              randomToken(),
              await provider.current(uid),
              provider.issuer,
              '/workspace',
              token,
            );
            const instructorId = (await store.session(cookie)).user_id;
            await database.db
              .prepare(
                "INSERT OR IGNORE INTO course_memberships(course_id,user_id,role) VALUES(?,?,'instructor')",
              )
              .bind('synthetic-course', instructorId)
              .run();
            res.writeHead(303, {
              'Set-Cookie': setCookie(config, 'session', cookie, 28800),
              Location: '/auth/invitations?courseId=synthetic-course',
              'Cache-Control': 'no-store',
            });
            res.end();
            return;
          }
          if (req.url === '/__auth-preview/mail' && req.method === 'GET') {
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'Referrer-Policy': 'no-referrer',
              'Content-Security-Policy':
                "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
            });
            res.end(
              '<h1>Synthetic mailbox</h1><p>No real email is sent. Refresh to see new captured messages.</p>' +
                mails
                  .map(
                    (m) =>
                      '<article><h2>' +
                      escape(m.subject) +
                      '</h2><p>' +
                      escape(m.email) +
                      '</p><pre>' +
                      escape(m.text) +
                      '</pre><p>' +
                      m.text
                        .split('\n')
                        .filter((line) => line.startsWith(origin + '/'))
                        .map(
                          (line) =>
                            '<a href="' +
                            escape(line) +
                            '">Open synthetic email link</a>',
                        )
                        .join('') +
                      '</p></article>',
                  )
                  .join(''),
            );
            return;
          }
          if (!req.url?.startsWith('/api/auth/')) {
            next();
            return;
          }
          try {
            const headers = new Headers();
            for (const [key, value] of Object.entries(req.headers))
              if (value !== undefined)
                headers.set(
                  key,
                  Array.isArray(value) ? value.join(',') : value,
                );
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
