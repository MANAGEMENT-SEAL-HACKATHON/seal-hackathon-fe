import dayjs from 'dayjs';

const formatDateTime = (value) =>
  value ? dayjs(value).format('YYYY-MM-DDTHH:mm:ss') : null;

export const sortRoundsByExamAt = (rounds) => {
  if (!rounds?.length) return rounds ?? [];
  return [...rounds].sort(
    (a, b) => dayjs(a.exam_at).valueOf() - dayjs(b.exam_at).valueOf()
  );
};

const API_BASE =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8080';

export const resolveProblemStatementUrl = (round) => {
  if (!round?.id) return null;
  const raw = round.problem_statement_url ?? round.problemStatementUrl;
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }
  const path = raw.startsWith('/api/') ? raw : `/api/v1/rounds/${round.id}/problem-statement`;
  return `${API_BASE}${path}`;
};

export const mapRoundToFE = (beData) => {
  if (!beData) return null;
  return {
    ...beData,
    exam_at: beData.examAt || beData.problemReleasedAt,
    is_final: beData.isFinal,
    round_type: beData.roundType,
    late_submission_policy: beData.lateSubmissionPolicy,
    submission_open: beData.submissionOpen,
    submission_deadline: beData.submissionDeadline,
    coding_duration_hours: beData.codingDurationHours,
    problem_statement_url: beData.problemStatementUrl,
    problem_statement_filename: beData.problemStatementFilename,
    problem_released_at: beData.problemReleasedAt,
    final_problem_migration_cleared_at:
      beData.finalProblemMigrationClearedAt ?? beData.final_problem_migration_cleared_at ?? null,
    final_problem_migration_banner_dismissed_at:
      beData.finalProblemMigrationBannerDismissedAt
      ?? beData.final_problem_migration_banner_dismissed_at
      ?? null,
    top_n_advance: beData.topNAdvance,
    wildcard_enabled: beData.wildcardEnabled,
    min_teams_final: beData.minTeamsFinal,
    tiebreak_rule: beData.tiebreakRule,
    is_active: beData.isActive,
    scoring_locked: beData.scoringLocked ?? beData.scoring_locked,
    is_published: beData.isPublished ?? beData.is_published,
    submission_closed_early_at:
      beData.submissionClosedEarlyAt ?? beData.submission_closed_early_at ?? null,
    is_presentation_shuffled:
      beData.isPresentationShuffled ?? beData.is_presentation_shuffled ?? false,
    is_presentations_complete:
      beData.isPresentationsComplete ?? beData.is_presentations_complete ?? false,
    default_presentation_minutes: beData.defaultPresentationMinutes ?? null,
    default_qa_minutes: beData.defaultQaMinutes ?? null,
  };
};

export const mapRoundCkDurationToBE = (feData) => {
  if (!feData) return {};
  const payload = {};
  if (feData.default_presentation_minutes != null && feData.default_presentation_minutes !== '') {
    payload.defaultPresentationMinutes = parseInt(feData.default_presentation_minutes, 10);
  }
  if (feData.default_qa_minutes != null && feData.default_qa_minutes !== '') {
    payload.defaultQaMinutes = parseInt(feData.default_qa_minutes, 10);
  }
  return payload;
};

export const hasRoundCkDurationInput = (feData) =>
  Object.keys(mapRoundCkDurationToBE(feData)).length > 0;

export const mapRoundToBE = (feData) => {
  if (!feData) return null;
  const isFinal = !!feData.is_final;

  const payload = {
    name: feData.name,
    examAt: formatDateTime(feData.exam_at),
    isFinal,
    roundType: feData.round_type || (isFinal ? 'FINAL' : 'PRELIMINARY'),
    lateSubmissionPolicy: isFinal
      ? 'HARD_LOCK'
      : (feData.late_submission_policy || 'ALLOW_LATE_PENDING'),
    submissionOpen: formatDateTime(feData.submission_open),
    submissionDeadline: formatDateTime(feData.submission_deadline),
    codingDurationHours: feData.coding_duration_hours
      ? parseFloat(feData.coding_duration_hours)
      : null,
    wildcardEnabled: !!feData.wildcard_enabled,
    tiebreakRule: feData.tiebreak_rule || 'COORDINATOR_DECISION',
  };

  if (!isFinal) {
    payload.topNAdvance = feData.top_n_advance
      ? parseInt(feData.top_n_advance, 10)
      : null;
    payload.minTeamsFinal = feData.min_teams_final
      ? parseInt(feData.min_teams_final, 10)
      : null;
  }

  if (isFinal) {
    Object.assign(payload, mapRoundCkDurationToBE(feData));
  }

  return payload;
};
