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
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message));

await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
await page.getByPlaceholder('example@hackathon.com').fill('coord@fpt.edu.vn');
await page.getByPlaceholder('••••••••').fill('Coordinator@dev1');
await page.getByRole('button', { name: /Đăng nhập/i }).click();
await page.waitForURL(/\/(dashboard|student|judge|mentor|hackathons)/, { timeout: 45_000 });

const shots = [
  ['dashboard', '/dashboard', 'theme-01-overview.png'],
  ['hackathons', '/hackathons', 'theme-02-event-list.png'],
  ['teams', '/teams', 'theme-03-teams.png'],
  ['analytics', '/coordinator/analytics/9', 'theme-04-analytics.png'],
  ['user-approval', '/admin/users', 'theme-05-user-approval.png'],
  ['temp-judges', '/admin/temp-judges', 'theme-06-temp-judges.png'],
  ['final-config', '/coordinator/final-config?hackathonId=9', 'theme-07-final-config.png'],
];

for (const [name, route, file] of shots) {
  await page.goto(`${FE}${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, file), fullPage: false });
  console.log('shot', name, '->', file);
}

console.log('js-errors:', jsErrors.length ? jsErrors.slice(0, 5).join(' | ') : 'none');
await browser.close();
