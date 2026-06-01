#!/usr/bin/env zx
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
process.env.PINGCLAW_PORTABLE_BUILD = '1';

await $`node scripts/run-electron-builder.mjs --win --config electron-builder.portable.yml --publish never`;
await $`node scripts/assemble-portable.mjs win`;

console.log('[build-portable-win] Done');
