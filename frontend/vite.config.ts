import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import os from 'os';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  // Use OS temp dir for Vite's dep-optimization cache so it always lands on
  // a writable local filesystem (avoids cross-platform EPERM issues).
  cacheDir: path.join(os.tmpdir(), 'vite-fonthabesha'),
});
