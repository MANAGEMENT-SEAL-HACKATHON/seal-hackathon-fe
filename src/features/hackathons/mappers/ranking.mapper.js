// Map Team Rankings (hỗ trợ camelCase từ BE và snake_case legacy)
export const mapTeamRankings = (data) => {
  if (!data) return [];
  return data.map((item, index) => ({
    key: item.teamId ?? item.team_id ?? index,
    rank: item.rank ?? item.hackathon_rank ?? item.rank_in_final ?? (index + 1),
    team_name: item.teamName ?? item.team_name ?? 'N/A',
    chapter_name: item.chapterName ?? item.chapter_name ?? 'External',
    weighted_avg_score: item.weightedAvgScore ?? item.weighted_avg_score ?? 0,
    judge_count: item.judgeCount ?? item.judge_count ?? 0,
  }));
};

// Map Chapter Rankings
export const mapChapterRankings = (data) => {
  if (!data) return [];
  return data.map((item, index) => ({
    key: item.chapterId ?? item.chapter_id ?? index,
    rank: item.rank ?? item.rank_in_hackathon ?? item.rank_in_academic_year ?? (index + 1),
    chapter_name: item.chapterName ?? item.chapter_name ?? item.chapter?.name ?? 'N/A',
    best_team_score: item.bestTeamScore ?? item.best_team_score ?? 0,
    prize_bonus: item.prizeBonus ?? item.prize_bonus ?? (item.prizesWon ?? item.prizes_won ?? 0) * 10,
    season_score: item.totalScore ?? item.season_score ?? 0,
    cumulative_score: item.cumulativeScore ?? item.cumulative_score ?? item.totalScore ?? 0,
    teams_participated: item.teamsParticipated ?? item.teams_participated ?? 0,
    prizes_won: item.prizesWon ?? item.prizes_won ?? 0,
  }));
};

// Map Individual Rankings
export const mapIndividualRankings = (data) => {
  if (!data) return [];
  return data.map((item, index) => ({
    key: index,
    rank: item.rank ?? item.rank_in_hackathon ?? item.rank_in_academic_year ?? (index + 1),
    user_name: item.userName ?? item.user_name ?? item.user?.full_name ?? item.user?.fullName ?? 'N/A',
    team_name: item.teamName ?? item.team_name ?? item.team?.team_name ?? item.team?.teamName ?? 'N/A',
    score_this_hackathon: item.scoreThisHackathon ?? item.score_this_hackathon ?? 0,
    cumulative_score: item.cumulativeScore ?? item.cumulative_score ?? 0,
  }));
};
