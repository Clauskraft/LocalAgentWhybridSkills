import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

/**
 * SCA-01 Vite Configuration
 * Builds React renderer for Electron
 */
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  root: 'src/renderer',
  base: './',
  build: {
    // Emit renderer assets into Electron's build/ui folder so main process
    // can load index.html via loadFile(__dirname, 'index.html')
    outDir: '../../build/ui',
    emptyOutDir: true,
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
  esbuild: {
    tsconfig: 'tsconfig.renderer.json',
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});

