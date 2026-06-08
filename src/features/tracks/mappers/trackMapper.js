export const mapTrackToFE = (beData) => {
  if (!beData) return null;
  return {
    ...beData,
    sequence_order: beData.sequenceOrder,
    max_teams: beData.maxTeams,
    max_teams_per_group: beData.maxTeamsPerGroup,
    min_team_size: beData.minTeamSize,
    max_team_size: beData.maxTeamSize,
    round_id: beData.roundId,
  };
};

export const mapTrackToBE = (feData) => {
  if (!feData) return null;
  return {
    name: feData.name,
    description: feData.description,
    topic: feData.topic,
    maxTeams: feData.max_teams ? parseInt(feData.max_teams) : null,
    maxTeamsPerGroup: feData.max_teams_per_group ? parseInt(feData.max_teams_per_group) : null,
    minTeamSize: feData.min_team_size ? parseInt(feData.min_team_size, 10) : 3,
    maxTeamSize: feData.max_team_size ? parseInt(feData.max_team_size, 10) : 5,
    status: feData.status,
  };
};
