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

await page.goto(`${FE}/admin/temp-judges`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1500);

// Header + selector (status badge, clean name)
const header = page.locator('.coord-shell-header, .ant-layout-header').first();
await header.screenshot({ path: path.join(outDir, 'polish-01-header-selector.png') });

// Open dropdown
await page.locator('[data-testid="global-event-selector"] .ant-select').click();
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(outDir, 'polish-02-dropdown-open.png'), fullPage: false });
await page.keyboard.press('Escape');

// Temp judges page — policy tooltip, no banner Alert
await page.screenshot({ path: path.join(outDir, 'polish-03-temp-judges.png'), fullPage: false });
const policy = page.getByText('Chính sách vòng đời');
await policy.hover();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(outDir, 'polish-04-temp-judges-tooltip.png'), fullPage: false });

// Sidebar tint
const sider = page.locator('.coord-shell-sider, .ant-layout-sider').first();
await sider.screenshot({ path: path.join(outDir, 'polish-05-sidebar.png') });

// Dark mode — shell tint should not apply
await page.getByRole('button', { name: /Chuyển sang chế độ tối|chế độ tối/i }).click().catch(async () => {
  await page.locator('button').filter({ has: page.locator('.anticon-moon, .anticon-sun') }).first().click();
});
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(outDir, 'polish-06-dark.png'), fullPage: false });

const alertBanners = await page.locator('.ant-alert').filter({ hasText: 'Chính sách vòng đời' }).count();
const statusText = await page.locator('[data-testid="global-event-status"]').textContent().catch(() => '');
const selectedLabel = await page.locator('[data-testid="global-event-selector"] .ant-select-selection-item').textContent().catch(() => '');

console.log('policy-banner-alerts:', alertBanners);
console.log('header-status:', statusText?.trim());
console.log('selected-label:', selectedLabel?.trim());
console.log('js-errors:', jsErrors.length ? jsErrors.slice(0, 5).join(' | ') : 'none');
await browser.close();
