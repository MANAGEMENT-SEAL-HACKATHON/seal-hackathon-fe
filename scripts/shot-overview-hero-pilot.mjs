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
await page.getByPlaceholder('example@hackathon.com').waitFor({ state: 'visible', timeout: 30_000 });
await page.getByPlaceholder('example@hackathon.com').fill('coord@fpt.edu.vn');
await page.getByPlaceholder('••••••••').fill('Coordinator@dev1');
await page.getByRole('button', { name: /Đăng nhập/i }).click();
await page.waitForURL(/\/(dashboard|student|judge|mentor|hackathons)/, { timeout: 45_000 });
await page.goto(`${FE}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
await page.getByTestId('overview-hero').waitFor({ state: 'visible', timeout: 30_000 });
await page.waitForTimeout(1500);

const heroPath = path.join(outDir, 'overview-hero-pilot.png');
await page.getByTestId('overview-hero').screenshot({ path: heroPath });
await page.screenshot({ path: path.join(outDir, 'overview-hero-pilot-full.png'), fullPage: false });

console.log('Wrote', heroPath);
await browser.close();
