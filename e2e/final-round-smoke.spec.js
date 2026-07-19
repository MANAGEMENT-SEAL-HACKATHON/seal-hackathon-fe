/**
 * Final round smoke - revived on live seed seal-gd5-final-active.
 * Read-only: coordinator final-config page + student final submission area.
 * NOTE: Vietnamese UI text uses \uXXXX escapes (repo tooling writes ASCII only).
 */
import { test, expect } from '@playwright/test';
import { findHackathonBySlug, waitForBackendReady, waitForLoginToken, waitForSeedSlug } from './helpers/api.js';
import { loginAs } from './helpers/uiAuth.js';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';
const COORD_PASSWORD = process.env.E2E_COORD_PASSWORD || 'Coordinator@dev1';
const STUDENT_EMAIL =
  process.env.E2E_STUDENT_FINAL_EMAIL ||
  process.env.E2E_STUDENT_GD5_EMAIL ||
  'student.gd5.leader03@fpt.edu.vn';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'Student@dev1';
const FINAL_ACTIVE_SEED = 'seal-gd5-final-active';

// "Cau hinh Vong Chung ket|Cau hinh chung ket"
const RE_FINAL_CONFIG_TITLE =
  /C\u1EA5u h\u00ECnh V\u00F2ng Chung k\u1EBFt|C\u1EA5u h\u00ECnh chung k\u1EBFt/i;
// "Checklist van hanh - Chung ket"
const RE_FINAL_CHECKLIST = /Checklist v\u1EADn h\u00E0nh \u2014 Chung k\u1EBFt/i;
// "Lam moi"
const RE_REFRESH = /L\u00E0m m\u1EDBi/i;
// "Chon Vong thi|Cong nop bai|Chung ket"
const RE_SUBMIT_PAGE =
  /Ch\u1ECDn V\u00F2ng thi|C\u1ED5ng n\u1ED9p b\u00E0i|Chung k\u1EBFt/i;
// "Cong nop bai Vong Chung ket|Nop Bai du thi Vong Chung ket|Cap nhat Bai du thi Chung ket"
const RE_FINAL_SUBMIT_AREA =
  /C\u1ED5ng n\u1ED9p b\u00E0i V\u00F2ng Chung k\u1EBFt|N\u1ED9p B\u00E0i d\u1EF1 thi V\u00F2ng Chung k\u1EBFt|C\u1EADp nh\u1EADt B\u00E0i d\u1EF1 thi Chung k\u1EBFt/i;

test.describe('Final round smoke', () => {
  test.beforeAll(async () => {
    const ready = await waitForBackendReady();
    expect(ready, 'BE dev server not reachable').toBeTruthy();
    const coordToken = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const finalSeed = await waitForSeedSlug(FINAL_ACTIVE_SEED, coordToken);
    expect(finalSeed, `Seed ${FINAL_ACTIVE_SEED} not ready`).toBeTruthy();
  });

  test('final-config page loads', async ({ page }) => {
    const token = await waitForLoginToken(COORD_EMAIL, COORD_PASSWORD);
    const hackathon = await findHackathonBySlug(FINAL_ACTIVE_SEED, token);
    expect(hackathon, `Seed ${FINAL_ACTIVE_SEED} not found`).toBeTruthy();

    await loginAs(page, { email: COORD_EMAIL, password: COORD_PASSWORD, role: 'coord' });
    await page.goto(`/coordinator/final-config?hackathonId=${hackathon.id}`);
    await expect(page.getByText(RE_FINAL_CONFIG_TITLE).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(RE_FINAL_CHECKLIST).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: RE_REFRESH }).first()).toBeVisible();
  });

  test('student submit page shows final submission area', async ({ page }) => {
    const token = await waitForLoginToken(STUDENT_EMAIL, STUDENT_PASSWORD, {
      timeoutMs: 20_000,
      intervalMs: 1_000,
    });
    expect(token, `Student ${STUDENT_EMAIL} not available`).toBeTruthy();

    await loginAs(page, { email: STUDENT_EMAIL, password: STUDENT_PASSWORD, role: 'student' });
    await page.goto('/student/submit');
    await expect(page.getByText(RE_SUBMIT_PAGE).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(RE_FINAL_SUBMIT_AREA).first()).toBeVisible({ timeout: 15_000 });
  });
});
