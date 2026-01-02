import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * SCA-01 Vite Configuration
 * Builds React renderer for Electron with Tailwind CSS v3
 */
export default defineConfig({
  plugins: [
    react(),
  ],
  root: 'src/renderer',
  base: './',
  build: {
    // Emit renderer assets into Electron's build/ui folder so main process
    // can load index.html via loadFile(__dirname, 'index.html')
    outDir: '../../build/ui',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer'),
      '@components': resolve(__dirname, 'src/renderer/components'),
      '@hooks': resolve(__dirname, 'src/renderer/hooks'),
      '@store': resolve(__dirname, 'src/renderer/store'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

