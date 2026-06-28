// src/features/round-ranking/hooks/useRoundRankingPreview.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { roundRankingService } from "../service/roundRankingService";
import { getRankingSummary, groupRankingItems } from "../service/rankingPreviewMapper";

const POLLING_INTERVAL_MS = 30000;

export const useRoundRankingPreview = (roundId, options = {}) => {
  const { polling = true } = options;
  const [items, setItems] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const fetchPreview = useCallback(
    async ({ silent = false } = {}) => {
      if (!roundId) return;

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const rankingItems = await roundRankingService.getRankingPreview(roundId);
        setItems(rankingItems);
        setLastUpdatedAt(new Date());
        setError(null);
      } catch (fetchError) {
        setError(fetchError);
        setItems([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [roundId]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchPreview();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPreview]);

  useEffect(() => {
    if (!polling || !roundId) return undefined;

    const intervalId = window.setInterval(() => {
      fetchPreview({ silent: true });
    }, POLLING_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchPreview, polling, roundId]);

  const groups = useMemo(() => groupRankingItems(items), [items]);
  const summary = useMemo(() => getRankingSummary(items, groups), [items, groups]);

  const visibleItems = useMemo(() => {
    if (selectedGroup === "all") {
      return groups.flatMap((group) => group.items);
    }
    return groups.find((group) => group.key === selectedGroup)?.items || [];
  }, [groups, selectedGroup]);

  return {
    items,
    visibleItems,
    groups,
    summary,
    selectedGroup,
    setSelectedGroup,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    fetchPreview,
  };
};
