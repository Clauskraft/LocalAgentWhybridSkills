import esbuild from 'esbuild';

/**
 * Bundle preload script for Electron packaging
 * Converts ESM to CommonJS for compatibility with electron-builder
 */
await esbuild.build({
  entryPoints: ['src/ui/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'build/ui/preload.js',
  external: ['electron'],
  sourcemap: true,
});

console.log('✅ Preload script bundled successfully');
