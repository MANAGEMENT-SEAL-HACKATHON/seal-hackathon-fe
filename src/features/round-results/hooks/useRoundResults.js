import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { roundResultsService } from "../services/roundResults.service";

const emptyRanking = { items: [], topNAdvance: 0, isPublished: false, roundName: "Vòng Sơ loại" };
const emptyWildcard = {
  config: { hackathonEnabled: false, roundEnabled: false, availableSlots: 0 },
  items: [],
};

export const useRoundResults = (roundId) => {
  const [ranking, setRanking] = useState(emptyRanking);
  const [tiebreaks, setTiebreaks] = useState([]);
  const [wildcard, setWildcard] = useState(emptyWildcard);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [decidingReviewId, setDecidingReviewId] = useState(null);

  const fetchResults = useCallback(
    async ({ silent = false } = {}) => {
      if (!roundId) return;
      silent ? setIsRefreshing(true) : setIsLoading(true);

      const [rankingResult, tiebreakResult, wildcardResult] = await Promise.allSettled([
        roundResultsService.getRanking(roundId),
        roundResultsService.getTiebreak(roundId),
        roundResultsService.getWildcardCandidates(roundId),
      ]);

      const nextErrors = {};
      if (rankingResult.status === "fulfilled") setRanking(rankingResult.value);
      else nextErrors.ranking = rankingResult.reason;
      if (tiebreakResult.status === "fulfilled") setTiebreaks(tiebreakResult.value);
      else nextErrors.tiebreak = tiebreakResult.reason;
      if (wildcardResult.status === "fulfilled") setWildcard(wildcardResult.value);
      else nextErrors.wildcard = wildcardResult.reason;

      setErrors(nextErrors);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [roundId],
  );

  const decideWildcard = async (candidate, approved, note) => {
    setDecidingReviewId(candidate.reviewId);
    try {
      await roundResultsService.decideWildcardReview(candidate.reviewId, { approved, note });
      message.success(approved ? "Đã duyệt vé vớt." : "Đã từ chối vé vớt.");
      await fetchResults({ silent: true });
      return true;
    } catch (error) {
      message.error(error?.message || "Không thể cập nhật quyết định vé vớt.");
      return false;
    } finally {
      setDecidingReviewId(null);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => fetchResults(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchResults]);

  return {
    ranking,
    tiebreaks,
    wildcard,
    errors,
    isLoading,
    isRefreshing,
    decidingReviewId,
    fetchResults,
    decideWildcard,
  };
};

