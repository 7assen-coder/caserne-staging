#!/usr/bin/env node
/**
 * Assert SPA nginx cache rules (replaces archived smoke_phase20_cache.sh).
 * Fails if nginx.conf / nginx.compose.conf drift from expected Cache-Control policy.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['nginx.conf', 'nginx.compose.conf'];

const required = [
  { re: /gzip\s+on\s*;/, label: 'gzip on' },
  {
    re: /location\s+\/assets\/\s*\{[\s\S]*?Cache-Control\s+"public,\s*max-age=31536000,\s*immutable"/,
    label: '/assets/ immutable long-cache',
  },
  {
    re: /location\s+=\s+\/index\.html\s*\{[\s\S]*?Cache-Control\s+"no-cache,\s*no-store,\s*must-revalidate"/,
    label: '/index.html no-cache',
  },
  {
    re: /location\s+\/\s*\{[\s\S]*?Cache-Control\s+"no-cache"/,
    label: 'location / no-cache',
  },
  {
    re: /location\s+=\s+\/esp-logo\.png\s*\{[\s\S]*?Cache-Control\s+"public,\s*max-age=604800"/,
    label: '/esp-logo.png ~7d cache',
  },
];

let failed = false;
for (const name of files) {
  const path = join(root, name);
  const text = readFileSync(path, 'utf8');
  for (const { re, label } of required) {
    if (!re.test(text)) {
      console.error(`FAIL ${name}: missing ${label}`);
      failed = true;
    } else {
      console.log(`OK   ${name}: ${label}`);
    }
  }
}

if (failed) {
  process.exit(1);
}
console.log('nginx cache contract passed');
