import { useCallback, useEffect, useState } from "react";
import { message } from "antd";
import { rankingSelectionService } from "../service/rankingSelectionService";

export const useRoundRankingSelection = (initialHackathonId, initialRoundId) => {
  const [hackathons, setHackathons] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [selectedHackathonId, setSelectedHackathonId] = useState(initialHackathonId || null);
  const [selectedRoundId, setSelectedRoundId] = useState(initialRoundId || null);
  const [isLoadingHackathons, setIsLoadingHackathons] = useState(false);
  const [isLoadingRounds, setIsLoadingRounds] = useState(false);

  const fetchHackathons = useCallback(async () => {
    setIsLoadingHackathons(true);
    try {
      const data = await rankingSelectionService.getHackathons();
      setHackathons(data);
    } catch (error) {
      message.error(error?.message || "Không thể tải danh sách Hackathon.");
    } finally {
      setIsLoadingHackathons(false);
    }
  }, []);

  const fetchRounds = useCallback(async (hackathonId) => {
    if (!hackathonId) {
      setRounds([]);
      return;
    }

    setIsLoadingRounds(true);
    try {
      const data = await rankingSelectionService.getRoundsByHackathon(hackathonId);
      setRounds(data);
    } catch (error) {
      message.error(error?.message || "Không thể tải danh sách Round.");
    } finally {
      setIsLoadingRounds(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchHackathons, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchHackathons]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchRounds(selectedHackathonId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchRounds, selectedHackathonId]);

  const changeHackathon = (hackathonId) => {
    setSelectedHackathonId(hackathonId);
    setSelectedRoundId(null);
  };

  return {
    hackathons,
    rounds,
    selectedHackathonId,
    selectedRoundId,
    setSelectedRoundId,
    changeHackathon,
    isLoadingHackathons,
    isLoadingRounds,
  };
};
