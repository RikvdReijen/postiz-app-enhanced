#!/usr/bin/env node
import { cpSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Copied rather than committed twice: the marks live with the web app, and a
// second checked-in copy is a copy that quietly goes stale.
const from = resolve(root, '../frontend/public/postpls');
const to = resolve(root, 'public/postpls');

mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log('Copied brand marks into public/postpls.');
