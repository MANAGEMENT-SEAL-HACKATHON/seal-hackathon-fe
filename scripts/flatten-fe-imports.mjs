import fs from 'fs';
import path from 'path';

const feRoot = path.resolve('.');
const srcRoot = path.join(feRoot, 'src');
const mapRaw = JSON.parse(fs.readFileSync(path.join(feRoot, 'fe-move-map.json'), 'utf8').replace(/^\uFEFF/, ''));

const JS_EXT = ['.js', '.jsx', '.ts', '.tsx'];
const stripExt = (p) => {
  const e = path.extname(p);
  return JS_EXT.includes(e) ? p.slice(0, -e.length) : p;
};
const norm = (p) => path.normalize(p).toLowerCase();

const oldToNewExtless = new Map();
const newToOld = new Map();
for (const [o, n] of Object.entries(mapRaw)) {
  oldToNewExtless.set(norm(stripExt(o)), stripExt(n));
  newToOld.set(norm(n), o);
}

const files = [];
const walk = (dir) => {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (JS_EXT.includes(path.extname(ent.name))) files.push(full);
  }
};
walk(srcRoot);

const importRe = /((?:import|export)\s[^'"]*?from\s*|import\s*|require\(\s*|import\(\s*)(['"])(\.[^'"]*)\2/g;

let changedCount = 0;
for (const curAbs of files) {
  const isMoved = newToOld.has(norm(curAbs));
  const oldAbs = isMoved ? newToOld.get(norm(curAbs)) : curAbs;
  const dirOld = path.dirname(oldAbs);
  const dirNew = path.dirname(curAbs);
  const original = fs.readFileSync(curAbs, 'utf8');

  const updated = original.replace(importRe, (match, pre, quote, rawPath) => {
    const targetOldAbs = path.resolve(dirOld, rawPath);
    const key = norm(stripExt(targetOldAbs));
    const targetNewExtless = oldToNewExtless.has(key)
      ? oldToNewExtless.get(key)
      : stripExt(targetOldAbs);
    const origExt = path.extname(rawPath);
    const hadJsExt = JS_EXT.includes(origExt);
    const targetFinal = hadJsExt ? targetNewExtless + origExt : targetNewExtless;
    let rel = path.relative(dirNew, targetFinal).split(path.sep).join('/');
    if (!rel.startsWith('.')) rel = './' + rel;
    return `${pre}${quote}${rel}${quote}`;
  });

  if (updated !== original) {
    fs.writeFileSync(curAbs, updated);
    changedCount++;
    console.log('FIXED', path.relative(srcRoot, curAbs));
  }
}
console.log('TOTAL FILES CHANGED:', changedCount);
