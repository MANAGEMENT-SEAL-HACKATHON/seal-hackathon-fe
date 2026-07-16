const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  for (const key of ["items", "ranking", "rankings", "teams", "leaderboard", "scoreboard", "data"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

export const mapFinalRankings = (response) => {
  const items = getItems(response);
  return items
    .map((item, index) => {
      const score = Number(firstDefined(item.totalScore, item.total_score, item.score, item.finalScore, item.final_score, 0)) || 0;
      return {
        key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
        teamId: firstDefined(item.teamId, item.team_id, item.id),
        teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
        rank: Number(firstDefined(item.rank, index + 1)),
        score: score,
        totalScore: score,
        trackName: firstDefined(item.trackName, item.track_name, item.track, "—"),
      };
    })
    .sort((left, right) => left.rank - right.rank || right.score - left.score);
};

export const mapStudentScoreboard = (response) => ({
  roundName: firstDefined(response?.roundName, response?.round_name, response?.name, "Kết quả Sơ loại"),
  publishedAt: firstDefined(response?.publishedAt, response?.published_at, null),
  items: getItems(response)
    .map((item, index) => {
      const group = firstDefined(item.assignedGroup, item.assigned_group, item.group, item.groupName, "Chưa phân bảng");
      const groupText = String(group);
      const participationStatus = String(firstDefined(item.participationStatus, item.participation_status, item.status, "")).toUpperCase();
      const isAdvanced = participationStatus === "ADVANCED";
      
      let resultLabel = "Hoàn thành";
      if (participationStatus === "ADVANCED") {
        resultLabel = "Đi tiếp";
      } else if (participationStatus === "ELIMINATED" || participationStatus === "OUT") {
        resultLabel = "Dừng bước";
      }

      const score = Number(firstDefined(item.weightedAvgScore, item.weighted_avg_score, item.totalScore, item.total_score, item.score, 0)) || 0;

      return {
        key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
        teamId: firstDefined(item.teamId, item.team_id, item.id),
        teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
        rank: Number(firstDefined(item.rankInGroup, item.rank_in_group, item.rank, index + 1)),
        groupLabel: groupText.toLowerCase().startsWith("bảng") ? groupText : `Bảng ${groupText}`,
        score: score,
        participationStatus: participationStatus,
        isAdvanced: isAdvanced,
        resultLabel: resultLabel,
        tiebreakRequired: Boolean(firstDefined(item.tiebreakRequired, item.tiebreak_required, false)),
      };
    })
    .sort(
      (left, right) =>
        left.groupLabel.localeCompare(right.groupLabel, "vi") ||
        left.rank - right.rank ||
        right.score - left.score,
    ),
});

export const mapStudentLeaderboard = (response) => {
  const items = getItems(response);
  return {
    roundName: "Kết quả vòng thi",
    publishedAt: null,
    items: items
      .map((item, index) => {
        const score = Number(firstDefined(item.totalScore, item.total_score, item.score, 0)) || 0;
        return {
          key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
          teamId: firstDefined(item.teamId, item.team_id, item.id),
          teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
          rank: Number(firstDefined(item.rank, index + 1)),
          groupLabel: "Tất cả",
          score: score,
          isAdvanced: false,
          resultLabel: "Hoàn thành",
          tiebreakRequired: Boolean(firstDefined(item.tiebreakRequired, item.tiebreak_required, false)),
        };
      })
      .sort((left, right) => left.rank - right.rank || right.score - left.score),
  };
};
