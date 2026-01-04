import esbuild from 'esbuild';

/**
 * Bundle preload script for Electron packaging
 * Converts ESM to CommonJS for compatibility with electron-builder
 */
await esbuild.build({
  entryPoints: {
    preload: 'src/ui/preload.ts',
    preloadChat: 'src/ui/preloadChat.ts',
    preloadCockpit: 'src/ui/preloadCockpit.ts',
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: 'build/ui',
  entryNames: '[name]',
  outExtension: { '.js': '.cjs' },
  external: ['electron'],
  sourcemap: true,
});

console.log('✅ Preload script bundled successfully');
