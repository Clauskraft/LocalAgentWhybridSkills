import esbuild from "esbuild";

/**
 * Watch + bundle the Electron preload script into build/ui/preload.js.
 *
 * This is used by `npm run dev:ui`.
 */
const ctx = await esbuild.context({
  entryPoints: ["src/ui/preload.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "build/ui/preload.js",
  external: ["electron"],
  sourcemap: true,
});

await ctx.watch();
console.log("✅ Preload watch started (build/ui/preload.js)");

// keep process alive
process.stdin.resume();



