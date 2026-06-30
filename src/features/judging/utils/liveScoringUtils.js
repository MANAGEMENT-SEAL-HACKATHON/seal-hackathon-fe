// src/features/judging/utils/liveScoringUtils.js
const getSubmissionId = (item) => item?.submissionId ?? item?.submission_id ?? item?.id;

// Chỉ hiện tên thật khi coordinator/offline — judge live luôn TEAM-SBM#.
export const formatJudgeQueueTeamLabel = (item) => {
  const subId = item?.submissionId ?? item?.submission_id ?? item?.id;
  return subId ? `TEAM-SBM#${subId}` : item?.displayCode || 'N/A';
};

/**
 * Sắp xếp danh sách bài nộp judge theo thứ tự hàng đợi Coordinator đã xáo trộn.
 */
export const sortTeamsByPresentationQueue = (teams, trackQueue) => {
  const items = trackQueue?.items || [];
  if (!items.length) {
    return [...teams].sort((a, b) => (a.submissionId ?? a.id) - (b.submissionId ?? b.id));
  }

  const orderBySubmission = new Map(
    items.map((item) => [item.submissionId, item.order ?? 999])
  );
  const statusBySubmission = new Map(items.map((item) => [item.submissionId, item.status]));

  return [...teams]
    .map((team) => {
      const submissionId = team.submissionId ?? team.id;
      const queueOrder = orderBySubmission.get(submissionId) ?? 999;
      const queueStatus = statusBySubmission.get(submissionId) ?? null;
      return {
        ...team,
        queueOrder,
        queueStatus,
        name: queueOrder < 999 ? `#${queueOrder} · Bài ${team.displayCode || `#${submissionId}`}` : team.name,
      };
    })
    .sort((a, b) => a.queueOrder - b.queueOrder);
};

export const groupMyScoresBySubmission = (rawScores = []) => {
  const bySubmission = {};

  rawScores.forEach((row) => {
    const submissionId = row.submissionId ?? row.submission_id;
    const criterionId = row.criterionId ?? row.criterion_id;
    if (!submissionId || criterionId == null) return;

    if (!bySubmission[submissionId]) {
      bySubmission[submissionId] = { scores: {}, comment: '' };
    }

    const scoreVal = Number(row.totalScore ?? row.scoreValue ?? row.score_value ?? 0);
    bySubmission[submissionId].scores[criterionId] = scoreVal;

    const comment = row.comment;
    if (comment) {
      bySubmission[submissionId].comment = comment;
    }
  });

  return bySubmission;
};

export const isSubmissionFullyScored = (submissionId, savedBySubmission, criteriaCount) => {
  if (!submissionId || !criteriaCount) return false;
  const saved = savedBySubmission[submissionId];
  if (!saved) return false;
  return Object.keys(saved.scores).length >= criteriaCount;
};

export const computeWeightedTotal = (savedEntry, criteria = []) => {
  if (!savedEntry?.scores || !criteria.length) return '0.00';

  let total = 0;
  criteria.forEach((c) => {
    const raw = savedEntry.scores[c.id] ?? 0;
    total += raw * (c.weight || 0);
  });

  return total.toFixed(2);
};

export const findTeamBySubmissionId = (teams, submissionId) =>
  teams.find((t) => (t.submissionId ?? t.id) === submissionId) ?? null;

const SCORE_DRAFT_PREFIX = 'seal-hackathon:score-draft';

export const buildScoreDraftKey = (assignmentId, submissionId) =>
  `${SCORE_DRAFT_PREFIX}:${assignmentId ?? 'na'}:${submissionId ?? 'na'}`;

export const loadScoreDraft = (assignmentId, submissionId) => {
  if (!submissionId) return null;

  try {
    const raw = localStorage.getItem(buildScoreDraftKey(assignmentId, submissionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      scores: parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : {},
      comment: typeof parsed.comment === 'string' ? parsed.comment : '',
    };
  } catch {
    return null;
  }
};

export const saveScoreDraft = (assignmentId, submissionId, draft) => {
  if (!submissionId) return;

  try {
    localStorage.setItem(
      buildScoreDraftKey(assignmentId, submissionId),
      JSON.stringify({
        scores: draft?.scores ?? {},
        comment: draft?.comment ?? '',
        updatedAt: Date.now(),
      })
    );
  } catch {
    // Ignore quota / private mode errors.
  }
};

export const clearScoreDraft = (assignmentId, submissionId) => {
  if (!submissionId) return;

  try {
    localStorage.removeItem(buildScoreDraftKey(assignmentId, submissionId));
  } catch {
    // Ignore storage errors.
  }
};

export const mergeSavedAndDraftScores = (savedEntry, draftEntry) => {
  const apiScores = savedEntry?.scores ?? {};
  const draftScores = draftEntry?.scores ?? {};
  const mergedScores = { ...apiScores, ...draftScores };
  const mergedComment =
    draftEntry?.comment !== undefined && draftEntry?.comment !== ''
      ? draftEntry.comment
      : savedEntry?.comment ?? draftEntry?.comment ?? '';

  return {
    scores: mergedScores,
    comment: mergedComment,
  };
};
