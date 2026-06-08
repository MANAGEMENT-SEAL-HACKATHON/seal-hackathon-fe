import dayjs from 'dayjs';

const formatDateTime = (value) =>
  value ? dayjs(value).format('YYYY-MM-DDTHH:mm:ss') : null;

export const sortRoundsByExamAt = (rounds) => {
  if (!rounds?.length) return rounds ?? [];
  return [...rounds].sort(
    (a, b) => dayjs(a.exam_at).valueOf() - dayjs(b.exam_at).valueOf()
  );
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
    problem_released_at: beData.problemReleasedAt,
    top_n_advance: beData.topNAdvance,
    wildcard_enabled: beData.wildcardEnabled,
    min_teams_final: beData.minTeamsFinal,
    tiebreak_rule: beData.tiebreakRule,
    is_active: beData.isActive,
  };
};

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
    problemStatementUrl: feData.problem_statement_url || null,
    wildcardEnabled: !!feData.wildcard_enabled,
    tiebreakRule: feData.tiebreak_rule || 'PENALTY_SCORE',
  };

  if (!isFinal) {
    payload.topNAdvance = feData.top_n_advance
      ? parseInt(feData.top_n_advance, 10)
      : null;
    payload.minTeamsFinal = feData.min_teams_final
      ? parseInt(feData.min_teams_final, 10)
      : null;
  }

  return payload;
};
