#!/usr/bin/env node
/**
 * Fail if English/IT jargon or raw enums leak into user-facing UI strings.
 * Layers: phrase blocklist + SCREAMING_SNAKE / known single-word enums
 * only inside label|title|message|description|placeholder string values
 * and JSX text children (not logic / ROUTES / API constants).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'src');

const SCAN_GLOBS = [
  'features/hackathons',
  'features/mentor',
  'features/analytics',
  'features/coordinator',
  'features/judging',
  'features/people',
  'features/criteria',
  'features/rounds',
  'features/presentation',
  'features/auth',
  'student',
  'shared/components/layout',
];

const PHRASE_BLOCKLIST = [
  'Support Teams',
  'Management Cockpit',
  'Mentor Portal',
  'View Active Round',
  'Deadline & sự kiện',
  'Đội ACTIVE',
  'Không còn PENDING',
  'Readiness ổn',
  'blocker readiness',
  'Expert Lead',
  'Mentor Pham',
  'Track #',
  'Team #',
  'Wild Card',
  'Category OTHER',
  'dùng HARD_LOCK',
  '(HARD_LOCK)',
  '(ON_TIME)',
  '(LATE_PENDING)',
  'HARD_LOCK queue',
  'Lock scoring',
  'Chờ leader',
  'khi leader ',
  '(Copy)',
];

const PROP_WORD_BLOCKLIST = [
  'Overview',
  'Profile',
  'Logout',
  'Deadline',
  'Readiness',
];

const SNAKE_RE = /\b[A-Z][A-Z0-9]*(_[A-Z0-9]+)+\b/g;
const SINGLE_ENUM_RE = /\b(ONGOING|DRAFT|ACTIVE|LOCKED|SUBMITTED|REJECTED|FINISHED|PENDING|INACTIVE|CLOSED|COMPLETED|APPROVED|ELIMINATED)\b/g;

/** Extract string values of UI-facing props */
const UI_PROP_VALUE_RE =
  /(?:label|title|message|description|placeholder)\s*[:=]\s*(['"`])([\s\S]*?)\1/g;

const EXT = new Set(['.js', '.jsx', '.ts', '.tsx']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXT.has(path.extname(name))) out.push(full);
  }
  return out;
}

function skipComment(line) {
  const t = line.trim();
  return !t || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

function scanEnumInText(text, rel, lineNo, line, hits) {
  let m;
  const snake = new RegExp(SNAKE_RE.source, 'g');
  while ((m = snake.exec(text)) !== null) {
    hits.push({ rel, line: lineNo, match: m[0], snippet: line.trim().slice(0, 140) });
  }
  const single = new RegExp(SINGLE_ENUM_RE.source, 'g');
  while ((m = single.exec(text)) !== null) {
    hits.push({ rel, line: lineNo, match: m[0], snippet: line.trim().slice(0, 140) });
  }
}

function checkFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const hits = [];
  const rel = path.relative(ROOT, filePath).replace(/\\/g, '/');
  if (/\.test\.|\.spec\./.test(rel)) return hits;

  const lines = text.split(/\r?\n/);

  // 1) Phrase blocklist (whole file lines)
  for (const phrase of PHRASE_BLOCKLIST) {
    lines.forEach((line, i) => {
      if (skipComment(line)) return;
      if (!line.includes(phrase)) return;
      // allow technical comparisons
      if (/===\s*['"`]/.test(line) && !/(?:label|title|message|description|placeholder)/.test(line)) return;
      hits.push({ rel, line: i + 1, match: phrase, snippet: line.trim().slice(0, 140) });
    });
  }

  // 2) Prop word blocklist
  for (const w of PROP_WORD_BLOCKLIST) {
    const re = new RegExp(`(?:label|title|message|description|placeholder)\\s*[:=]\\s*['\`"]${w}['\`"]`);
    lines.forEach((line, i) => {
      if (!skipComment(line) && re.test(line)) {
        hits.push({ rel, line: i + 1, match: w, snippet: line.trim().slice(0, 140) });
      }
    });
  }

  // 3) Enums only inside UI prop string values (per-line + multiline-ish single line)
  lines.forEach((line, i) => {
    if (skipComment(line)) return;
    let m;
    const re = new RegExp(UI_PROP_VALUE_RE.source, 'g');
    while ((m = re.exec(line)) !== null) {
      scanEnumInText(m[2], rel, i + 1, line, hits);
    }
  });

  // 4) JSX text children: >TEXT< where TEXT has spaces or Vietnamese and enums
  lines.forEach((line, i) => {
    if (skipComment(line)) return;
    const jsxText = />([^<>{]+)</g;
    let m;
    while ((m = jsxText.exec(line)) !== null) {
      const chunk = m[1].trim();
      if (chunk.length < 4) continue;
      if (!/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ\s—–·()]/.test(chunk)) {
        continue;
      }
      scanEnumInText(chunk, rel, i + 1, line, hits);
    }
  });

  // 5) Template literals used as UI: message.warning/success/error(`...`) or Alert children strings with Vietnamese
  lines.forEach((line, i) => {
    if (skipComment(line)) return;
    if (!/message\.(warning|success|error|info)|toast\.(success|error)|Modal\.(confirm|warning)/.test(line)) return;
    const q = /['"`]([^'"`]{6,})['"`]/g;
    let m;
    while ((m = q.exec(line)) !== null) {
      scanEnumInText(m[1], rel, i + 1, line, hits);
    }
  });

  return hits;
}

const files = SCAN_GLOBS.flatMap((g) => walk(path.join(ROOT, g)));
const allHits = files.flatMap(checkFile);
const seen = new Set();
const unique = allHits.filter((h) => {
  const k = `${h.rel}:${h.line}:${h.match}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

if (unique.length === 0) {
  console.log(`vi-ui-blocklist-check: PASS (${files.length} files scanned, 0 hits)`);
  process.exit(0);
}

console.error(`vi-ui-blocklist-check: FAIL (${unique.length} hits)\n`);
for (const h of unique) {
  console.error(`  ${h.rel}:${h.line}  [${h.match}]`);
  console.error(`    ${h.snippet}`);
}
process.exit(1);
