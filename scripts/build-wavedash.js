#!/usr/bin/env node
// Build the web/ directory for the Wavedash deploy.
// Copy src/ and the assets of public/ in web/ (without index.html and main.js).

import { cpSync, rmSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const copies = [
  { from: 'src',           to: 'web/src'   },
  { from: 'public/fonts',  to: 'web/fonts' },
  { from: 'public/sfx',    to: 'web/sfx'   },
];

for (const { from, to } of copies) {
  const src  = join(root, from);
  const dest = join(root, to);
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`✓  ${from}  →  ${to}`);
}

console.log('\nweb directory ready to wavedash deploy.');
