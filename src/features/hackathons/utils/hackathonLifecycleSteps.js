import dayjs from 'dayjs';
import { isRegistrationPeriodEnded } from './hackathonRegistrationRules';

/** Mirror BE RoundPhaseResolver */
export function resolveRoundPhase(round) {
  if (!round) return 'SETUP';
  if (round.is_published ?? round.isPublished) return 'PUBLISHED';
  if (round.scoring_locked ?? round.scoringLocked) return 'SCORING_LOCKED';
  if (!(round.is_active ?? round.isActive)) return 'SETUP';

  const now = dayjs();
  const deadline = round.submission_deadline ?? round.submissionDeadline;
  if (deadline) {
    return now.isBefore(dayjs(deadline)) ? 'CODING' : 'JUDGING';
  }
  const examAt = round.exam_at ?? round.examAt;
  if (examAt && now.isBefore(dayjs(examAt))) return 'CODING';
  return 'JUDGING';
}

export function getPrelimRounds(rounds = []) {
  return (rounds || []).filter((r) => !(r.is_final ?? r.isFinal));
}

export function getFinalRound(rounds = []) {
  return (rounds || []).find((r) => r.is_final ?? r.isFinal) || null;
}

/** Vacuous-truth safe: [].every is always true */
export function allPrelims(rounds, pred) {
  const prelims = getPrelimRounds(rounds);
  return prelims.length > 0 && prelims.every(pred);
}

export function isLotteryAssignmentComplete(activeTeams = []) {
  if (!activeTeams?.length) return false;
  const locked = activeTeams.filter((t) => t.is_locked ?? t.isLocked);
  if (!locked.length) return false;
  return locked.every((t) => t.track_id ?? t.trackId);
}

export function isRegistrationAndTeamsLocked(hackathon, activeTeams = []) {
  if (!isRegistrationPeriodEnded(hackathon)) return false;
  if (!activeTeams.length) return false;
  return activeTeams.every((t) => t.is_locked ?? t.isLocked);
}

export function hasAdvancedTeam(activeTeams = [], rounds = []) {
  const finalRound = getFinalRound(rounds);
  if (!finalRound) return false;
  return (activeTeams || []).some((t) => {
    const status = String(
      t.participationStatus ?? t.participation_status ?? t.lotteryStatus ?? t.lottery_status ?? '',
    ).toUpperCase();
    return status.includes('ADVANCED') || status.includes('FINAL');
  });
}

export function isPrelimShuffleComplete(rounds = [], tracks = []) {
  const prelims = getPrelimRounds(rounds);
  if (!prelims.length) return false;
  const byRound = (tracks || []).filter((t) => {
    const status = String(t.status || '').toUpperCase();
    return status !== 'CANCELLED';
  });
  if (byRound.length > 0) {
    return byRound.every((t) => t.presentationShuffled ?? t.presentation_shuffled);
  }
  return prelims.every((r) => r.is_presentation_shuffled ?? r.isPresentationShuffled);
}

