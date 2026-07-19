import { teamService } from '../../teams/services/teamService';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const TEAM_STATUSES_FOR_REGISTRATION = new Set(['PENDING', 'ACTIVE']);

/**
 * Registered people = hackathon_registrations count (no dedicated admin API).
 * Derived via orphans + ACCEPTED members on PENDING/ACTIVE teams — same partition BE uses.
 */
export async function fetchRegisteredParticipantCount(hackathonId) {
  const [orphanRes, teamRes] = await Promise.all([
    teamService.getOrphans(hackathonId),
    teamService.listByHackathon(hackathonId),
  ]);

  const orphans = unwrapList(orphanRes);
  const teams = unwrapList(teamRes).filter((team) =>
    TEAM_STATUSES_FOR_REGISTRATION.has(team?.status),
  );

  const teamMemberCount = teams.reduce(
    (sum, team) => sum + (Number(team?.acceptedMemberCount) || 0),
    0,
  );

  const count = orphans.length + teamMemberCount;
  if (!Number.isFinite(count) || count < 0) {
    throw new Error('Không thể tính số người đã đăng ký');
  }

  return count;
}

export function computeFillPercent(registeredCount, maxParticipants) {
  const max = Number(maxParticipants);
  const registered = Number(registeredCount);
  if (!Number.isFinite(max) || max <= 0) return 0;
  if (!Number.isFinite(registered) || registered < 0) return 0;
  return Math.min(100, Math.max(0, Math.round((registered / max) * 100)));
}
