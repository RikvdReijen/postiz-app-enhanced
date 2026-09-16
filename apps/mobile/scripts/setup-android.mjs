#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const androidDir = resolve(root, 'android');

/**
 * Generates the Gradle project once, then lays our native sources over it.
 *
 * The generated scaffolding is Capacitor's to own and changes between its
 * versions, so it is not committed; everything we actually wrote lives in
 * native/android and is copied on top.
 */
if (existsSync(androidDir)) {
  console.log('android/ already exists — skipping `cap add android`.');
} else {
  console.log('Generating the Android project…');
  execSync('npx cap add android', { cwd: root, stdio: 'inherit' });
}

execSync('node scripts/apply-overlay.mjs', { cwd: root, stdio: 'inherit' });

console.log(`
Next steps:
  1. Put your Google OAuth client's google-services.json in android/app/ if you
     want the Drive fallback (the app works against the host without it).
  2. Build with your own host so App Links verify against it:
       cd android && ./gradlew assembleDebug -PpostplsHost=postiz.example.com
  3. pnpm run open:android
`);
