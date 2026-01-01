#!/usr/bin/env node

// Wrapper to run Electron with tsx loader for TypeScript support
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron.cmd');
const entryFile = process.argv[2] || 'src/ui/main.ts';

// Use tsx to transpile on the fly
const child = spawn('npx', ['tsx', '--tsconfig', 'tsconfig.json', electronPath, entryFile], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname,
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1'
  }
});

child.on('exit', (code) => process.exit(code ?? 0));

