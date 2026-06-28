// src/features/round-results/mappers/roundResults.mapper.js
const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const asArray = (value, keys = []) => {
  const source = value?.data !== undefined ? value.data : value;

  if (Array.isArray(source)) return source;
  
  for (const key of keys) {
    if (Array.isArray(source?.[key])) return source[key];
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
    isEliminated: participationStatus === "ELIMINATED" || status === "ELIMINATED",
    ...group,
  };
};

export const mapOfficialRanking = (response) => {
  const source = response?.data !== undefined ? response.data : response;
  const items = asArray(response, ["rankings", "items", "teams", "leaderboard"])
    .map(mapOfficialRankingItem)
    .sort(
      (left, right) =>
        left.groupLabel.localeCompare(right.groupLabel, "vi") ||
        left.rank - right.rank ||
        right.weightedAvgScore - left.weightedAvgScore,
    );

  return {
    items,
    topNAdvance: Number(
      firstDefined(source?.topNAdvance, source?.top_n_advance, source?.topN, source?.top_n, 0),
    ),
    isPublished: Boolean(firstDefined(source?.isPublished, source?.is_published, false)),
    roundName: firstDefined(source?.roundName, source?.round_name, source?.name, "Vòng Sơ loại"),
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
      response?.hackathonWildcardEnabled,
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
  autoAdvancedCount: Number(
    firstDefined(response?.autoAdvancedCount, response?.auto_advanced_count, 0),
  ) || 0,
  approvedCount: Number(
    firstDefined(response?.approvedCount, response?.approved_count, 0),
  ) || 0,
  decisionsFinalized: Boolean(
    firstDefined(response?.decisionsFinalized, response?.decisions_finalized, false),
  ),
});

export const mapWildcardCandidates = (response) => {
  const payload = response && !Array.isArray(response) ? response : null;
  const itemsSource = payload?.candidates ?? payload?.items ?? response;

  return {
    config: mapWildcardConfig(payload ?? {}),
    decisionsFinalized: Boolean(
      firstDefined(payload?.decisionsFinalized, payload?.decisions_finalized, false),
    ),
    items: asArray(itemsSource, ["candidates", "items", "wildcardCandidates", "wildcard_candidates"]).map(
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
        reason: firstDefined(item?.reason, ""),
      }),
    ),
  };
};

export const enrichWildcardFromRound = (wildcard, round, ranking) => {
  if (!round) return wildcard;

  const topN = Number(round.top_n_advance ?? round.topNAdvance ?? 0);
  const minFinal = Number(round.min_teams_final ?? round.minTeamsFinal ?? 0);
  let autoAdvanced = wildcard?.config?.autoAdvancedCount ?? 0;

  if (!autoAdvanced && topN > 0 && ranking?.items?.length) {
    const byGroup = {};
    ranking.items.forEach((item) => {
      const key = item.groupLabel || item.groupKey || "default";
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push(item);
    });
    autoAdvanced = Object.values(byGroup).reduce((sum, groupItems) => {
      return sum + groupItems.filter((team) => team.rank <= topN && !team.isEliminated).length;
    }, 0);
  }

  const availableSlots =
    wildcard?.config?.availableSlots ||
    (minFinal > 0 ? Math.max(0, minFinal - autoAdvanced) : 0);

  return {
    ...wildcard,
    config: {
      hackathonEnabled: wildcard?.config?.hackathonEnabled ?? Boolean(round.wildcard_enabled ?? round.wildcardEnabled),
      roundEnabled: wildcard?.config?.roundEnabled ?? Boolean(round.wildcard_enabled ?? round.wildcardEnabled),
      availableSlots,
      autoAdvancedCount: autoAdvanced,
      approvedCount: wildcard?.config?.approvedCount ?? 0,
      decisionsFinalized: Boolean(
        wildcard?.decisionsFinalized ?? wildcard?.config?.decisionsFinalized,
      ),
    },
  };
};

// Bổ sung thông tin chi tiết cho Tiebreak bằng cách đối chiếu với Bảng xếp hạng
export const enrichTiebreakItems = (rawTiebreaks, rankingItems = []) => {
  const items = asArray(rawTiebreaks);
  
  return items.map((item, index) => {
    const candidateIds = item.candidateTeamIds || [];
    
    // Tìm thông tin chi tiết của đội từ rankingItems dựa vào ID
    const teams = candidateIds.map(teamId => {
      const foundTeam = rankingItems.find(r => String(r.teamId) === String(teamId));
      return foundTeam ? {
         ...foundTeam,
         penaltyScore: Number(foundTeam.penaltyScore || foundTeam.penalty_score || 0)
      } : {
         key: String(teamId),
         teamId: teamId,
         teamName: `Đội #${teamId}`,
         weightedAvgScore: 0,
         penaltyScore: 0,
         groupLabel: "Không rõ"
      };
    });

    // Lấy tên Bảng và Điểm ranh giới từ đội đầu tiên
    const groupLabel = teams.length > 0 && teams[0].groupLabel ? teams[0].groupLabel : item.partitionKey;
    const cutoffScore = teams.length > 0 ? teams[0].weightedAvgScore : 0;

    // Giả lập trạng thái: Nếu có đội bị phạt điểm (Penalty > 0), nghĩa là đã được BTC phân xử
    const hasPenalty = teams.some(t => t.penaltyScore > 0);

    return {
      key: String(item.partitionKey || index),
      rule: "PENALTY_SCORE",
      resolved: hasPenalty, 
      escalationRequired: !hasPenalty, // Chưa có penalty thì cảnh báo đỏ đòi phân xử
      cutoffScore: cutoffScore,
      remainingSlots: item.cutoffRank || 1,
      teams: teams,
      groupLabel: groupLabel
    };
  });
};