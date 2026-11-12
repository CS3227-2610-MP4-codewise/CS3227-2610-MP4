import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
const root = import.meta.dirname;
export default defineConfig({
  root,
  plugins: [react()],
  cacheDir: resolve(root, '../node_modules/.vite'),
  server: {
    host: '127.0.0.1',
    port: 5189,
    strictPort: true,
    fs: { allow: [resolve(root, '../../../../../..')] },
  },
});
