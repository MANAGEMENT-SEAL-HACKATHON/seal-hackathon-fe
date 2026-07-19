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
await page.waitForURL(/\/(dashboard|hackathons)/, { timeout: 45_000 });

// Select FINISHED event if possible
const selector = page.locator('[data-testid="global-event-selector"] .ant-select');
await selector.click();
await page.waitForTimeout(400);
const finishedOpt = page.locator('.ant-select-item-option').filter({ hasText: /Fall 2025|Đã kết thúc|Finished|Completed/i }).first();
if (await finishedOpt.count()) {
  await finishedOpt.click();
} else {
  await page.keyboard.press('Escape');
}
await page.waitForTimeout(1000);

// Progress shell
const progressTab = page.locator('text=TIẾN ĐỘ').first();
if (await progressTab.count()) {
  await progressTab.click().catch(() => {});
  await page.waitForTimeout(800);
}
await page.screenshot({ path: path.join(outDir, 'fix-01-stepper-finished.png'), fullPage: false });

// Dashboard todo card
await page.goto(`${FE}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(outDir, 'fix-02-todo-card.png'), fullPage: false });

// Quick action -> teams, check sidebar
await page.getByRole('button', { name: /Quản lý đội/i }).first().click().catch(async () => {
  await page.goto(`${FE}/teams/9`, { waitUntil: 'networkidle' });
});
await page.waitForTimeout(1500);
const teamsSelected = await page.locator('.ant-menu-item-selected').filter({ hasText: /Quản lý đội/i }).count();
await page.screenshot({ path: path.join(outDir, 'fix-03-sidebar-teams.png'), fullPage: false });

// Analytics — no calibration + sidebar
await page.goto(`${FE}/coordinator/analytics`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(2000);
const body = await page.locator('body').innerText();
const calibLeak = /Hiệu chỉnh giám khảo|Phiên đồng thuận mẫu/i.test(body);
const analyticsSelected = await page.locator('.ant-menu-item-selected').filter({ hasText: /Phân tích/i }).count();
await page.screenshot({ path: path.join(outDir, 'fix-04-analytics.png'), fullPage: false });

// Switch event while on analytics
await selector.click().catch(() => {});
await page.waitForTimeout(300);
const other = page.locator('.ant-select-item-option').nth(1);
if (await other.count()) await other.click();
await page.waitForTimeout(1500);
const analyticsSelectedAfter = await page.locator('.ant-menu-item-selected').filter({ hasText: /Phân tích/i }).count();
await page.screenshot({ path: path.join(outDir, 'fix-05-analytics-switch.png'), fullPage: false });

console.log(JSON.stringify({
  teamsSelected,
  analyticsSelected,
  analyticsSelectedAfter,
  calibLeak,
}, null, 2));
await browser.close();
