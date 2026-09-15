import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // The sync bundle contract is shared with the host, so the two never
      // drift apart.
      '@gitroom/helpers': resolve(import.meta.dirname, '../../libraries/helpers/src'),
      '@postpls': resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 4300,
  },
});
