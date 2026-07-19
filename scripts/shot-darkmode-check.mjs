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

await page.goto(`${FE}/login`, { waitUntil: 'domcontentloaded' });
await page.getByPlaceholder('example@hackathon.com').fill('coord@fpt.edu.vn');
await page.getByPlaceholder('••••••••').fill('Coordinator@dev1');
await page.getByRole('button', { name: /Đăng nhập/i }).click();
await page.waitForURL(/\/(dashboard|student|judge|mentor|hackathons)/, { timeout: 45_000 });
await page.goto(`${FE}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);

// Toggle dark mode via the moon button in the header (aria or icon button)
const moon = page.locator('header button, .ant-layout-header button').filter({ has: page.locator('svg') });
const count = await moon.count();
let toggled = false;
for (let i = 0; i < count; i += 1) {
  const html = await moon.nth(i).innerHTML();
  if (/moon|Moon/.test(html)) {
    await moon.nth(i).click();
    toggled = true;
    break;
  }
}
if (!toggled) {
  // fallback: anticon-based toggle
  const btn = page.locator('[aria-label*="dark"], [data-testid="dark-mode-toggle"]').first();
  if (await btn.count()) {
    await btn.click();
    toggled = true;
  }
}
console.log('dark-toggle-clicked:', toggled);
await page.waitForTimeout(1200);
await page.screenshot({ path: path.join(outDir, 'theme-08-overview-dark.png'), fullPage: false });

await page.goto(`${FE}/coordinator/final-config?hackathonId=9`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1800);
await page.screenshot({ path: path.join(outDir, 'theme-09-final-config-dark.png'), fullPage: false });

console.log('done');
await browser.close();
