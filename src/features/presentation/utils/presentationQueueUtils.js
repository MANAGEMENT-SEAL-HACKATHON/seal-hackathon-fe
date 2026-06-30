// src/features/presentation/utils/presentationQueueUtils.js
import { getSubmissionStatusMeta } from './presentationSubmissionUtils';

export const normalizeEligibleTeams = (trackData) => {
  const raw = trackData?.eligibleTeams || trackData?.eligible_teams || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    teamId: item.teamId ?? item.team_id,
    teamName: item.teamName ?? item.team_name ?? `Đội #${item.teamId ?? item.team_id}`,
    gradable: Boolean(item.gradable),
    submissionStatus: item.submissionStatus ?? item.submission_status ?? null,
  }));
};

export const getFinalParticipationCounts = (trackData, fallbackSubmissions = []) => {
  const eligibleTeams = normalizeEligibleTeams(trackData);
  const participating =
    trackData?.participatingTeamCount ??
    trackData?.participating_team_count ??
    eligibleTeams.length;
  const gradable =
    trackData?.gradableTeamCount ??
    trackData?.gradable_team_count ??
    eligibleTeams.filter((t) => t.gradable).length;

  if (participating > 0) {
    return { eligibleTeams, participating, gradable };
  }

  const gradableFromSubs = fallbackSubmissions.filter((s) =>
    ['SUBMITTED', 'LATE_APPROVED', 'ACCEPTED'].includes(String(s.status || '').toUpperCase()),
  ).length;
  return {
    eligibleTeams: fallbackSubmissions.map((s) => ({
      teamId: s.team_id,
      teamName: s.team_name,
      gradable: ['SUBMITTED', 'LATE_APPROVED', 'ACCEPTED'].includes(String(s.status || '').toUpperCase()),
      submissionStatus: s.status,
    })),
    participating: fallbackSubmissions.length,
    gradable: gradableFromSubs,
  };
};

export const getEligibleTeamStatusLabel = (team) => {
  if (team.gradable) return { label: 'Sẵn sàng', color: 'success' };
  if (!team.submissionStatus) return { label: 'Chưa nộp bài', color: 'default' };
  return getSubmissionStatusMeta(team.submissionStatus);
};
