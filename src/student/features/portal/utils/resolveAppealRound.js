import { roundService } from '../../../../features/rounds/services/roundService';
import { teamService } from '../../../../features/teams/services/teamService';
import { getRoundId, isFinalRound, unwrapRoundList } from '../../../../shared/utils/roundUtils';

/**
 * Resolve the final-round id for student appeals (FR-U-30).
 */
export const resolveFinalRoundId = async (hackathonId, teamId) => {
  if (hackathonId) {
    try {
      const rounds = unwrapRoundList(await roundService.listByHackathon(hackathonId));
      const finalRound = rounds.find(isFinalRound);
      const finalId = getRoundId(finalRound);
      if (finalId) return finalId;
    } catch {
      // fallback to journey
    }
  }

  if (teamId) {
    try {
      const journey = await teamService.getJourney(teamId);
      const steps = journey?.steps || [];
      const finalStep = [...steps].reverse().find((step) => isFinalRound(step));
      if (finalStep) return getRoundId(finalStep);
      if (steps.length) return getRoundId(steps[steps.length - 1]);
    } catch {
      // no-op
    }
  }

  return null;
};

export const resolveAppealRoundOptions = async (hackathonId) => {
  if (!hackathonId) return [];
  try {
    const rounds = unwrapRoundList(await roundService.listByHackathon(hackathonId));
    return rounds
      .filter((round) => isFinalRound(round) || round?.isActive || round?.is_active)
      .map((round) => ({
        value: getRoundId(round),
        label: round?.name ?? round?.roundName ?? `Vòng #${getRoundId(round)}`,
      }))
      .filter((opt) => opt.value);
  } catch {
    return [];
  }
};
