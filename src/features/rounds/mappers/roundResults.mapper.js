// src/features/rounds/results/mappers/roundResults.mapper.js
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
  const priorityRaw = firstDefined(
    item.priorityCriterionScore,
    item.priority_criterion_score,
    null,
  );

  return {
    key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
    teamId: firstDefined(item.teamId, item.team_id, item.id),
    teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
    rank: Number(firstDefined(item.rankInGroup, item.rank_in_group, item.rank, index + 1)),
    weightedAvgScore: Number(score) || 0,
    penaltyScore: Number(firstDefined(item.penaltyScore, item.penalty_score, 0)) || 0,
    priorityCriterionScore:
      priorityRaw === undefined || priorityRaw === null || Number.isNaN(Number(priorityRaw))
        ? null
        : Number(priorityRaw),
    submittedAt: firstDefined(item.submittedAt, item.submitted_at, null),
    submissionStatus: String(
      firstDefined(item.submissionStatus, item.submission_status, ""),
    ).toUpperCase(),
    submissionId: firstDefined(item.submissionId, item.submission_id, null),
    tiebreakReasonLabel: firstDefined(
      item.tiebreakReasonLabel,
      item.tiebreak_reason_label,
      null,
    ),
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
    const reason = firstDefined(item?.reason, null);
    const resolvedTier = firstDefined(item?.resolvedTier, item?.resolved_tier, null);
    const resolvedReasonLabel = firstDefined(
      item?.resolvedReasonLabel,
      item?.resolved_reason_label,
      null,
    );
    const requiresManualReorder = Boolean(
      firstDefined(
        item?.requiresManualReorder,
        item?.requires_manual_reorder,
        reason === "DEEP_TIE" || reason === "COORDINATOR_DECISION" || rule === "COORDINATOR_DECISION",
      ),
    );
    const suggestedOrderedTeamIds = asArray(
      { ids: firstDefined(item?.suggestedOrderedTeamIds, item?.suggested_ordered_team_ids, []) },
      ["ids"],
    );

    return {
      key: String(firstDefined(item?.id, item?.evaluationId, item?.evaluation_id, item?.partitionKey, index)),
      rule,
      reason,
      resolvedTier,
      resolvedReasonLabel,
      requiresManualReorder,
      suggestedOrderedTeamIds,
      resolved,
      escalationRequired: !resolved && requiresManualReorder,
      cutoffScore: Number(firstDefined(item?.cutoffScore, item?.cutoff_score, item?.score, 0)) || 0,
      remainingSlots: Number(firstDefined(item?.remainingSlots, item?.remaining_slots, item?.slots, 0)) || 0,
      teams,
      candidateTeamIds: firstDefined(item?.candidateTeamIds, item?.candidate_team_ids, []),
      ...group,
    };
  });

export const enrichTiebreakItems = (rawTiebreaks, rankingItems = []) => {
  const items = asArray(rawTiebreaks);
  return items.map((item, index) => {
    const mappedList = mapTiebreakItems([item]);
    const mapped = mappedList[0] || {};
    const candidateIds =
      mapped.candidateTeamIds?.length > 0
        ? mapped.candidateTeamIds
        : item.candidateTeamIds || item.candidate_team_ids || [];
    const suggested = mapped.suggestedOrderedTeamIds || [];
    const orderIds = suggested.length > 0 ? suggested : candidateIds;

    const teams = orderIds.map((teamId) => {
      const foundTeam = rankingItems.find((r) => String(r.teamId) === String(teamId));
      return foundTeam
        ? {
            ...foundTeam,
            penaltyScore: Number(foundTeam.penaltyScore || foundTeam.penalty_score || 0),
            priorityCriterionScore:
              foundTeam.priorityCriterionScore ?? foundTeam.priority_criterion_score ?? null,
          }
        : {
            key: String(teamId),
            teamId,
            teamName: `Đội #${teamId}`,
            weightedAvgScore: 0,
            penaltyScore: 0,
            priorityCriterionScore: null,
            submittedAt: null,
            submissionStatus: "",
            groupLabel: item.partitionKey || "Không rõ",
          };
    });

    const groupLabel =
      teams.length > 0 && teams[0].groupLabel ? teams[0].groupLabel : item.partitionKey || "Chưa phân bảng";
    const cutoffScore = teams.length > 0 ? teams[0].weightedAvgScore : 0;
    const rule = String(
      firstDefined(item?.tiebreakRule, item?.tiebreak_rule, mapped.rule, "COORDINATOR_DECISION"),
    ).toUpperCase();
    const reason = firstDefined(item?.reason, mapped.reason, null);
    const resolvedTier = firstDefined(item?.resolvedTier, item?.resolved_tier, mapped.resolvedTier, null);
    const resolvedReasonLabel = firstDefined(
      item?.resolvedReasonLabel,
      item?.resolved_reason_label,
      mapped.resolvedReasonLabel,
      null,
    );
    const requiresManualReorder = Boolean(
      firstDefined(
        item?.requiresManualReorder,
        item?.requires_manual_reorder,
        mapped.requiresManualReorder,
        true,
      ),
    );

    return {
      key: String(item.partitionKey || index),
      rule,
      reason,
      resolvedTier,
      resolvedReasonLabel,
      requiresManualReorder,
      suggestedOrderedTeamIds: suggested,
      resolved: !requiresManualReorder || Boolean(resolvedTier && String(resolvedTier).toUpperCase() !== 'MANUAL'),
      escalationRequired: requiresManualReorder,
      cutoffScore,
      remainingSlots: Number(firstDefined(item?.remainingSlots, mapped.remainingSlots, 0)) || 0,
      teams,
      groupLabel,
      groupKey: groupLabel,
    };
  });
};
