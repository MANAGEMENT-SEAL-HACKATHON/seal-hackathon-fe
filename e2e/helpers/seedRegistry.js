/**
 * Dev seed matrix — mirrors BE DevSeedCatalog.ALL_DEV_HACKATHON_SLUGS (53 slugs).
 * Doc: BE/docs/testing/gd*-full-test-matrix-and-seeds.md
 */
import { expect } from '@playwright/test';

const COORD_EMAIL = process.env.E2E_COORD_EMAIL || 'coord@fpt.edu.vn';

/** @typedef {'coord' | 'student' | 'judge' | 'guest'} SeedRole */

/**
 * @typedef {object} SeedContext
 * @property {{ id: string|number, slug?: string, status?: string }} hackathon
 * @property {{ id: string|number, is_active?: boolean, isActive?: boolean } | null} [prelim]
 * @property {{ id: string|number, is_active?: boolean, isActive?: boolean } | null} [finalRound]
 */

/**
 * @typedef {object} DevSeedEntry
 * @property {string} slug
 * @property {string} stage
 * @property {string} label
 * @property {SeedRole} role
 * @property {string} email
 * @property {string} [password]
 * @property {(ctx: SeedContext) => string} buildPath
 * @property {(string|RegExp)[]} expectVisible
 * @property {(string|RegExp)[]} [expectNotVisible]
 * @property {string} [expectDisabledSelector]
 * @property {string} [expectEnabledSelector]
 * @property {(page: import('@playwright/test').Page) => Promise<void>} [runActions]
 */

/** @param {SeedContext} ctx */
function prelimResultsPath(ctx) {
  return `/hackathons/${ctx.hackathon.id}/rounds/${ctx.prelim.id}/results`;
}

/** @param {SeedContext} ctx */
function hackathonResultsPath(ctx) {
  return `/hackathons/${ctx.hackathon.id}/results`;
}

/** @param {SeedContext} ctx */
function finalConfigPath(ctx) {
  return `/coordinator/final-config?hackathonId=${ctx.hackathon.id}`;
}

/** @param {SeedContext} ctx */
function lateSubmissionsPath(ctx) {
  return `/coordinator/late-submissions?roundId=${ctx.prelim.id}`;
}

/** @param {SeedContext} ctx */
function presentationQueuePath(ctx) {
  return `/presentation/queue?roundId=${ctx.prelim.id}`;
}

/** @param {SeedContext} ctx */
function finalPresentationQueuePath(ctx) {
  return `/presentation/queue?roundId=${ctx.finalRound.id}`;
}

/** @param {SeedContext} ctx */
function finalLateSubmissionsPath(ctx) {
  return `/coordinator/late-submissions?roundId=${ctx.finalRound.id}`;
}

