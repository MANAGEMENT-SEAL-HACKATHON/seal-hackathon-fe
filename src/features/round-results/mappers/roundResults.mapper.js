const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const asArray = (value, keys = []) => {
  if (Array.isArray(value)) return value;
  for (const key of keys) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
};

const normalizeGroup = (item) => {
  const value = firstDefined(
    item?.assignedGroup,
    item?.assigned_group,
    item?.group,
    item?.groupName,
    item?.group_name,
    item?.trackId,
    item?.track_id,
  );
  const raw = value === undefined ? "Chưa phân bảng" : String(value);
  return {
    groupKey: raw,
    groupLabel: raw.toLowerCase().startsWith("bảng") ? raw : `Bảng ${raw}`,
  };
};

export const mapOfficialRankingItem = (item = {}, index = 0) => {
  const group = normalizeGroup(item);
  const score = firstDefined(
    item.weightedAvgScore,
    item.weighted_avg_score,
    item.totalScore,
    item.total_score,
    item.score,
    0,
  );
  const status = String(
    firstDefined(item.teamStatus, item.team_status, item.status, "ACTIVE"),
  ).toUpperCase();
  const participationStatus = String(
    firstDefined(item.participationStatus, item.participation_status, ""),
  ).toUpperCase();

  return {
    key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
    teamId: firstDefined(item.teamId, item.team_id, item.id),
    teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
    rank: Number(firstDefined(item.rankInGroup, item.rank_in_group, item.rank, index + 1)),
    weightedAvgScore: Number(score) || 0,
    status,
    participationStatus,
    qualificationStatus: String(
      firstDefined(
        item.qualificationStatus,
        item.qualification_status,
        item.resultStatus,
        item.result_status,
        "",
      ),
    ).toUpperCase(),
    isAdvanced: Boolean(
      firstDefined(item.isAdvanced, item.is_advanced, participationStatus === "ADVANCED"),
    ),
    ...group,
  };
};

export const mapOfficialRanking = (response) => {
  const items = asArray(response, ["rankings", "items", "teams", "leaderboard"])
    .map(mapOfficialRankingItem)
    .filter((item) => item.status === "ACTIVE")
    .sort(
      (left, right) =>
        left.groupLabel.localeCompare(right.groupLabel, "vi") ||
        right.weightedAvgScore - left.weightedAvgScore ||
        left.rank - right.rank,
    );

  return {
    items,
    topNAdvance: Number(
      firstDefined(response?.topNAdvance, response?.top_n_advance, response?.topN, response?.top_n, 0),
    ),
    isPublished: Boolean(firstDefined(response?.isPublished, response?.is_published, false)),
    roundName: firstDefined(response?.roundName, response?.round_name, response?.name, "Vòng Sơ loại"),
  };
};

const mapTiebreakTeam = (team, index) => ({
  ...mapOfficialRankingItem(team, index),
  penaltyScore: Number(firstDefined(team?.penaltyScore, team?.penalty_score, 0)) || 0,
  adjustedScore: Number(firstDefined(team?.adjustedScore, team?.adjusted_score, team?.score, 0)) || 0,
});

export const mapTiebreakItems = (response) =>
  asArray(response, ["items", "tiebreaks", "evaluations"]).map((item, index) => {
    const rule = String(
      firstDefined(item?.tiebreakRule, item?.tiebreak_rule, item?.rule, "COORDINATOR_DECISION"),
    ).toUpperCase();
    const teams = asArray(item, ["teams", "tiedTeams", "tied_teams", "candidates"]).map(mapTiebreakTeam);
    const group = normalizeGroup(item);
    const resolved = Boolean(firstDefined(item?.resolved, item?.isResolved, item?.is_resolved, false));

    return {
      key: String(firstDefined(item?.id, item?.evaluationId, item?.evaluation_id, index)),
      rule,
      resolved,
      escalationRequired:
        !resolved &&
        Boolean(
          firstDefined(
            item?.escalationRequired,
            item?.escalation_required,
            rule === "COORDINATOR_DECISION",
          ),
        ),
      cutoffScore: Number(firstDefined(item?.cutoffScore, item?.cutoff_score, item?.score, 0)) || 0,
      remainingSlots: Number(firstDefined(item?.remainingSlots, item?.remaining_slots, item?.slots, 0)) || 0,
      teams,
      ...group,
    };
  });

export const mapWildcardConfig = (response) => ({
  hackathonEnabled: Boolean(
    firstDefined(
      response?.hackathonWildcardEnabled,
      response?.hackathon_wildcard_enabled,
      response?.globalWildcardEnabled,
      response?.global_wildcard_enabled,
      response?.wildcardEnabled,
      false,
    ),
  ),
  roundEnabled: Boolean(
    firstDefined(
      response?.roundWildcardEnabled,
      response?.round_wildcard_enabled,
      response?.wildcardEnabled,
      response?.wildcard_enabled,
      false,
    ),
  ),
  availableSlots: Number(
    firstDefined(response?.availableSlots, response?.available_slots, response?.slots, 0),
  ) || 0,
});

export const mapWildcardCandidates = (response) => ({
  config: mapWildcardConfig(response),
  items: asArray(response, ["items", "candidates", "wildcardCandidates", "wildcard_candidates"]).map(
    (item, index) => ({
      ...mapOfficialRankingItem(item, index),
      reviewId: firstDefined(item?.reviewId, item?.review_id, item?.wildcardReviewId, item?.id),
      candidateRank: Number(
        firstDefined(item?.candidateRank, item?.candidate_rank, item?.globalRank, item?.global_rank, index + 1),
      ),
      coordinatorApproved: firstDefined(
        item?.coordinatorApproved,
        item?.coordinator_approved,
        item?.approved,
        null,
      ),
      coordinatorNote: firstDefined(item?.coordinatorNote, item?.coordinator_note, item?.note, ""),
    }),
  ),
});
