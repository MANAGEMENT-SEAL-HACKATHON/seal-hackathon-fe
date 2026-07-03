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
    problem_statement_url: beData.problemStatementUrl,
    problem_statement_filename: beData.problemStatementFilename,
    problem_released_at: beData.problemReleasedAt ?? null,
    presentation_minutes: beData.presentationMinutes ?? null,
    qa_minutes: beData.qaMinutes ?? null,
  };
};

export const mapTrackDurationToBE = (feData) => {
  if (!feData) return {};
  const payload = {};
  if (feData.presentation_minutes != null && feData.presentation_minutes !== '') {
    payload.presentationMinutes = parseInt(feData.presentation_minutes, 10);
  }
  if (feData.qa_minutes != null && feData.qa_minutes !== '') {
    payload.qaMinutes = parseInt(feData.qa_minutes, 10);
  }
  return payload;
};

export const hasTrackDurationInput = (feData) =>
  Object.keys(mapTrackDurationToBE(feData)).length > 0;

export const trackHasDurationOverride = (track) =>
  track?.presentation_minutes != null ||
  track?.presentationMinutes != null ||
  track?.qa_minutes != null ||
  track?.qaMinutes != null;

export const isTrackDurationCleared = (feData) =>
  (feData.presentation_minutes == null || feData.presentation_minutes === '') &&
  (feData.qa_minutes == null || feData.qa_minutes === '');

export const formatTrackDurationLabel = (track) => {
  const presentation = track?.presentation_minutes ?? track?.presentationMinutes;
  const qa = track?.qa_minutes ?? track?.qaMinutes;
  if (presentation != null || qa != null) {
    return `${presentation ?? 10}p / ${qa ?? 5}p Q&A`;
  }
  return '10/5 (mặc định)';
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
    ...mapTrackDurationToBE(feData),
  };
};
