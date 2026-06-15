const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  for (const key of ["items", "ranking", "rankings", "teams", "leaderboard", "scoreboard"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

export const mapStudentScoreboard = (response) => ({
  roundName: firstDefined(response?.roundName, response?.round_name, response?.name, "Kết quả Sơ loại"),
  publishedAt: firstDefined(response?.publishedAt, response?.published_at, null),
  items: getItems(response)
    .map((item, index) => {
      const group = firstDefined(item.assignedGroup, item.assigned_group, item.group, item.groupName, "Chưa phân bảng");
      const groupText = String(group);
      return {
        key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
        teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
        rank: Number(firstDefined(item.rankInGroup, item.rank_in_group, item.rank, index + 1)),
        groupLabel: groupText.toLowerCase().startsWith("bảng") ? groupText : `Bảng ${groupText}`,
        score:
          Number(
            firstDefined(item.weightedAvgScore, item.weighted_avg_score, item.totalScore, item.total_score, item.score, 0),
          ) || 0,
        isAdvanced: Boolean(firstDefined(item.isAdvanced, item.is_advanced, item.status === "ADVANCED", false)),
      };
    })
    .sort(
      (left, right) =>
        left.groupLabel.localeCompare(right.groupLabel, "vi") ||
        left.rank - right.rank ||
        right.score - left.score,
    ),
});
