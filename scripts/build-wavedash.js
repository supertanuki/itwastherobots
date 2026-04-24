#!/usr/bin/env node
// Assemble le dossier web/ pour le déploiement Wavedash.
// Copie src/ et les assets de public/ dans web/, puis réécrit les imports Phaser.

import { cpSync, rmSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const PHASER_CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.85.0/dist/phaser.esm.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const copies = [
  { from: 'src',          to: 'web/src'   },
  { from: 'public/fonts', to: 'web/fonts' },
  { from: 'public/sfx',   to: 'web/sfx'   },
];

for (const { from, to } of copies) {
  const src  = join(root, from);
  const dest = join(root, to);
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`✓  ${from}  →  ${to}`);
}

// Réécrire "from 'phaser'" → URL CDN dans tous les .js copiés
let rewritten = 0;
function rewriteDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { rewriteDir(full); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const src = readFileSync(full, 'utf8');
    const out = src.replaceAll("import Phaser from 'phaser'", `import * as Phaser from '${PHASER_CDN}'`);
    if (out !== src) { writeFileSync(full, out); rewritten++; }
  }
}
rewriteDir(join(root, 'web/src'));
console.log(`✓  imports Phaser réécrits (${rewritten} fichiers)`);

console.log('\nDossier web/ prêt pour wavedash build push.');
