// Map Team Rankings
export const mapTeamRankings = (data) => {
  if (!data) return [];
  return data.map((item, index) => ({
    key: index,
    rank: item.hackathon_rank || item.rank_in_final || (index + 1),
    team_name: item.team_name || 'N/A',
    chapter_name: item.chapter_name || 'External',
    weighted_avg_score: item.weighted_avg_score || 0,
    judge_count: item.judge_count || 0
  }));
};

// Map Chapter Rankings
export const mapChapterRankings = (data) => {
  if (!data) return [];
  return data.map((item, index) => ({
    key: index,
    rank: item.rank_in_academic_year || item.rank_in_hackathon || (index + 1),
    chapter_name: item.chapter_name || item.chapter?.name || 'N/A', 
    best_team_score: item.best_team_score || 0,
    prize_bonus: item.prize_bonus || 0,
    season_score: item.season_score || 0,
    cumulative_score: item.cumulative_score || 0,
    teams_participated: item.teams_participated || 0,
    prizes_won: item.prizes_won || 0
  }));
};

// Map Individual Rankings
export const mapIndividualRankings = (data) => {
  if (!data) return [];
  return data.map((item, index) => ({
    key: index,
    rank: item.rank_in_academic_year || item.rank_in_hackathon || (index + 1),
    user_name: item.user_name || item.user?.full_name || 'N/A',
    team_name: item.team_name || item.team?.team_name || 'N/A',
    score_this_hackathon: item.score_this_hackathon || 0,
    cumulative_score: item.cumulative_score || 0
  }));
};
