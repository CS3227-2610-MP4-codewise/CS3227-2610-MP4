import { defineConfig } from 'vite';
import { writeFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Screenshot harness only: renders the real Workbook against an in-page synthetic API.
// It is not part of the product build and sends nothing anywhere.
const root = resolve(import.meta.dirname);
export default defineConfig({
  root,
  plugins: [
    react(),
    {
      name: 'review-evidence',
      configureServer(server) {
        server.middlewares.use('/review-report', (req, res) => {
          let body = '';
          req.on('data', (c) => (body += c));
          req.on('end', () => {
            const data = JSON.parse(body);
            writeFileSync(
              resolve(
                root,
                '../../metrics-' +
                  data.width +
                  '-' +
                  data.theme +
                  '-' +
                  (data.scenario || data.state) +
                  '-motion' +
                  data.motion +
                  '-' +
                  (data.status || 'loading').replace(/[^a-zA-Z0-9]/g, '_') +
                  '.json',
              ),
              JSON.stringify(data, null, 2),
            );
            res.end('ok');
          });
        });
      },
    },
  ],
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
    fs: { allow: [resolve(root, '../../../../../..')] },
  },
});
