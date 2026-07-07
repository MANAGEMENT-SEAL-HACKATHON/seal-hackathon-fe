import { teamService } from '../../../../features/teams/services/teamService';
import { studentTeamService } from '../../team/services/studentTeam.service';
import { getRoundId, isFinalRound } from '../../../../shared/utils/roundUtils';

/**
 * Helper to find teamId for a hackathon if not directly provided
 */
const resolveTeamId = async (hackathonId, teamId) => {
  if (teamId) return teamId;
  if (!hackathonId) return null;
  try {
    const teams = await studentTeamService.getMyTeams();
    const team = teams.find((t) => Number(t.hackathonId) === Number(hackathonId));
    return team?.id || null;
  } catch {
    return null;
  }
};

/**
 * Resolve the final-round id for student appeals (FR-U-30) using student-safe Journey API.
 */
export const resolveFinalRoundId = async (hackathonId, teamId) => {
  const targetTeamId = await resolveTeamId(hackathonId, teamId);
  if (!targetTeamId) return null;

  try {
    const journey = await teamService.getJourney(targetTeamId);
    const steps = journey?.steps || [];
    const finalStep = [...steps].reverse().find((step) => isFinalRound(step));
    if (finalStep) return getRoundId(finalStep);
    if (steps.length) return getRoundId(steps[steps.length - 1]);
  } catch {
    // no-op
  }

  return null;
};

/**
 * Resolve appeal round options using student-safe Journey API.
 */
export const resolveAppealRoundOptions = async (hackathonId, teamId) => {
  const targetTeamId = await resolveTeamId(hackathonId, teamId);
  if (!targetTeamId) return [];

  try {
    const journey = await teamService.getJourney(targetTeamId);
    const steps = journey?.steps || [];
    return steps
      .filter((step) => isFinalRound(step) || step?.isActive || step?.is_active || step?.status === 'ACTIVE')
      .map((step) => ({
        value: getRoundId(step),
        label: step?.roundName ?? step?.round_name ?? step?.name ?? `Vòng #${getRoundId(step)}`,
      }))
      .filter((opt) => opt.value);
  } catch {
    return [];
  }
};
