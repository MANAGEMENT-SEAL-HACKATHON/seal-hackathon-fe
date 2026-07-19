// src/features/rounds/results/hooks/useRoundResults.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { roundResultsService } from "../services/roundResults.service";
import { roundService } from "../services/roundService";
import { mapRoundToFE } from "../mappers/roundMapper";
import { enrichWildcardFromRound, enrichTiebreakItems } from "../mappers/roundResults.mapper";
import { resolveProgressionError } from "../constants/progressionErrors";

const emptyRanking = { items: [], topNAdvance: 0, isPublished: false, roundName: "Vòng Sơ loại" };
const emptyWildcard = {
  config: { hackathonEnabled: false, roundEnabled: false, availableSlots: 0 },
  items: [],
  proposalConfirmedAt: null,
};

export const useRoundResults = (roundId) => {
  const [ranking, setRanking] = useState(emptyRanking);
  const [tiebreaks, setTiebreaks] = useState([]);
  const [wildcard, setWildcard] = useState(emptyWildcard);
  const [round, setRound] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [confirmingProposal, setConfirmingProposal] = useState(false);
  const [overridingReviewId, setOverridingReviewId] = useState(null);
  const [overrideHistory, setOverrideHistory] = useState([]);
  const [isResolvingTiebreak, setIsResolvingTiebreak] = useState(false);

  const fetchResults = useCallback(
    async ({ silent = false } = {}) => {
      if (!roundId) return;
      silent ? setIsRefreshing(true) : setIsLoading(true);

      const [rankingResult, tiebreakResult, wildcardResult, roundResult] = await Promise.allSettled([
        roundResultsService.getRanking(roundId),
        roundResultsService.getTiebreak(roundId),
        roundResultsService.getWildcardCandidates(roundId),
        roundService.getById(roundId),
      ]);

      const nextErrors = {};
      let nextRanking = emptyRanking;
      let nextRound = null;
      let nextWildcard;

      if (rankingResult.status === "fulfilled") {
        nextRanking = rankingResult.value;
        setRanking(nextRanking);
      } else {
        // Chưa khóa chấm → /ranking trả ROUND_NOT_SCORING_LOCKED. Fallback sang
        // preview để tab «Kiểm tra chấm» xem điểm thành phần LÚC đang chấm (trước Lock).
        try {
          nextRanking = await roundResultsService.getRankingPreview(roundId);
          setRanking(nextRanking);
        } catch {
          nextErrors.ranking = rankingResult.reason;
        }
      }

      if (tiebreakResult.status === "fulfilled") {
        // Gọi hàm JOIN data truyền kèm nextRanking.items
        const enrichedTiebreaks = enrichTiebreakItems(tiebreakResult.value, nextRanking.items);
        setTiebreaks(enrichedTiebreaks);
      } else {
        nextErrors.tiebreak = tiebreakResult.reason;
      }

      if (roundResult.status === "fulfilled") {
        nextRound = mapRoundToFE(roundResult.value);
        setRound(nextRound);
      } else nextErrors.round = roundResult.reason;

      if (wildcardResult.status === "fulfilled") {
        nextWildcard = enrichWildcardFromRound(wildcardResult.value, nextRound, nextRanking);
        setWildcard(nextWildcard);
      } else nextErrors.wildcard = wildcardResult.reason;

      setErrors(nextErrors);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [roundId],
  );

  const confirmWildcardProposal = async () => {
    if (!roundId) return false;
    setConfirmingProposal(true);
    try {
      await roundResultsService.confirmWildcardProposal(roundId);
      message.success("Đã xác nhận đề xuất vé vớt — danh sách đã khóa.");
      await fetchResults({ silent: true });
      await loadOverrideHistory();
      return true;
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, "Không thể xác nhận đề xuất vé vớt.");
      message.error(msg);
      return false;
    } finally {
      setConfirmingProposal(false);
    }
  };

  const loadOverrideHistory = useCallback(async () => {
    if (!roundId) return;
    try {
      const rows = await roundResultsService.getWildcardOverrides(roundId);
      setOverrideHistory(rows);
    } catch {
      setOverrideHistory([]);
    }
  }, [roundId]);

  const overrideWildcard = async (candidate, { approved, category, note }) => {
    setOverridingReviewId(candidate.reviewId);
    try {
      await roundResultsService.overrideWildcardReview(candidate.reviewId, {
        approved,
        category,
        note,
      });
      message.success("Đã lưu override vé vớt.");
      await fetchResults({ silent: true });
      await loadOverrideHistory();
      return true;
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, "Không thể override vé vớt.");
      message.error(msg);
      return false;
    } finally {
      setOverridingReviewId(null);
    }
  };

  const resolveTiebreak = async (payload) => {
    if (!roundId) return false;
    setIsResolvingTiebreak(true);
    try {
      await roundResultsService.resolveTiebreak(roundId, payload);
      message.success("Đã phân xử đồng điểm thành công! Hệ thống đã tính lại Xếp hạng.");
      await fetchResults({ silent: true }); // Tải lại toàn bộ dữ liệu
      return true;
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, "Lỗi khi phân xử đồng điểm.");
      message.error(msg);
      return false;
    } finally {
      setIsResolvingTiebreak(false);
    }
  };

  const buildAdvancePayload = useCallback(() => {
    const topN = Number(ranking.topNAdvance || round?.top_n_advance || 0);
    const byGroup = {};

    ranking.items.forEach((item) => {
      const key = item.groupLabel || "default";
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push(item);
    });

    const advancedTeamIds = [];
    Object.values(byGroup).forEach((groupItems) => {
      const eligible = groupItems.filter(
        (item) =>
          !item.isEliminated &&
          item.participationStatus !== "ELIMINATED" &&
          item.status !== "ELIMINATED",
      );
      const sorted = [...eligible].sort((left, right) => left.rank - right.rank);
      advancedTeamIds.push(...sorted.slice(0, topN || sorted.length).map((team) => team.teamId));
    });

    const allTeamIds = ranking.items.map((item) => item.teamId);
    const advancedSet = new Set(advancedTeamIds);
    const eliminatedTeamIds = allTeamIds.filter((teamId) => !advancedSet.has(teamId));

    return { advancedTeamIds, eliminatedTeamIds, note: "" };
  }, [ranking.items, ranking.topNAdvance, round?.top_n_advance]);

  const scoringLocked = Boolean(round?.scoring_locked ?? round?.scoringLocked);
  const isPublished = Boolean(round?.is_published ?? ranking.isPublished);

  const hasAdvanced = useMemo(
    () => ranking.items.some((item) => item.isAdvanced || item.participationStatus === "ADVANCED"),
    [ranking.items],
  );

  // Phase 1: Wildcard (Vé vớt) removed from UI — always ready / never show tab
  const wildcardDecisionsReady = true;
  const showWildcardTab = false;

  const advancePreview = useMemo(() => {
    const { advancedTeamIds, eliminatedTeamIds } = buildAdvancePayload();
    const byId = new Map(ranking.items.map((item) => [item.teamId, item]));
    const advancedTeams = advancedTeamIds
      .map((teamId) => byId.get(teamId))
      .filter(Boolean);
    return {
      advancedTeamIds,
      advancedTeamIdSet: new Set(advancedTeamIds),
      advancedTeams,
      eliminatedCount: eliminatedTeamIds.length,
    };
  }, [buildAdvancePayload, ranking.items]);

  const seatShortageWarning = useMemo(() => {
    const minFinal = Number(round?.min_teams_final ?? round?.minTeamsFinal ?? 0);
    if (!minFinal) return null;
    const advancedCount = ranking.items.filter(
      (item) =>
        item.participationStatus === 'ADVANCED' ||
        item.isAdvanced ||
        advancePreview.advancedTeamIdSet.has(item.teamId),
    ).length;
    if (advancedCount >= minFinal) return null;
    return {
      advancedCount,
      minTeamsFinal: minFinal,
      message: `Số đội vào Chung kết (${advancedCount}) thấp hơn trần thiết lập (${minFinal}). Có thể do bị loại kỷ luật hoặc bảng hết đội hợp lệ để đôn (Top-N mỗi bảng).`,
    };
  }, [round, ranking.items, advancePreview.advancedTeamIdSet]);

  const rejectedWildcardTeamIdSet = useMemo(
    () =>
      new Set(
        wildcard.items
          .filter((item) => item.coordinatorApproved === false)
          .map((item) => item.teamId)
          .filter(Boolean),
      ),
    [wildcard.items],
  );

  const rosterDecided = useMemo(
    () => wildcard.items.length === 0 || wildcardDecisionsReady,
    [wildcard.items.length, wildcardDecisionsReady],
  );

  const canPublish = useMemo(
    () => scoringLocked && !isPublished && !errors.ranking && ranking.items.length > 0,
    [scoringLocked, isPublished, errors.ranking, ranking.items.length],
  );

  const hasUnresolvedTiebreak = useMemo(
    () => tiebreaks.some((item) => !item.resolved),
    [tiebreaks],
  );

  const canAdvance = useMemo(
    () =>
      scoringLocked &&
      isPublished &&
      !hasAdvanced &&
      !hasUnresolvedTiebreak &&
      !errors.ranking &&
      ranking.items.length > 0,
    [
      scoringLocked,
      isPublished,
      hasAdvanced,
      hasUnresolvedTiebreak,
      errors.ranking,
      ranking.items.length,
    ],
  );

  const publishDisabledReason = useMemo(() => {
    if (!scoringLocked) return "Cần khóa chấm điểm trước.";
    if (isPublished) return "Kết quả đã được công bố. Bấm «Chốt chuyển vòng» để xác nhận đội vào Chung kết.";
    if (errors.ranking) return "Chưa tải được bảng xếp hạng.";
    if (ranking.items.length === 0) return "Chưa có dữ liệu xếp hạng.";
    return "";
  }, [scoringLocked, isPublished, errors.ranking, ranking.items.length]);

  const advanceDisabledReason = useMemo(() => {
    if (!scoringLocked) return "Cần khóa chấm điểm trước.";
    if (!isPublished) return "Cần công bố kết quả trước khi chốt chuyển vòng.";
    if (hasAdvanced) return "Danh sách chuyển vòng đã được chốt.";
    if (hasUnresolvedTiebreak) {
      return "Có các đội đồng điểm tại ranh giới đi tiếp. Vui lòng phân xử đồng điểm.";
    }
    if (errors.ranking) return "Chưa tải được bảng xếp hạng.";
    return "";
  }, [scoringLocked, isPublished, hasAdvanced, hasUnresolvedTiebreak, errors.ranking]);

  const publishRound = async () => {
    if (!roundId || isPublishing) return false;
    if (!canPublish) {
      message.info(publishDisabledReason || "Không thể công bố kết quả lúc này.");
      return false;
    }
    setIsPublishing(true);
    try {
      await roundResultsService.publishRound(roundId);
      message.success("Đã công bố kết quả sơ loại.");
      await fetchResults({ silent: true });
      return true;
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, "Không thể công bố kết quả.");
      message.error(msg);
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  const advanceTeams = async (payload) => {
    if (!roundId) return false;
    if (!canAdvance) {
      message.info(advanceDisabledReason || "Không thể chốt chuyển vòng lúc này.");
      return false;
    }
    setIsAdvancing(true);
    try {
      await roundResultsService.advanceTeams(roundId, payload || buildAdvancePayload());
      message.success("Đã chốt danh sách chuyển vòng Chung kết.");
      await fetchResults({ silent: true });
      return true;
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, "Không thể chốt chuyển vòng.");
      message.error(msg);
      return false;
    } finally {
      setIsAdvancing(false);
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
    showWildcardTab,
    round,
    errors,
    isLoading,
    isRefreshing,
    isPublishing,
    isAdvancing,
    decidingReviewId: null,
    confirmingProposal,
    overridingReviewId,
    overrideHistory,
    scoringLocked,
    isPublished,
    hasAdvanced,
    wildcardDecisionsReady,
    rosterDecided,
    rejectedWildcardTeamIdSet,
    hasUnresolvedTiebreak,
    advancePreview,
    seatShortageWarning,
    canPublish,
    canAdvance,
    publishDisabledReason,
    advanceDisabledReason,
    isResolvingTiebreak,
    buildAdvancePayload,
    fetchResults,
    confirmWildcardProposal,
    overrideWildcard,
    loadOverrideHistory,
    publishRound,
    advanceTeams,
    resolveTiebreak,
  };
};

