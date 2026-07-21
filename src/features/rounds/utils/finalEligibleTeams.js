/**
 * Helpers cho roster «Tình trạng nộp bài».
 * CK: chỉ đội có TeamRoundParticipation (eligibleTeams từ queue).
 * Sơ loại: ACTIVE hackathon teams.
 */

export function extractFinalEligibleTeamsFromQueue(queuePayload) {
  const data = queuePayload?.data ?? queuePayload ?? {};
  const tracks = data.tracks ?? data.Tracks ?? [];
  const teams = [];
  const seen = new Set();
  for (const track of tracks) {
    const eligible = track?.eligibleTeams ?? track?.eligible_teams ?? [];
    for (const item of eligible) {
      const id = Number(item.teamId ?? item.team_id ?? item.id);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      teams.push({
        id,
        teamName: item.teamName ?? item.team_name ?? item.name ?? `Đội #${id}`,
        trackId: track?.trackId ?? track?.track_id ?? null,
        trackName: track?.trackName ?? track?.track_name ?? null,
      });
    }
  }
  return teams;
}
