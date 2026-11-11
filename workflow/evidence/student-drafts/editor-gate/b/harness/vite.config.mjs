import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Screenshot harness only: renders the real Workbook against an in-page synthetic API.
// It is not part of the product build and sends nothing anywhere.
const root = resolve(import.meta.dirname);
export default defineConfig({
  root,
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
    fs: { allow: [resolve(root, '../../../../../..')] },
  },
});
