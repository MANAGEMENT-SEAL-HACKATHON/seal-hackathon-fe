import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = process.env.E2E_BASE_URL || 'http://localhost:5173';
const outDir = path.resolve(__dirname, '../../BE/docs/testing/ui-audit-2026-07-19');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));

await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
await page.getByPlaceholder('example@hackathon.com').fill('coord@fpt.edu.vn');
await page.getByPlaceholder('••••••••').fill('Coordinator@dev1');
await page.getByRole('button', { name: /Đăng nhập/i }).click();
await page.waitForURL(/\/(dashboard|student|judge|mentor|hackathons)/, { timeout: 45_000 });

const states = [
  ['fc-scope', '/coordinator/final-config', 'fc-state-scope.png'],
  ['fc-9', '/coordinator/final-config?hackathonId=9', 'fc-state-9.png'],
  ['fc-6', '/coordinator/final-config?hackathonId=6', 'fc-state-6.png'],
  ['fc-10', '/coordinator/final-config?hackathonId=10', 'fc-state-10.png'],
];

for (const [name, route, file] of states) {
  const before = errors.length;
  await page.goto(`${FE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2200);
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
  console.log(name, '->', file, '| new-errors:', errors.length - before);
}

console.log('ALL-ERRORS:', errors.length ? JSON.stringify(errors, null, 1) : 'none');
await browser.close();
