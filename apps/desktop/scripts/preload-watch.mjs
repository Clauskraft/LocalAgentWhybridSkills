import esbuild from "esbuild";

/**
 * Watch + bundle the Electron preload scripts into build/ui/*.cjs.
 *
 * This is used by `npm run dev:ui`.
 */
const ctx = await esbuild.context({
  entryPoints: {
    preload: "src/ui/preload.ts",
    preloadChat: "src/ui/preloadChat.ts",
    preloadCockpit: "src/ui/preloadCockpit.ts",
  },
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outdir: "build/ui",
  entryNames: "[name]",
  outExtension: { ".js": ".cjs" },
  external: ["electron"],
  sourcemap: true,
});

await ctx.watch();
console.log("✅ Preload watch started (build/ui/*.cjs)");

// keep process alive
process.stdin.resume();



