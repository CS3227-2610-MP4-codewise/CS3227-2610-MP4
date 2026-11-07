import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { assessmentDatabase } from './database';
import { fixture, origin, cookieName } from './fixture';
import {
  assessmentHandler,
  ASSESSMENT_API,
} from '../../src/server/instructor/assessments/http';
export default defineConfig({
  build: {
    outDir: resolve('dist/assessment-preview'),
    rollupOptions: { input: resolve('workflow/assessment-preview/index.html') },
  },
  plugins: [
    react(),
    {
      name: 'isolated-assessment-preview',
      async configureServer(server) {
        const database = await assessmentDatabase(
            resolve('.wrangler/assessment-preview'),
          ),
          token = randomBytes(32).toString('hex'),
          f = await fixture(database.db, token);
        server.httpServer?.once('close', () => {
          void database.close();
        });
        server.middlewares.use(async (req, res, next) => {
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers))
            if (v !== undefined)
              headers.set(k, Array.isArray(v) ? v.join(',') : v);
          if (
            headers.get('host') !== '127.0.0.1:5177' ||
            [...headers.keys()].some(
              (k) =>
                k === 'forwarded' ||
                k.startsWith('x-forwarded-') ||
                [
                  'x-user-id',
                  'x-role',
                  'x-course-id',
                  'authorization',
                ].includes(k),
            ) ||
            (headers.has('origin') && headers.get('origin') !== origin)
          ) {
            res.writeHead(403);
            res.end('Loopback preview only');
            return;
          }
          if (
            req.url?.split('?')[0] ===
              '/workflow/assessment-preview/index.html' &&
            req.method === 'GET'
          )
            res.setHeader(
              'Set-Cookie',
              `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`,
            );
          if (!req.url?.startsWith(ASSESSMENT_API + '/')) {
            next();
            return;
          }
          try {
            const method = req.method ?? 'GET',
              body = ['GET', 'HEAD'].includes(method)
                ? undefined
                : (Readable.toWeb(req) as ReadableStream<Uint8Array>);
            const request = new Request(new URL(req.url, origin), {
              method,
              headers,
              ...(body ? { body, duplex: 'half' } : {}),
            } as RequestInit);
            if (req.url === ASSESSMENT_API + '/fixture' && method === 'GET') {
              await f.identity.requireSession(request);
              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
              });
              res.end(
                JSON.stringify({ attemptId: f.attempt.attemptId, csrf: token }),
              );
              return;
            }
            const response = await assessmentHandler(f.service(request))(
              request,
            );
            res.writeHead(
              response.status,
              Object.fromEntries(response.headers),
            );
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
    port: 5177,
    strictPort: true,
    allowedHosts: ['127.0.0.1'],
  },
});
