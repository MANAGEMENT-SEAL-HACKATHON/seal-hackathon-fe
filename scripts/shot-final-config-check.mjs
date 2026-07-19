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
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
});

await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
await page.getByPlaceholder('example@hackathon.com').fill('coord@fpt.edu.vn');
await page.getByPlaceholder('••••••••').fill('Coordinator@dev1');
await page.getByRole('button', { name: /Đăng nhập/i }).click();
await page.waitForURL(/\/(dashboard|student|judge|mentor|hackathons)/, { timeout: 45_000 });

await page.goto(`${FE}/coordinator/final-config?hackathonId=9`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(2500);
await page.screenshot({ path: path.join(outDir, 'final-config-check.png'), fullPage: false });
await page.screenshot({ path: path.join(outDir, 'final-config-check-full.png'), fullPage: true });

// Header overflow check: does the event status badge stay inside the 72px header?
const overflow = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="global-event-status"]');
  if (!el) return 'no-status-el';
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, height: r.height, ok: r.top >= 0 && r.bottom <= 72 };
});
console.log('header-status-rect:', JSON.stringify(overflow));
console.log('js-errors:', errors.length ? errors.slice(0, 8).join('\n') : 'none');
await browser.close();
