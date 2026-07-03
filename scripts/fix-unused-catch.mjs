import fs from 'node:fs';
import path from 'node:path';

const srcRoot = path.resolve('src');
const catchRe = /catch\s*\(\s*(\w+)\s*\)\s*\{/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (/\.(js|jsx)$/.test(entry.name)) files.push(full);
  }
  return files;
}

function fixFile(file) {
  const original = fs.readFileSync(file, 'utf8');
  let changed = false;
  const next = original.replace(catchRe, (match, name, offset) => {
    if (name.startsWith('_')) return match;
    const open = offset + match.length;
    const close = findMatchingBrace(original, open - 1);
    if (close < 0) return match;
    const body = original.slice(open, close);
    const used = new RegExp(`\\b${name}\\b`).test(body);
    if (used) return match;
    changed = true;
    return match.replace(`(${name})`, `(_${name})`);
  });
  if (changed) fs.writeFileSync(file, next);
  return changed;
}

function findMatchingBrace(text, openIdx) {
  if (text[openIdx] !== '{') return -1;
  let depth = 0;
  for (let i = openIdx; i < text.length; i++) {
    const ch = text[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

let count = 0;
for (const file of walk(srcRoot)) {
  if (fixFile(file)) count++;
}
console.log(`Updated ${count} files`);
