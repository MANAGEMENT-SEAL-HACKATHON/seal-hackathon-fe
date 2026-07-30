// src/features/rounds/results/hooks/useRoundResults.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { message } from "antd";
import { roundResultsService } from "../services/roundResults.service";
import { roundService } from "../services/roundService";
import { mapRoundToFE } from "../mappers/roundMapper";
import { enrichTiebreakItems } from "../mappers/roundResults.mapper";
import { resolveProgressionError } from "../constants/progressionErrors";
import { appealWindowService } from "../../appeals/services/appealWindow.service";

const emptyRanking = { items: [], topNAdvance: 0, isPublished: false, roundName: "Vòng Sơ loại" };

export const useRoundResults = (roundId) => {
  const [ranking, setRanking] = useState(emptyRanking);
  const [tiebreaks, setTiebreaks] = useState([]);
  const [round, setRound] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isResolvingTiebreak, setIsResolvingTiebreak] = useState(false);
  const [appealWindow, setAppealWindow] = useState(null);

  const fetchResults = useCallback(
    async ({ silent = false } = {}) => {
      if (!roundId) return;
      silent ? setIsRefreshing(true) : setIsLoading(true);

      const [rankingResult, tiebreakResult, roundResult, appealResult] = await Promise.allSettled([
        roundResultsService.getRanking(roundId),
        roundResultsService.getTiebreak(roundId),
        roundService.getById(roundId),
        appealWindowService.getStatus(roundId),
      ]);

      const nextErrors = {};
      let nextRanking = emptyRanking;

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
        setRound(mapRoundToFE(roundResult.value));
      } else nextErrors.round = roundResult.reason;

      if (appealResult.status === "fulfilled") {
        setAppealWindow(appealResult.value);
      } else {
        setAppealWindow(null);
      }

      setErrors(nextErrors);
      setIsLoading(false);
      setIsRefreshing(false);
    },
    [roundId],
  );

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

  const canPublish = useMemo(
    () => scoringLocked && !isPublished && !errors.ranking && ranking.items.length > 0,
    [scoringLocked, isPublished, errors.ranking, ranking.items.length],
  );

  const hasUnresolvedTiebreak = useMemo(
    () => tiebreaks.some((item) => !item.resolved),
    [tiebreaks],
  );

  const appealPendingCount = Number(appealWindow?.pendingCount || 0);
  const appealUnderReviewCount = Number(appealWindow?.underReviewCount || 0);
  const hasOpenAppeals = appealPendingCount + appealUnderReviewCount > 0;

  const canAdvance = useMemo(
    () =>
      scoringLocked &&
      isPublished &&
      !hasAdvanced &&
      !hasUnresolvedTiebreak &&
      !hasOpenAppeals &&
      !errors.ranking &&
      ranking.items.length > 0,
    [
      scoringLocked,
      isPublished,
      hasAdvanced,
      hasUnresolvedTiebreak,
      hasOpenAppeals,
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
    if (hasOpenAppeals) {
      return `Còn ${appealPendingCount} đơn chờ duyệt và ${appealUnderReviewCount} đơn đang xét — chuyển sang tab Khiếu nại để xử lý.`;
    }
    if (errors.ranking) return "Chưa tải được bảng xếp hạng.";
    return "";
  }, [
    scoringLocked,
    isPublished,
    hasAdvanced,
    hasUnresolvedTiebreak,
    hasOpenAppeals,
    appealPendingCount,
    appealUnderReviewCount,
    errors.ranking,
  ]);

  const publishRound = async (body) => {
    if (!roundId || isPublishing) return false;
    if (!canPublish) {
      message.info(publishDisabledReason || "Không thể công bố kết quả lúc này.");
      return false;
    }
    setIsPublishing(true);
    try {
      await roundResultsService.publishRound(roundId, body);
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
    round,
    errors,
    isLoading,
    isRefreshing,
    isPublishing,
    isAdvancing,
    scoringLocked,
    isPublished,
    hasAdvanced,
    rosterDecided: true,
    hasUnresolvedTiebreak,
    advancePreview,
    seatShortageWarning,
    canPublish,
    canAdvance,
    publishDisabledReason,
    advanceDisabledReason,
    isResolvingTiebreak,
    appealWindow,
    appealPendingCount,
    appealUnderReviewCount,
    hasOpenAppeals,
    setAppealWindow,
    buildAdvancePayload,
    fetchResults,
    publishRound,
    advanceTeams,
    resolveTiebreak,
  };
};
