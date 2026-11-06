import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { Readable } from 'node:stream';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { localDatabase } from './database';
import {
  syntheticIdentity,
  allowedTransport,
  previewOrigin,
  cookieName,
} from './identity';
import { D1Assignments } from '../../src/server/instructor/assignments/repository';
import { AssignmentService } from '../../src/server/instructor/assignments/service';
import {
  assignmentHandler,
  PREVIEW_API,
} from '../../src/server/instructor/assignments/http';
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-only-instructor-composition',
      async configureServer(server) {
        const database = await localDatabase(
          resolve('.wrangler/instructor-preview'),
        );
        const repository = new D1Assignments(database.db),
          token = randomBytes(32).toString('hex');
        const handle = assignmentHandler(
          new AssignmentService(
            repository,
            syntheticIdentity(repository, token),
          ),
        );
        server.httpServer?.once('close', () => {
          void database.close();
        });
        server.middlewares.use(async (req, res, next) => {
          const headers = new Headers();
          for (const [key, value] of Object.entries(req.headers))
            if (value !== undefined)
              headers.set(key, Array.isArray(value) ? value.join(',') : value);
          if (!allowedTransport(headers)) {
            res.writeHead(403);
            res.end('Local preview request refused');
            return;
          }
          if (
            req.url?.split('?')[0] ===
              '/workflow/instructor-preview/index.html' &&
            req.method === 'GET'
          )
            res.setHeader(
              'Set-Cookie',
              `${cookieName}=${token}; HttpOnly; SameSite=Strict; Path=/`,
            );
          if (!req.url?.startsWith(PREVIEW_API + '/')) {
            next();
            return;
          }
          try {
            const method = req.method ?? 'GET';
            // Stream into the bounded JSON reader; no unlimited intermediate buffering.
            const body =
              method === 'GET' || method === 'HEAD'
                ? undefined
                : (Readable.toWeb(req) as ReadableStream<Uint8Array>);
            const request = new Request(new URL(req.url, previewOrigin), {
              method,
              headers,
              ...(body ? { body, duplex: 'half' } : {}),
            } as RequestInit);
            const response = await handle(request);
            res.writeHead(
              response.status,
              Object.fromEntries(response.headers),
            );
            res.end(await response.text());
          } catch {
            res.writeHead(503, { 'Cache-Control': 'no-store' });
            res.end('Local preview unavailable');
          }
        });
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5175,
    strictPort: true,
    allowedHosts: ['127.0.0.1'],
  },
});