function summaryCount(summary, camelKey, snakeKey) {
  if (!summary) return 0;
  const raw = summary[camelKey] ?? summary[snakeKey];
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function hasBlockerForStep(blockers, step) {
  return (blockers || []).some((b) => step.blockerMatch((b.code || '').toUpperCase()));
}

export const SETUP_SUBSTEPS = [
  {
    key: 'rounds',
    title: 'Vòng thi',
    tab: 'rounds',
    blockerMatch: (code) => code.includes('ROUND'),
    detailLines: ['Thiết lập các vòng thi đấu', 'Cấu hình thời gian nộp bài'],
  },
  {
    key: 'tracks',
    title: 'Bảng đấu',
    tab: 'tracks',
    blockerMatch: () => false,
    detailLines: ['Phân chia bảng đấu', 'Gán đề tài cho từng bảng'],
  },
  {
    key: 'criteria',
    title: 'Tiêu chí',
    tab: 'criteria',
    blockerMatch: (code) => code.includes('CRITERIA') || code.includes('WEIGHT'),
    detailLines: ['Cấu hình tiêu chí đánh giá', 'Thiết lập trọng số điểm'],
  },
  {
    key: 'people',
    title: 'Nhân sự',
    tab: 'people',
    blockerMatch: (code) =>
      code.includes('PERSONNEL') || code.includes('JUDGE') || code.includes('MENTOR'),
    detailLines: ['Gán Giám khảo & Mentor Sơ loại', 'Phân công theo bảng đấu'],
  },
  {
    key: 'events',
    title: 'Lịch trình',
    tab: 'events',
    blockerMatch: (code) => code.includes('SCHEDULE') || code.includes('EVENT'),
    detailLines: ['Lập lịch trình chi tiết kì thi', 'Cập nhật địa điểm & phòng thi'],
  },
  {
    key: 'review',
    title: 'Kiểm tra',
    tab: 'review',
    blockerMatch: () => false,
    detailLines: [
      'Kiểm tra điều kiện đội thi',
      'Kiểm tra lịch trình & phòng thi',
      'Kiểm tra thiết bị & hệ thống',
      'Xác nhận tất cả thông tin',
    ],
  },
];

export function isSetupStepComplete(step, ctx) {
  const { rounds = [], tracksCount = 0, eventsCount = 0, readinessData, blockers = [] } = ctx;
  switch (step.key) {
    case 'rounds':
      return rounds.length > 0;
    case 'tracks':
      return tracksCount > 0;
    case 'criteria':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'people': {
      if (tracksCount <= 0 || hasBlockerForStep(blockers, step)) return false;
      const summary = readinessData?.summary || {};
      const mentors = summaryCount(summary, 'mentorAssignmentsCount', 'mentor_assignments_count');
      const judges = summaryCount(summary, 'judgeAssignmentsCount', 'judge_assignments_count');
      return mentors > 0 && judges > 0;
    }
    case 'events':
      return eventsCount > 0 || !hasBlockerForStep(blockers, step);
    case 'review':
      return readinessData?.ready === true || ['ONGOING', 'PENDING_CONFIRM', 'FINISHED'].includes(ctx.hackathon?.status);
    default:
      return false;
  }
}

export function resolveSetupStepStatuses(ctx) {
  const blockers = ctx.blockers || ctx.readinessData?.blockers || [];
  const fullCtx = { ...ctx, blockers };
  const completes = SETUP_SUBSTEPS.map((step) => isSetupStepComplete(step, fullCtx));
  const errors = SETUP_SUBSTEPS.map(
    (step, index) => hasBlockerForStep(blockers, step) && !completes[index],
  );
  let processIndex = SETUP_SUBSTEPS.findIndex((_, i) => !completes[i] && !errors[i]);
  if (processIndex === -1) processIndex = SETUP_SUBSTEPS.length - 1;

  return SETUP_SUBSTEPS.map((step, index) => {
    if (errors[index]) return 'error';
    if (completes[index]) return 'finish';
    if (index === processIndex) return 'process';
    return 'wait';
  });
}

export function getSetupStepDetailLines(step, ctx) {
  const lines = [...(step.detailLines || [])];
  const blockers = ctx.blockers || ctx.readinessData?.blockers || [];
  blockers
    .filter((b) => step.blockerMatch((b.code || '').toUpperCase()))
    .forEach((b) => lines.push(b.message || b.code || 'Thiếu điều kiện'));
  if (step.key === 'people') {
    const summary = ctx.readinessData?.summary || {};
    const mentors = summaryCount(summary, 'mentorAssignmentsCount', 'mentor_assignments_count');
    const judges = summaryCount(summary, 'judgeAssignmentsCount', 'judge_assignments_count');
    if (mentors <= 0) lines.push('Chưa gán Mentor cho bảng Sơ loại');
    if (judges <= 0) lines.push('Chưa gán Giám khảo Sơ loại cho bảng');
  }
  return [...new Set(lines)];
}

const MANUAL_STORAGE_PREFIX = 'hackathon-op-done:';

export function readManualDone(hackathonId) {
  if (!hackathonId) return new Set();
  try {
    const raw = localStorage.getItem(`${MANUAL_STORAGE_PREFIX}${hackathonId}`);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function writeManualDone(hackathonId, keysSet) {
  if (!hackathonId) return;
  try {
    localStorage.setItem(
      `${MANUAL_STORAGE_PREFIX}${hackathonId}`,
      JSON.stringify([...keysSet]),
    );
  } catch {
    // no-op
  }
}

/**
 * EVENT_PHASES GĐ1–GĐ6 with sub-steps.
 * completionMode: 'auto' | 'manual'
 * action: navigate target
 */
export const EVENT_PHASES = [
  {
    key: 'gd1',
    title: 'GĐ1 · Chuẩn bị & mở ĐK',
    group: 'setup',
    isComplete: (ctx) => ctx.hackathon?.status === 'ONGOING'
      || ctx.hackathon?.status === 'PENDING_CONFIRM'
      || ctx.hackathon?.status === 'FINISHED',
    subSteps: [
      { key: 'gd1-prep', title: 'Hoàn tất checklist chuẩn bị', completionMode: 'auto', tab: 'general',
        isComplete: (ctx) => isSetupStepComplete(SETUP_SUBSTEPS.find((s) => s.key === 'review'), ctx) || ['ONGOING', 'PENDING_CONFIRM', 'FINISHED'].includes(ctx.hackathon?.status) },
      { key: 'gd1-open', title: 'Kích hoạt & mở đăng ký', completionMode: 'auto', tab: 'general',
        isComplete: (ctx) => ['ONGOING', 'PENDING_CONFIRM', 'FINISHED'].includes(ctx.hackathon?.status) },
    ],
  },
  {
    key: 'gd2',
    title: 'GĐ2 · Đóng ĐK & phân bảng',
    group: 'kickoff',
    isComplete: (ctx) =>
      allPrelims(ctx.rounds, (r) => r.is_active ?? r.isActive)
      && isLotteryAssignmentComplete(ctx.activeTeams),
    subSteps: [
      { key: 'gd2-close-reg', title: 'Đóng đăng ký & khóa đội', completionMode: 'auto', tab: 'general',
        isComplete: (ctx) => isRegistrationAndTeamsLocked(ctx.hackathon, ctx.activeTeams) },
      { key: 'gd2-lottery', title: 'Bốc thăm chia bảng', completionMode: 'auto', tab: 'lottery',
        isComplete: (ctx) => isLotteryAssignmentComplete(ctx.activeTeams) },
      { key: 'gd2-activate', title: 'Kích hoạt vòng Sơ loại', completionMode: 'auto', tab: 'rounds',
        isComplete: (ctx) => allPrelims(ctx.rounds, (r) => r.is_active ?? r.isActive) },
    ],
  },
  {
    key: 'gd3',
    title: 'GĐ3 · Vòng Sơ loại',
    group: 'prelim',
    isComplete: (ctx) => allPrelims(ctx.rounds, (r) => r.scoring_locked ?? r.scoringLocked),
    subSteps: [
      { key: 'gd3-release', title: 'Phát đề Sơ loại', completionMode: 'auto', tab: 'rounds',
        isComplete: (ctx) => allPrelims(ctx.rounds, (r) => !!(r.problem_released_at ?? r.problemReleasedAt)) },
      { key: 'gd3-coding', title: 'Làm bài (Coding)', completionMode: 'auto', tab: 'rounds',
        isComplete: (ctx) => {
          const prelims = getPrelimRounds(ctx.rounds);
          if (!prelims.length) return false;
          return prelims.every((r) => {
            const phase = resolveRoundPhase(r);
            return phase === 'JUDGING' || phase === 'SCORING_LOCKED' || phase === 'PUBLISHED';
          });
        } },
      { key: 'gd3-close-sub', title: 'Kết thúc làm bài', completionMode: 'auto', tab: 'rounds',
        isComplete: (ctx) => {
          const prelims = getPrelimRounds(ctx.rounds);
          if (!prelims.length) return false;
          return prelims.every((r) => {
            const phase = resolveRoundPhase(r);
            return phase === 'JUDGING' || phase === 'SCORING_LOCKED' || phase === 'PUBLISHED';
          });
        } },
      { key: 'gd3-shuffle', title: 'Chia thuyết trình', completionMode: 'auto', route: 'presentation',
        isComplete: (ctx) => isPrelimShuffleComplete(ctx.rounds, ctx.tracks) },
      { key: 'gd3-score', title: 'Chạy queue & chấm thuyết trình', completionMode: 'auto', route: 'presentation',
        isComplete: (ctx) => allPrelims(ctx.rounds, (r) => r.is_presentations_complete ?? r.isPresentationsComplete) },
      { key: 'gd3-lock', title: 'Chốt điểm Sơ loại', completionMode: 'auto', tab: 'rounds',
        isComplete: (ctx) => allPrelims(ctx.rounds, (r) => r.scoring_locked ?? r.scoringLocked) },
    ],
  },
  {
    key: 'gd4',
    title: 'GĐ4 · Công bố & chuyển vòng',
    group: 'advance',
    isComplete: (ctx) =>
      allPrelims(ctx.rounds, (r) => r.is_published ?? r.isPublished)
      && hasAdvancedTeam(ctx.activeTeams, ctx.rounds),
    subSteps: [
      { key: 'gd4-publish', title: 'Công bố điểm Sơ loại', completionMode: 'auto', tab: 'rounds',
        isComplete: (ctx) => allPrelims(ctx.rounds, (r) => r.is_published ?? r.isPublished) },
      { key: 'gd4-advance', title: 'Chuyển đội vào Chung kết', completionMode: 'auto', route: 'final-config',
        isComplete: (ctx) => hasAdvancedTeam(ctx.activeTeams, ctx.rounds) },
    ],
  },
  {
    key: 'gd5',
    title: 'GĐ5 · Chung kết',
    group: 'final',
    isComplete: (ctx) => {
      const fr = getFinalRound(ctx.rounds);
      return fr != null && !!(fr.scoring_locked ?? fr.scoringLocked);
    },
    subSteps: [
      { key: 'gd5-activate', title: 'Kích hoạt vòng Chung kết', completionMode: 'auto', route: 'final-config',
        isComplete: (ctx) => {
          const fr = getFinalRound(ctx.rounds);
          return fr != null && !!(fr.is_active ?? fr.isActive);
        } },
      { key: 'gd5-coding', title: 'Làm bài Chung kết', completionMode: 'auto', route: 'final-config',
        isComplete: (ctx) => {
          const fr = getFinalRound(ctx.rounds);
          if (!fr) return false;
          const phase = resolveRoundPhase(fr);
          return phase === 'JUDGING' || phase === 'SCORING_LOCKED' || phase === 'PUBLISHED';
        } },
      { key: 'gd5-shuffle', title: 'Chia thuyết trình CK', completionMode: 'auto', route: 'presentation',
        isComplete: (ctx) => {
          const fr = getFinalRound(ctx.rounds);
          return fr != null && !!(fr.is_presentation_shuffled ?? fr.isPresentationShuffled ?? fr.presentationShuffled);
        } },
      { key: 'gd5-score', title: 'Chấm thuyết trình CK', completionMode: 'auto', route: 'presentation',
        isComplete: (ctx) => {
          const fr = getFinalRound(ctx.rounds);
          return fr != null && !!(fr.is_presentations_complete ?? fr.isPresentationsComplete);
        } },
      { key: 'gd5-lock', title: 'Chốt điểm Chung kết', completionMode: 'auto', route: 'final-config',
        isComplete: (ctx) => {
          const fr = getFinalRound(ctx.rounds);
          return fr != null && !!(fr.scoring_locked ?? fr.scoringLocked);
        } },
    ],
  },
  {
    key: 'gd6',
    title: 'GĐ6 · Trao giải & kết thúc',
    group: 'awards',
    isComplete: (ctx) => ctx.hackathon?.status === 'FINISHED',
    subSteps: [
      { key: 'gd6-prizes', title: 'Trao giải', completionMode: 'manual', route: 'results',
        isComplete: (ctx) => (ctx.prizesCount ?? 0) > 0 || ctx.hackathon?.status === 'FINISHED' },
      { key: 'gd6-finish', title: 'Xác nhận kết thúc sự kiện', completionMode: 'auto', route: 'results',
        isComplete: (ctx) => ctx.hackathon?.status === 'FINISHED' },
    ],
  },
];

function isSubStepDone(sub, ctx, manualDone) {
  if (sub.completionMode === 'auto' && typeof sub.isComplete === 'function') {
    if (sub.isComplete(ctx)) return true;
  }
  if (manualDone.has(sub.key)) return true;
  if (sub.completionMode === 'manual' && typeof sub.isComplete === 'function') {
    return sub.isComplete(ctx);
  }
  return false;
}

/**
 * Resolve wait | process | finish for each EVENT_PHASE and nested sub-steps.
 */
export function resolveEventPhaseStatuses(ctx, manualDone = new Set()) {
  const phaseCompletes = EVENT_PHASES.map((phase) => {
    if (typeof phase.isComplete === 'function' && phase.isComplete(ctx)) return true;
    // Also finish if all sub-steps done
    return phase.subSteps.every((s) => isSubStepDone(s, ctx, manualDone));
  });

  let processIndex = phaseCompletes.findIndex((c) => !c);
  if (processIndex === -1) processIndex = EVENT_PHASES.length - 1;

  return EVENT_PHASES.map((phase, index) => {
    const status = phaseCompletes[index]
      ? 'finish'
      : index === processIndex
        ? 'process'
        : 'wait';

    const subCompletes = phase.subSteps.map((s) => isSubStepDone(s, ctx, manualDone));
    let subProcess = subCompletes.findIndex((c) => !c);
    if (status !== 'process') subProcess = -1;
    else if (subProcess === -1) subProcess = phase.subSteps.length - 1;

    const subStatuses = phase.subSteps.map((s, si) => {
      if (subCompletes[si]) return 'finish';
      if (status === 'process' && si === subProcess) return 'process';
      return 'wait';
    });

    return { status, subStatuses };
  });
}

export function buildNavigateTarget(hackathonId, step) {
  if (!hackathonId) return null;
  if (step.tab) {
    return `/hackathons/${hackathonId}/setup?tab=${step.tab}`;
  }
  switch (step.route) {
    case 'presentation':
      return '/presentation/queue';
    case 'final-config':
      return `/coordinator/final-config?hackathonId=${hackathonId}`;
    case 'results':
      return `/hackathons/${hackathonId}/results`;
    default:
      return `/hackathons/${hackathonId}/setup`;
  }
}
