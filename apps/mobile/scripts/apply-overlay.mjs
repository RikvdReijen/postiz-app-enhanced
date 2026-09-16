#!/usr/bin/env node
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const from = resolve(root, 'native/android/app/src/main');
const to = resolve(root, 'android/app/src/main');
const gradle = resolve(root, 'android/app/build.gradle');

if (!existsSync(to)) {
  console.error('android/ is missing. Run `pnpm run setup:android` first.');
  process.exit(1);
}

// Overwrites the generated MainActivity and manifest on purpose — those are
// ours, and `cap sync` regenerates them from its templates otherwise.
cpSync(from, to, { recursive: true });
console.log('Copied native/android over android/.');

/**
 * Applies the Gradle additions our native sources need.
 *
 * Done here rather than left as a manual merge step so CI can build the APK
 * unattended. It is idempotent — a marker comment means a second run is a
 * no-op, which matters because `cap sync` rewrites parts of this file.
 */
const MARKER = '// --- PostPls ---';

if (!existsSync(gradle)) {
  console.warn('android/app/build.gradle not found; skipping Gradle additions.');
  process.exit(0);
}

const current = readFileSync(gradle, 'utf8');
if (current.includes(MARKER)) {
  console.log('Gradle additions already present.');
  process.exit(0);
}

const additions = `
${MARKER}
android {
    defaultConfig {
        // Fills \${postplsHost} in AndroidManifest.xml, so App Links verify
        // against your own host rather than a hardcoded domain.
        manifestPlaceholders = [postplsHost: project.findProperty("postplsHost") ?: "postpls.local"]
    }
}

dependencies {
    // Google sign-in + Drive token minting for the offline sync path.
    implementation "com.google.android.gms:play-services-auth:21.2.0"
    implementation "androidx.core:core-ktx:1.13.1"
}
`;

writeFileSync(gradle, `${current}\n${additions}`);
console.log('Applied PostPls Gradle additions.');
