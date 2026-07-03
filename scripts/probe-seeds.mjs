#!/usr/bin/env node
/**
 * CLI — probe BE state for all 49 dev seed slugs.
 * Usage: npm run probe:seeds
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAllProbes } from '../e2e/helpers/seedApiProbe.js';
import { BE_DEV_SLUGS } from '../e2e/helpers/devSeedCatalogSlugs.js';
import { probeAccountStates } from '../e2e/helpers/accountStates.js';
import { probeNegatives } from '../e2e/helpers/negativeProbes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

async function main() {
  console.log(`Probing ${BE_DEV_SLUGS.length} dev seed slugs against ${process.env.BE_BASE_URL || 'http://localhost:8080/api/v1'}...\n`);

  let results;
  try {
    results = await runAllProbes();
  } catch (err) {
    console.error('Probe failed to start:', err.message);
    process.exit(2);
  }

  // Account-state seeds (Module 5 — không phải slug hackathon): map key → slug field.
  try {
    const accountResults = await probeAccountStates();
    results = results.concat(accountResults.map((r) => ({ ...r, slug: `account:${r.key}` })));
  } catch (err) {
    console.error('Account-state probe failed:', err.message);
    process.exit(2);
  }

  // Negative abuse probes (P1 — API sai → expect ErrorCode).
  try {
    const negResults = await probeNegatives();
    results = results.concat(negResults.map((r) => ({ ...r, slug: `neg:${r.key}` })));
  } catch (err) {
    console.error('Negative probe failed:', err.message);
    process.exit(2);
  }

  const failed = results.filter((r) => !r.pass);
  const passed = results.filter((r) => r.pass);

  for (const r of results) {
    const mark = r.pass ? 'PASS' : 'FAIL';
    const extra = r.reason ? ` — ${r.reason}${r.detail ? ` (${r.detail})` : ''}` : '';
    console.log(`${mark}  ${r.slug}${extra}`);
  }

  console.log(`\n${passed.length}/${results.length} passed, ${failed.length} failed`);

  if (failed.length > 0) {
    const date = new Date().toISOString().slice(0, 10);
    const reportDir = resolve(root, '..', 'BE', 'docs', 'testing');
    mkdirSync(reportDir, { recursive: true });
    const reportPath = resolve(reportDir, `seed-probe-report-${date}.md`);
    const lines = [
      `# Seed API probe report — ${date}`,
      '',
      `**Result:** ${passed.length}/${results.length} passed`,
      '',
      '| Slug | Status | Reason | Detail |',
      '|------|--------|--------|--------|',
      ...results.map((r) => `| \`${r.slug}\` | ${r.pass ? 'PASS' : 'FAIL'} | ${r.reason || ''} | ${r.detail || ''} |`),
      '',
    ];
    writeFileSync(reportPath, lines.join('\n'), 'utf8');
    console.log(`\nReport written: ${reportPath}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
