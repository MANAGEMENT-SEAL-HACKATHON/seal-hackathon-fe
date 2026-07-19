/** Mirrors BE HackathonTeamSizeResolver defaults and track intersection logic. */
export const DEFAULT_MIN_TEAM_SIZE = 3;
export const DEFAULT_MAX_TEAM_SIZE = 5;

const readMin = (track) =>
  Number(track?.minTeamSize ?? track?.min_team_size) || DEFAULT_MIN_TEAM_SIZE;

const readMax = (track) =>
  Number(track?.maxTeamSize ?? track?.max_team_size) || DEFAULT_MAX_TEAM_SIZE;

/**
 * Effective team size limits for a hackathon (intersection of non-cancelled tracks).
 * @returns {{ minTeamSize: number, maxTeamSize: number, invalid?: boolean }}
 */
export function resolveHackathonTeamSizeLimits(tracks) {
  const active = (tracks || []).filter((track) => track?.status !== 'CANCELLED');
  if (active.length === 0) {
    return {
      minTeamSize: DEFAULT_MIN_TEAM_SIZE,
      maxTeamSize: DEFAULT_MAX_TEAM_SIZE,
    };
  }

  const minTeamSize = Math.max(...active.map(readMin));
  const maxTeamSize = Math.min(...active.map(readMax));

  if (maxTeamSize < minTeamSize) {
    return { minTeamSize, maxTeamSize: minTeamSize, invalid: true };
  }

  return { minTeamSize, maxTeamSize };
}
