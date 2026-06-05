const DEFAULT_STATUS = "ACTIVE";

const toNumber = (value, fallback = 0) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const normalizeStatus = (status) => String(status || DEFAULT_STATUS).toUpperCase();

const getScoreValue = (item = {}) =>
  toNumber(item.weightedAvgScore ?? item.weighted_avg_score ?? item.totalScore, 0);

const getGroupInfo = (item = {}) => {
  const assignedGroup = item.assignedGroup ?? item.assigned_group;

  if (assignedGroup !== undefined && assignedGroup !== null && `${assignedGroup}`.trim()) {
    const groupName = `${assignedGroup}`.trim();
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
  const status = normalizeStatus(item.status ?? item.teamStatus ?? item.team_status);

  return {
    rank: toNumber(item.rank, 0),
    teamId: item.teamId ?? item.team_id,
    teamName: item.teamName ?? item.team_name ?? "Đội chưa đặt tên",
    trackId: item.trackId ?? item.track_id ?? null,
    assignedGroup: item.assignedGroup ?? item.assigned_group ?? null,
    weightedAvgScore,
    scoreLabel: weightedAvgScore.toFixed(2),
    totalScore: weightedAvgScore,
    tiebreakRequired: Boolean(item.tiebreakRequired ?? item.tiebreak_required),
    status,
    isEliminated: status === "ELIMINATED",
    groupKey: group.key,
    groupLabel: group.label,
    groupSortValue: group.sortValue,
  };
};

export const mapRankingPreviewItems = (response) => {
  const items = Array.isArray(response) ? response : response?.data;
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
      items: group.items
        .slice()
        .sort((a, b) => a.rank - b.rank || b.weightedAvgScore - a.weightedAvgScore),
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
  };
};
