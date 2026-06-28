// src/features/round-ranking/service/rankingPreviewMapper.js
const DEFAULT_STATUS = "ACTIVE";

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeStatus = (status) => String(status || DEFAULT_STATUS).toUpperCase();

export const isRankingItemEliminated = (item = {}) => {
  const status = normalizeStatus(
    item.participationStatus ??
      item.participation_status ??
      item.status ??
      item.teamStatus ??
      item.team_status,
  );
  return status === "ELIMINATED";
};

export const sortRankingItemsByRank = (items = []) =>
  items
    .slice()
    .sort(
      (a, b) =>
        a.rank - b.rank || (b.weightedAvgScore ?? -1) - (a.weightedAvgScore ?? -1),
    );

/** Đội còn thi đấu — thứ tự theo `rank` BE (đã re-rank sau loại đội). */
export const getActiveRankingItems = (items = []) =>
  sortRankingItemsByRank(items.filter((item) => !item.isEliminated));

const getScoreValue = (item = {}) => {
  const rawScore = item.weightedAvgScore ?? item.weighted_avg_score ?? item.totalScore;
  return rawScore === undefined || rawScore === null ? null : toNumber(rawScore, null);
};

const getScoringProgress = (item = {}) => {
  const scoredCriteria = toNumber(
    item.scoredCriteria ?? item.scored_criteria ?? item.completedCriteria ?? item.completed_criteria,
    0
  );
  const totalCriteria = toNumber(item.totalCriteria ?? item.total_criteria, 0);
  const explicitlyIncomplete = Boolean(
    item.incompleteScoring ?? item.incomplete_scoring ?? item.scoringIncomplete ?? item.scoring_incomplete
  );

  return {
    scoredCriteria,
    totalCriteria,
    isScoringIncomplete: explicitlyIncomplete || (totalCriteria > 0 && scoredCriteria < totalCriteria),
  };
};

const getGroupInfo = (item = {}) => {
  const assignedGroup = item.assignedGroup ?? item.assigned_group;

  if (assignedGroup !== undefined && assignedGroup !== null && `${assignedGroup}`.trim()) {
    const rawGroupName = `${assignedGroup}`.trim();
    const groupName = rawGroupName.replace(/^(bảng|group|nhóm)\s+/i, "").trim() || rawGroupName;
    return {
      key: groupName,
      label: `Bảng ${groupName}`,
      sortValue: `group-${groupName}`,
    };
  }

  const trackId = item.trackId ?? item.track_id;
  if (trackId !== undefined && trackId !== null && `${trackId}`.trim()) {
    return {
      key: `track-${trackId}`,
      label: `Track #${trackId}`,
      sortValue: `track-${trackId}`,
    };
  }

  return {
    key: "ungrouped",
    label: "Chưa phân bảng",
    sortValue: "zz-ungrouped",
  };
};

export const mapRankingPreviewItem = (item = {}) => {
  const group = getGroupInfo(item);
  const weightedAvgScore = getScoreValue(item);
  const scoringProgress = getScoringProgress(item);
  const participationStatus = normalizeStatus(
    item.participationStatus ?? item.participation_status ?? item.status ?? item.teamStatus ?? item.team_status,
  );

  return {
    rank: toNumber(item.rank, 0),
    teamId: item.teamId ?? item.team_id,
    teamName: item.teamName ?? item.team_name ?? "Đội chưa đặt tên",
    trackId: item.trackId ?? item.track_id ?? null,
    assignedGroup: item.assignedGroup ?? item.assigned_group ?? null,
    weightedAvgScore,
    hasScore: weightedAvgScore !== null,
    scoreLabel: weightedAvgScore === null ? "Chưa có điểm" : weightedAvgScore.toFixed(2),
    totalScore: weightedAvgScore,
    tiebreakRequired: Boolean(item.tiebreakRequired ?? item.tiebreak_required),
    ...scoringProgress,
    status: participationStatus,
    participationStatus,
    isEliminated: participationStatus === "ELIMINATED",
    groupKey: group.key,
    groupLabel: group.label,
    groupSortValue: group.sortValue,
  };
};

export const mapRankingPreviewItems = (response) => {
  let items = [];
  if (Array.isArray(response)) {
    items = response;
  } else if (response) {
    items = response.items || response.ranking || response.rankings || response.data || [];
  }
  return (Array.isArray(items) ? items : []).map(mapRankingPreviewItem);
};

export const groupRankingItems = (items = []) => {
  const groupsByKey = new Map();

  items.forEach((item) => {
    if (!groupsByKey.has(item.groupKey)) {
      groupsByKey.set(item.groupKey, {
        key: item.groupKey,
        label: item.groupLabel,
        sortValue: item.groupSortValue,
        items: [],
      });
    }
    groupsByKey.get(item.groupKey).items.push(item);
  });

  return Array.from(groupsByKey.values())
    .map((group) => ({
      ...group,
      items: sortRankingItemsByRank(group.items),
    }))
    .sort((a, b) => a.sortValue.localeCompare(b.sortValue, "vi"));
};

export const getRankingSummary = (items = [], groups = []) => {
  const eliminatedTeams = items.filter((item) => item.isEliminated).length;

  return {
    totalTeams: items.length,
    activeTeams: items.length - eliminatedTeams,
    eliminatedTeams,
    groupCount: groups.length,
    tiebreakCount: items.filter((item) => item.tiebreakRequired).length,
    incompleteTeams: items.filter((item) => item.isScoringIncomplete || !item.hasScore).length,
  };
};
