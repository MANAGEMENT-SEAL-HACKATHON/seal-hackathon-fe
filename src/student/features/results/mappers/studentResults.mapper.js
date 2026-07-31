import { formatScore } from "../../../../shared/utils/formatScore";

const firstDefined = (...values) => values.find((value) => value !== undefined && value !== null);

const getItems = (response) => {
  if (Array.isArray(response)) return response;
  for (const key of ["items", "ranking", "rankings", "teams", "leaderboard", "scoreboard", "data"]) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  return [];
};

const toScoreNumber = (...candidates) => {
  const raw = firstDefined(...candidates, 0);
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

export const mapFinalRankings = (response) => {
  const items = getItems(response);
  return items
    .map((item, index) => {
      const score = toScoreNumber(item.totalScore, item.total_score, item.score, item.finalScore, item.final_score);
      return {
        key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
        teamId: firstDefined(item.teamId, item.team_id, item.id),
        teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
        rank: Number(firstDefined(item.rank, index + 1)),
        score,
        totalScore: score,
        scoreLabel: formatScore(score),
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

      const score = toScoreNumber(
        item.weightedAvgScore,
        item.weighted_avg_score,
        item.totalScore,
        item.total_score,
        item.score,
      );

      return {
        key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
        teamId: firstDefined(item.teamId, item.team_id, item.id),
        teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
        rank: Number(firstDefined(item.rankInGroup, item.rank_in_group, item.rank, index + 1)),
        groupLabel: groupText.toLowerCase().startsWith("bảng") ? groupText : `Bảng ${groupText}`,
        score,
        scoreLabel: formatScore(score),
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
        const score = toScoreNumber(item.totalScore, item.total_score, item.score);
        const assignedGroup = firstDefined(item.assignedGroup, item.assigned_group, item.group, null);
        const trackName = firstDefined(item.trackName, item.track_name, null);
        const groupRaw = firstDefined(assignedGroup, trackName, "Tất cả");
        const groupText = String(groupRaw);
        const rankInGroup = firstDefined(item.rankInGroup, item.rank_in_group, null);
        const totalInGroup = firstDefined(item.totalInGroup, item.total_in_group, null);
        return {
          key: String(firstDefined(item.teamId, item.team_id, item.id, index)),
          teamId: firstDefined(item.teamId, item.team_id, item.id),
          teamName: firstDefined(item.teamName, item.team_name, item.name, `Đội ${index + 1}`),
          rank: Number(firstDefined(rankInGroup, item.rank, index + 1)),
          rankInGroup: rankInGroup != null ? Number(rankInGroup) : null,
          totalInGroup: totalInGroup != null ? Number(totalInGroup) : null,
          assignedGroup: assignedGroup != null ? String(assignedGroup) : null,
          trackId: firstDefined(item.trackId, item.track_id, null),
          trackName: trackName,
          groupLabel: groupText.toLowerCase().startsWith("bảng") || groupText === "Tất cả"
            ? groupText
            : `Bảng ${groupText}`,
          score,
          scoreLabel: formatScore(score),
          isAdvanced: false,
          resultLabel: "Hoàn thành",
          tiebreakRequired: Boolean(firstDefined(item.tiebreakRequired, item.tiebreak_required, false)),
        };
      })
      .sort((left, right) => left.rank - right.rank || right.score - left.score),
  };
};
