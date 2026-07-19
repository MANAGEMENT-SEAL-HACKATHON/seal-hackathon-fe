/**
 * SEC-CLOU-02 — Fail if Cloudinary API secret leaks into FE source or env templates.
 * Usage: node scripts/scan-cloudinary-secret.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
// Build needle at runtime so this file never contains the contiguous env key.
const NEEDLE = ['VITE', 'CLOUDINARY', 'API', 'SECRET'].join('_');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'playwright-report', 'test-results', '.git', 'coverage']);
const SELF = path.normalize(fileURLToPath(import.meta.url));

const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (path.normalize(full) === SELF) continue;
    if (!/\.(js|jsx|ts|tsx|mjs|cjs|env|env\..*|md|json|html|css)$/i.test(entry.name)
      && !entry.name.startsWith('.env')) {
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    if (text.includes(NEEDLE)) {
      hits.push(path.relative(root, full));
    }
  }
}

walk(root);

if (hits.length) {
  console.error('SEC-CLOU-02 FAIL — forbidden Cloudinary secret references:');
  for (const h of hits) console.error(' -', h);
  process.exit(1);
}

console.log('SEC-CLOU-02 PASS — no Cloudinary API secret env key in FE tree');