/** @type {DevSeedEntry[]} */
export const ALL_DEV_SEEDS = [
  // GĐ1–GĐ2
  {
    slug: 'seal-e2e-2026',
    stage: 'gd1',
    label: 'E2E ONGOING — setup readiness',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup`,
    expectVisible: [/SEAL E2E 2026/i, /Vòng thi \(Rounds\)|Bảng đấu/i],
  },
  {
    slug: 'seal-fall-2025-finished',
    stage: 'gd1',
    label: 'FINISHED archive — read-only results',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/FINISHED|Đã công bố kết quả/i],
    expectEnabledSelector: '#hackathon-export-csv',
  },
  {
    slug: 'seal-gd1-incomplete',
    stage: 'gd1',
    label: 'GĐ1 negative — readiness FAIL (DRAFT, no rounds)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=review`,
    expectVisible: [/Đánh giá|Readiness|Kiểm tra/i, /lỗi bắt buộc|NOT_READY|Chưa sẵn sàng/i],
  },
  {
    slug: 'seal-gd1-no-kickoff',
    stage: 'gd1',
    label: 'GĐ1 partial — thiếu KICKOFF (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=review`,
    expectVisible: [/No KICKOFF|Đánh giá & Kiểm tra/i, /lỗi bắt buộc|Chưa đủ điều kiện/i],
  },
  {
    slug: 'seal-gd1-no-awards',
    stage: 'gd1',
    label: 'GĐ1 partial — thiếu AWARDS readiness (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=review`,
    expectVisible: [/No AWARDS|Đánh giá & Kiểm tra/i, /lỗi bắt buộc|Chưa đủ điều kiện/i],
  },
  {
    slug: 'seal-gd1-judge-final-early',
    stage: 'gd1',
    label: 'GĐ1 gate — chưa gán judge CK (FINAL readiness blocker)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/Cấu hình Chung kết/i, /NOT_READY|JUDGE_FINAL|Chưa phân Judge Chung kết|Blockers/i],
  },
  {
    slug: 'seal-gd1-event-order-bad',
    stage: 'gd1',
    label: 'GĐ1 gate — 0 milestone event (EVENT_KICKOFF_MISSING)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=events`,
    expectVisible: [/Event order bad|GĐ1 — Event order|Sự kiện|Events/i, /KICKOFF|Chưa có sự kiện|milestone/i],
  },
  {
    slug: 'seal-gd1-event-order-violation',
    stage: 'gd1',
    label: 'GĐ1 gate — chỉ KICKOFF, thiếu WORKSHOP (EVENT_ORDER_VIOLATION)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=events`,
    expectVisible: [/Event order violation|GĐ1 — Event order|Sự kiện|Events/i, /KICKOFF|WORKSHOP|AWARDS/i],
  },
  {
    slug: 'seal-gd1-prelim-only',
    stage: 'gd1',
    label: 'GĐ1 gate — prelim only, thiếu CK (MISSING_FINAL_ROUND)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=review`,
    expectVisible: [/Prelim only|GĐ1 — Prelim|Đánh giá|Readiness/i, /MISSING_FINAL_ROUND|Chung kết|lỗi bắt buộc/i],
  },

  // GĐ2 (slug riêng — không dùng seal-e2e-2026)
  {
    slug: 'seal-gd2-teams-edge',
    stage: 'gd2',
    label: 'GĐ2 teams matrix — PENDING / locked / REJECTED',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: () => '/teams',
    expectVisible: [/Quản lý đội thi|Duyệt đội/i],
    async runActions(page) {
      await page.locator('.ant-select').first().click();
      await page.getByText(/SEAL GĐ2 — Teams edge/i).click();
      await expect(page.getByText(/GD2-T01/i).first()).toBeVisible({ timeout: 15_000 });
      await page.getByTitle('Đã duyệt', { exact: true }).click();
      await expect(page.getByText(/GD2-T05/i).first()).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    slug: 'seal-gd2-registration-closed',
    stage: 'gd2',
    label: 'GĐ2 — registration closed (bad)',
    role: 'student',
    email: 'student.gd2.rc.leader01@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/SEAL GĐ2 — Registration closed|Mốc này đã kết thúc|Khóa thành viên/i],
  },
  {
    slug: 'seal-gd2-lottery-not-locked',
    stage: 'gd2',
    label: 'GĐ2 gate — đăng ký còn mở, lottery bị chặn',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=lottery`,
    expectVisible: [/Bốc thăm|Lottery/i, /Khóa đội|kết thúc đăng ký|Bốc thăm chỉ|hôm sau/i],
    expectDisabledSelector: 'button:has-text("Bốc thăm Tự động")',
  },
  {
    slug: 'seal-gd2-round-active',
    stage: 'gd2',
    label: 'GĐ2 gate — prelim active, không bốc thăm lại (ROUND_ALREADY_ACTIVE)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=lottery`,
    expectVisible: [/Round active|SEAL GĐ2 — Round active|Bốc thăm|Lottery/i, /GD2-RA-T|Đã khóa|đã được kích hoạt/i],
    expectDisabledSelector: 'button:has-text("Bốc thăm Tự động")',
  },
  {
    slug: 'seal-fall-ongoing-2026',
    stage: 'gd2',
    label: 'Fall ONGOING — leader chọn track (FR-U-15-F)',
    role: 'student',
    email: 'student.fall.t01.leader@fpt.edu.vn',
    buildPath: () => '/student/team',
    expectVisible: [/Quản lý đội|Thành viên đội/i],
  },

  // GĐ3
  {
    slug: 'seal-gd3-prelim-open',
    stage: 'gd3',
    label: 'Prelim open — student chưa nộp',
    role: 'student',
    email: 'student.gd3.leader06@fpt.edu.vn',
    buildPath: () => '/student/submit',
    expectVisible: [/Cổng Nộp Bài|Biểu Mẫu Nộp Bài/i, /CỔNG ĐANG MỞ/i],
    expectNotVisible: [/ĐÃ NỘP BÀI THÀNH CÔNG/i],
  },
  {
    slug: 'seal-gd3-late-review',
    stage: 'gd3',
    label: 'Late review — LATE_PENDING row',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: lateSubmissionsPath,
    expectVisible: [/Duyệt Bài Nộp Muộn/i, /GD3-L02|Late-pending/i, /Duyệt/i, /Từ Chối/i],
  },
  {
    slug: 'seal-gd3-scoring-live',
    stage: 'gd3',
    label: 'Scoring live — queue PRESENTING',
    role: 'judge',
    email: 'judge1@fpt.edu.vn',
    buildPath: presentationQueuePath,
    expectVisible: [/Điều Phối Lịch Trình|hàng đợi/i, /ĐANG CHUẨN BỊ|ĐANG TRÌNH BÀY|Đã bảo vệ xong/i],
  },
  {
    slug: 'seal-gd3-scoring-gate',
    stage: 'gd3',
    label: 'Scoring gate — slot WAITING (bad)',
    role: 'judge',
    email: 'judge1@fpt.edu.vn',
    buildPath: presentationQueuePath,
    // Judge view ẩn danh tên đội → neo theo tiêu đề trang + đúng trạng thái slot
    // (T01 PRESENTING = "ĐANG TRÌNH BÀY", T02 WAITING = "Chờ tới lượt").
    expectVisible: [/Điều Phối Lịch Trình|hàng đợi/i, /ĐANG TRÌNH BÀY|Chờ tới lượt/i],
  },
  {
    slug: 'seal-gd3-tiebreak-hybrid',
    stage: 'gd3',
    label: 'Tiebreak hybrid — đồng điểm ranh giới',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Kết quả Sơ loại|Chuyển vòng/i, /Tiebreak|đồng điểm|GD3-T01|GD3-T02/i],
  },
  {
    slug: 'seal-gd3-edge-errors',
    stage: 'gd3',
    label: 'Edge — submission INCOMPLETE (thiếu slide)',
    role: 'student',
    email: 'student.gd3.edge.leader02@fpt.edu.vn',
    buildPath: () => '/student/submit',
    expectVisible: [/Cổng Nộp Bài|Biểu Mẫu Nộp Bài/i],
    expectNotVisible: [/ĐÃ NỘP BÀI THÀNH CÔNG/i],
  },
  {
    slug: 'seal-gd3-calibration-timer',
    stage: 'gd3',
    label: 'Calibration + timer PAUSED/QA',
    role: 'judge',
    email: 'judge1@fpt.edu.vn',
    buildPath: presentationQueuePath,
    expectVisible: [/Điều Phối Lịch Trình|hàng đợi/i, /ĐANG TRÌNH BÀY|ĐANG CHUẨN BỊ|PAUSED/i],
  },
  {
    slug: 'seal-gd3-judge-mentor-conflict',
    stage: 'gd3',
    label: 'Edge — mentor+judge cùng track (bad)',
    role: 'judge',
    email: 'judge1@fpt.edu.vn',
    buildPath: presentationQueuePath,
    // Xung đột mentor/judge là thuộc tính seed, không hiển thị trên queue (judge view ẩn danh)
    // → chỉ smoke rằng judge mở được trang điều phối.
    expectVisible: [/Điều Phối Lịch Trình|hàng đợi/i],
  },
  {
    slug: 'seal-gd3-round-config-edge',
    stage: 'gd3',
    label: 'Edge — round config weight/criteria (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=rounds`,
    expectVisible: [/Round config edge|SEAL GĐ3 — Round config/i, /Vòng thi/i],
    async runActions(page) {
      await page
        .locator('tr')
        .filter({ hasText: /Sơ loại/i })
        .locator('[data-testid="round-activate-btn"]')
        .click();
      await page.getByRole('button', { name: /Kích hoạt ngay/i }).click();
      await expect(page.getByText(/trọng số|tiêu chí|weight|criteria/i).first()).toBeVisible({
        timeout: 15_000,
      });
    },
  },
  {
    slug: 'seal-gd3-no-lottery',
    stage: 'gd3',
    label: 'GĐ3 gate — 0 đội trong round (NO_TEAMS_IN_ROUND)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: (ctx) => `/hackathons/${ctx.hackathon.id}/setup?tab=rounds`,
    expectVisible: [/No lottery|SEAL GĐ3 — No lottery|Vòng thi \(Rounds\)/i],
    async runActions(page) {
      await page
        .locator('tr')
        .filter({ hasText: /Sơ loại/i })
        .locator('[data-testid="round-activate-btn"]')
        .click();
      await page.getByRole('button', { name: /Kích hoạt ngay/i }).click();
      await expect(page.getByText(/không có đội|NO_TEAMS_IN_ROUND|Không có đội tham gia/i).first()).toBeVisible({
        timeout: 15_000,
      });
    },
  },
  {
    slug: 'seal-gd3-mentor-portal',
    stage: 'gd3',
    label: 'GĐ3 happy — mentor portal assigned teams',
    role: 'student',
    email: 'mentor@fpt.edu.vn',
    password: process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1',
    buildPath: () => '/mentor/rounds',
    expectVisible: [/Mentor portal|Mentor|đội|SEAL GĐ3 — Mentor portal/i],
    async runActions(page) {
      await expect(page.getByText(/SEAL GĐ3 — Mentor portal|đội/i).first()).toBeVisible({
        timeout: 15_000,
      });
    },
  },
  {
    slug: 'seal-gd3-mentor-track-only',
    stage: 'gd3',
    label: 'GĐ3 happy — mentor track bootstrap (FR-M-05)',
    role: 'student',
    email: 'mentor.trackonly@fpt.edu.vn',
    password: process.env.E2E_MENTOR_PASSWORD || 'Mentor@dev1',
    buildPath: () => '/mentor/rounds',
    expectVisible: [/Bạn đã được gán track chuyên môn|track chuyên môn/i],
  },
  {
    slug: 'seal-gd3-team-mentor-history',
    stage: 'gd3',
    label: 'GĐ3 happy — team mentor history (FR-13C)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: () => '/teams',
    expectVisible: [/Quản lý đội thi/i],
  },

  // GĐ4
  {
    slug: 'seal-gd4-advance-ready',
    stage: 'gd4',
    label: 'Advance ready — chưa công bố',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Chưa công bố/i, /Công bố kết quả/i],
    expectNotVisible: [/Đã chốt chuyển vòng/i],
  },
  {
    slug: 'seal-gd4-ck-unpublished',
    stage: 'gd4',
    label: 'GĐ4 gate — activate CK khi SL chưa publish (RESULT_NOT_PUBLISHED)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/CK unpublished|Cấu hình Chung kết/i, /READY|guest judge|NOT_READY/i],
    async runActions(page) {
      const activateBtn = page.getByRole('button', { name: /Kích hoạt vòng Chung kết/i });
      if (await activateBtn.isEnabled()) {
        await activateBtn.click();
        await expect(
          page.getByText(/Cần công bố|RESULT_NOT_PUBLISHED|chốt chuyển vòng Sơ loại/i).first(),
        ).toBeVisible({ timeout: 15_000 });
      } else {
        await expect(page.getByText(/NOT_READY|Blockers|Chưa phân Judge/i).first()).toBeVisible();
      }
    },
  },
  {
    slug: 'seal-gd4-published',
    stage: 'gd4',
    label: 'Published — sẵn sàng advance',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Đã công bố/i, /Chốt chuyển vòng/i],
  },
  {
    slug: 'seal-gd4-tiebreak-gate',
    stage: 'gd4',
    label: 'Tiebreak gate — advance blocked (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Tiebreak \(1\)|Tiebreak/i, /Chưa công bố/i],
    expectNotVisible: [/Đã chốt chuyển vòng/i],
  },
  {
    slug: 'seal-gd4-ck-activate-ready',
    stage: 'gd4',
    label: 'CK activate ready — guest judge assigned',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/Cấu hình Chung kết/i, /Readiness FINAL_ROUND/i, /READY|guest judge/i],
  },
  {
    slug: 'seal-gd4-edge-errors',
    stage: 'gd4',
    label: 'Edge — JUDGE_NOT_ASSIGNED blocker (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/Cấu hình Chung kết/i, /NOT_READY|Blockers|giám khảo|JUDGE/i],
  },
  {
    slug: 'seal-gd4-wildcard-resolved',
    stage: 'gd4',
    label: 'Wildcard resolved — approved/rejected',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Wild Card|Wildcard|vé vớt/i, /Đã duyệt|Đã từ chối|Từ chối/i],
  },
  {
    slug: 'seal-gd4-tiebreak-resolved',
    stage: 'gd4',
    label: 'Tiebreak resolved — advance không bị chặn',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Đã công bố/i, /Chốt chuyển vòng/i],
  },
  {
    slug: 'seal-gd4-wildcard-disabled',
    stage: 'gd4',
    label: 'Wildcard disabled — không có candidate',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: prelimResultsPath,
    expectVisible: [/Chưa công bố/i, /Wild Card/i],
    expectNotVisible: [/Đã duyệt vé vớt/i],
    async runActions(page) {
      await page.getByRole('tab', { name: /Wild Card/i }).click();
      await expect(page.getByText(/Đang tắt|Chưa thể xét Wild Card/i).first()).toBeVisible({
        timeout: 15_000,
      });
    },
  },
  {
    slug: 'seal-gd4-judge-assign-warnings',
    stage: 'gd4',
    label: 'Edge — assign judge SL lên CK (warnings)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/Judge assign warnings|Cấu hình Chung kết/i, /Warnings|guest judge|Blockers/i],
  },
  {
    slug: 'seal-gd4-ck-no-criteria',
    stage: 'gd4',
    label: 'Edge — CK thiếu criteria (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/CK no criteria|Cấu hình Chung kết/i, /NOT_READY|Blockers|criteria|tiêu chí/i],
  },

  // GĐ5
  {
    slug: 'seal-gd5-final-active',
    stage: 'gd5',
    label: 'Final active — student chưa nộp CK',
    role: 'student',
    email: 'student.gd5.leader03@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/Chung kết|Nộp bài Chung kết|Cổng nộp bài Chung kết/i],
  },
  {
    slug: 'seal-gd5-submit-open',
    stage: 'gd5',
    label: 'Submit open — form CK sạch',
    role: 'student',
    email: 'student.gd5s.leader01@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/Chung kết|Nộp bài|ĐANG MỞ/i],
    expectNotVisible: [/Bài nộp đã được ghi nhận/i],
  },
  {
    slug: 'seal-gd5-scoring-live',
    stage: 'gd5',
    label: 'CK scoring live — queue PRESENTING',
    role: 'guest',
    email: 'guestjudge@gmail.com',
    buildPath: finalPresentationQueuePath,
    expectVisible: [/Điều Phối Lịch Trình|hàng đợi/i, /ĐANG TRÌNH BÀY|ĐANG CHUẨN BỊ/i],
  },
  {
    slug: 'seal-gd5-calibration-timer',
    stage: 'gd5',
    label: 'CK calibration + timer QA',
    role: 'guest',
    email: 'guestjudge@gmail.com',
    buildPath: finalPresentationQueuePath,
    expectVisible: [/Điều Phối Lịch Trình|hàng đợi/i, /ĐANG TRÌNH BÀY|ĐANG CHUẨN BỊ/i],
  },
  {
    slug: 'seal-gd5-edge-errors',
    stage: 'gd5',
    label: 'Edge — CK inactive ROUND_NOT_ACTIVE (bad)',
    role: 'student',
    email: 'student.gd5e.leader01@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/Vòng Chung kết chưa mở/i],
  },
  {
    slug: 'seal-gd5-late-hardlock',
    stage: 'gd5',
    label: 'Late HARD_LOCK — deadline qua (bad)',
    role: 'student',
    email: 'student.gd5lh.leader01@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/HẾT HẠN|Đã quá hạn nộp bài|HARD_LOCK|REJECTED/i],
  },
  {
    slug: 'seal-gd5-judge-edge',
    stage: 'gd5',
    label: 'Edge — JUDGE_NOT_ASSIGNED CK (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalConfigPath,
    expectVisible: [/Cấu hình Chung kết/i, /NOT_READY|Blockers|giám khảo|JUDGE/i],
  },
  {
    slug: 'seal-gd5-late-pending',
    stage: 'gd5',
    label: 'CK LATE_PENDING — coord late review',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: finalLateSubmissionsPath,
    expectVisible: [/Duyệt Bài Nộp Muộn/i, /GD5-LP01|LATE_PENDING|Late-pending/i, /Duyệt/i],
  },
  {
    slug: 'seal-gd5-not-advanced',
    stage: 'gd5',
    label: 'Edge — team not in CK round (bad)',
    role: 'student',
    email: 'student.gd5na.leader02@fpt.edu.vn',
    buildPath: () => '/dashboard',
    expectVisible: [/chưa đủ điều kiện|Chưa được chọn|không thuộc vòng|TEAM_NOT_IN_ROUND|Chung kết/i],
  },

  // GĐ6
  {
    slug: 'seal-gd6-pending-confirm',
    stage: 'gd6',
    label: 'Pending confirm — award entry',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/PENDING_CONFIRM|Đang chờ công bố/i],
    async runActions(page) {
      await page.getByRole('tab', { name: /Giải thưởng/i }).click();
      await expect(page.locator('#hackathon-award-trigger')).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    slug: 'seal-gd6-prizes-empty',
    stage: 'gd6',
    label: 'Prizes empty — confirm disabled (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/Checklist đóng giải|AWARDS readiness/i],
    expectDisabledSelector: '#hackathon-confirm-trigger',
  },
  {
    slug: 'seal-gd6-confirm-ready',
    stage: 'gd6',
    label: 'Confirm ready — 3 giải, confirm enabled',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/PENDING_CONFIRM|Giải thưởng/i],
    expectEnabledSelector: '#hackathon-confirm-trigger',
  },
  {
    slug: 'seal-gd6-finished-export',
    stage: 'gd6',
    label: 'Finished — export CSV',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/FINISHED|Đã công bố kết quả/i],
    expectEnabledSelector: '#hackathon-export-csv',
  },
  {
    slug: 'seal-gd6-edge-errors',
    stage: 'gd6',
    label: 'Edge — confirm fails CK not locked (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/PENDING_CONFIRM/i],
    async runActions(page) {
      const trigger = page.locator('#hackathon-confirm-trigger');
      if (await trigger.isEnabled()) {
        await trigger.click();
        await page.locator('#hackathon-confirm-ok').click();
        await expect(page.getByText(/Vòng thi chưa khóa chấm điểm|ROUND_NOT_SCORING_LOCKED|Không thể chốt sổ/i).first()).toBeVisible({
          timeout: 15_000,
        });
      } else {
        await expect(page.getByText(/Vòng thi chưa khóa|chưa khóa chấm|AWARDS readiness/i).first()).toBeVisible();
      }
    },
  },
  {
    slug: 'seal-gd6-prize-duplicate',
    stage: 'gd6',
    label: 'Edge — PRIZE_DUPLICATE (bad)',
    role: 'coord',
    email: COORD_EMAIL,
    buildPath: hackathonResultsPath,
    expectVisible: [/PENDING_CONFIRM|Giải thưởng/i],
    async runActions(page) {
      await page.getByRole('tab', { name: /Giải thưởng/i }).click();
      await expect(page.getByRole('heading', { name: /Giải Nhất/i })).toBeVisible({ timeout: 15_000 });
    },
  },
];

export const ALL_DEV_SLUGS = ALL_DEV_SEEDS.map((s) => s.slug);

/** @param {string} slug */
export function getSeedBySlug(slug) {
  const seed = ALL_DEV_SEEDS.find((s) => s.slug === slug);
  if (!seed) {
    throw new Error(`Unknown dev seed slug: ${slug}`);
  }
  return seed;
}

export const SEEDS_BY_STAGE = {
  gd1: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd1'),
  gd2: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd2'),
  gd3: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd3'),
  gd4: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd4'),
  gd5: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd5'),
  gd6: ALL_DEV_SEEDS.filter((s) => s.stage === 'gd6'),
};
