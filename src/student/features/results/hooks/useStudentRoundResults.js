import { useCallback, useEffect, useState } from "react";
import { studentResultsService } from "../services/studentResults.service";

const emptyScoreboard = { roundName: "Kết quả Sơ loại", publishedAt: null, items: [] };

export const useStudentRoundResults = (roundId, source = "public") => {
  const [scoreboard, setScoreboard] = useState(emptyScoreboard);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScoreboard = useCallback(async () => {
    if (!roundId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data =
        source === "student"
          ? await studentResultsService.getStudentLeaderboard(roundId)
          : await studentResultsService.getPublicScoreboard(roundId);
      setScoreboard(data);
    } catch (fetchError) {
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [roundId, source]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => fetchScoreboard(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchScoreboard]);

  return { scoreboard, isLoading, error, fetchScoreboard };
};
