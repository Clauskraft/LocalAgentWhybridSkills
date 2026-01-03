import { main } from "./toolServerFull.js";

// Thin entrypoint wrapper.
// This exists because the UI/server catalog and docs reference `build/mcp/toolServer.js`.

if (import.meta.url === new URL(process.argv[1] ?? "", "file:").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}


