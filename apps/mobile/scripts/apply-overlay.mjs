#!/usr/bin/env node
import { cpSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'native/android/app/src/main');
const to = resolve(root, 'android/app/src/main');

if (!existsSync(to)) {
  console.error('android/ is missing. Run `pnpm run setup:android` first.');
  process.exit(1);
}

// Overwrites the generated MainActivity and manifest on purpose — those are
// ours, and `cap sync` regenerates them from its templates otherwise.
cpSync(from, to, { recursive: true });
console.log('Copied native/android over android/.');
