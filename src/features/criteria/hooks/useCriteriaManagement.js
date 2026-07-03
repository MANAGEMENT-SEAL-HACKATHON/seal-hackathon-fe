import { useState, useMemo, useEffect, useCallback } from "react";
import { message } from "antd";
import {
  CRITERIA_TYPES,
  MAX_WEIGHT_TOTAL,
} from "../constants/criteria.constants";
import { criteriaService } from "../services/criteriaService";
import { roundService } from "../../rounds/services/roundService";
import { trackService } from "../../tracks/services/trackService";
import { mapRoundToFE } from "../../rounds/mappers/roundMapper";
import { mapTrackToFE } from "../../tracks/mappers/trackMapper";

export const useCriteriaManagement = (hackathonId) => {
  const [rounds, setRounds] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [criteriaList, setCriteriaList] = useState([]);
  const [weightSummary, setWeightSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const roundsRes = await roundService.listByHackathon(hackathonId);
      const tracksRes = await trackService.listByHackathon(hackathonId);
      const fullRounds = await Promise.all(
        (roundsRes || []).map(async (r) => {
          try {
            const detail = await roundService.getById(r.id);
            return mapRoundToFE(detail);
          } catch (_e) {
            return mapRoundToFE(r);
          }
        }),
      );
      setRounds(fullRounds);
      setTracks((tracksRes || []).map(mapTrackToFE));
      setIsDataLoaded(true);
    } catch (_err) {
      message.error("Lỗi khi tải dữ liệu Vòng thi/Bảng đấu");
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    fetchBaseData();
  }, [fetchBaseData]);

  const hackathonRounds = useMemo(
    () => [...rounds].sort((a, b) => a.sequence_order - b.sequence_order),
    [rounds],
  );
  const currentRound = hackathonRounds.find((r) => r.id === selectedRoundId);

  const roundTracks = useMemo(() => {
    if (!currentRound || currentRound.is_final) return [];
    return [...tracks]
      .filter((t) => t.round_id === selectedRoundId)
      .sort((a, b) => a.sequence_order - b.sequence_order);
  }, [tracks, currentRound, selectedRoundId]);

  const hackathonTracks = useMemo(() => tracks, [tracks]);

  useEffect(() => {
    setSelectedTrackId(null);
  }, [selectedRoundId]);

  const fetchCriteria = useCallback(async () => {
    if (!currentRound || (!currentRound.is_final && !selectedTrackId)) {
      setCriteriaList([]);
      setWeightSummary(null);
      return;
    }
    setIsLoading(true);
    try {
      const payload = currentRound.is_final
        ? await criteriaService.listPayloadByFinalRound(selectedRoundId)
        : await criteriaService.listPayloadByTrack(selectedTrackId);
      setCriteriaList(Array.isArray(payload.items) ? payload.items : []);
      setWeightSummary(payload.weightSummary || null);
    } catch (error) {
      message.error("Không thể tải danh sách tiêu chí");
      setCriteriaList([]);
      setWeightSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentRound, selectedRoundId, selectedTrackId]);

  useEffect(() => {
    fetchCriteria();
  }, [fetchCriteria]);

  const currentCriteria = useMemo(
    () => [...criteriaList].sort((a, b) => a.display_order - b.display_order),
    [criteriaList],
  );

  const totalWeight = useMemo(() => {
    if (weightSummary?.total !== undefined && weightSummary?.total !== null) {
      return Number(weightSummary.total) || 0;
    }
    return currentCriteria
      .filter((c) => c.type !== CRITERIA_TYPES.PENALTY)
      .reduce((sum, c) => sum + (c.weight || 0), 0);
  }, [currentCriteria, weightSummary]);

  const isWeightValid = Math.abs(totalWeight - MAX_WEIGHT_TOTAL) < 0.001;

  const handleAutoBalance = useCallback(async () => {
    const nonPenalty = currentCriteria.filter(
      (c) => c.type !== CRITERIA_TYPES.PENALTY,
    );
    if (nonPenalty.length === 0) return;
    const evenWeight = parseFloat(
      (MAX_WEIGHT_TOTAL / nonPenalty.length).toFixed(2),
    );
    let remaining = MAX_WEIGHT_TOTAL;
    const promises = nonPenalty.map((c, index) => {
      let weightToAssign =
        index === nonPenalty.length - 1
          ? parseFloat(remaining.toFixed(2))
          : evenWeight;
      remaining -= evenWeight;
      return criteriaService.update(c.id, { ...c, weight: weightToAssign });
    });
    setIsLoading(true);
    try {
      await Promise.all(promises);
      message.success("Đã cân bằng trọng số tự động");
      fetchCriteria();
    } catch (error) {
      message.error("Lỗi khi cân bằng trọng số");
    } finally {
      setIsLoading(false);
    }
  }, [currentCriteria, fetchCriteria]);

  const handleCloneCriteria = useCallback(
    async (sourceRoundId, sourceTrackId, replaceExisting = false) => {
      setIsLoading(true);
      try {
        if (currentRound?.is_final) {
          await criteriaService.cloneForFinalRound(selectedRoundId, {
            sourceRoundId,
            sourceTrackId,
            replaceExisting,
          });
        } else {
          await criteriaService.cloneForTrack(selectedTrackId, {
            sourceRoundId,
            sourceTrackId,
            replaceExisting,
          });
        }
        message.success("Sao chép tiêu chí thành công");
        fetchCriteria();
        return 1;
      } catch (error) {
        message.error("Lỗi khi sao chép tiêu chí");
        return 0;
      } finally {
        setIsLoading(false);
      }
    },
    [currentRound, selectedRoundId, selectedTrackId, fetchCriteria],
  );

  const handleSaveCriteria = useCallback(
    async (values, editingId) => {
      setIsLoading(true);
      try {
        if (editingId) {
          await criteriaService.update(editingId, values);
          message.success("Cập nhật tiêu chí thành công");
        } else {
          if (currentRound?.is_final)
            await criteriaService.createForFinalRound(selectedRoundId, values);
          else await criteriaService.createForTrack(selectedTrackId, values);
          message.success("Thêm tiêu chí thành công");
        }
        fetchCriteria();
      } catch (error) {
        message.error("Có lỗi xảy ra");
      } finally {
        setIsLoading(false);
      }
    },
    [currentRound, selectedRoundId, selectedTrackId, fetchCriteria],
  );

  const handleBatchSaveCriteria = useCallback(
    async (itemsData) => {
      setIsLoading(true);
      try {
        if (currentRound?.is_final)
          await criteriaService.createBatchForFinalRound(
            selectedRoundId,
            itemsData,
          );
        else
          await criteriaService.createBatchForTrack(selectedTrackId, itemsData);
        message.success(`Đã thêm thành công ${itemsData.length} tiêu chí mới!`);
        fetchCriteria();
      } catch (error) {
        message.error("Lỗi khi thêm hàng loạt tiêu chí");
      } finally {
        setIsLoading(false);
      }
    },
    [currentRound, selectedRoundId, selectedTrackId, fetchCriteria],
  );

  const handleApplyStandardCriteria = useCallback(
    async (itemsData, replaceExisting = false) => {
      setIsLoading(true);
      try {
        if (replaceExisting && currentCriteria.length > 0) {
          await Promise.all(currentCriteria.map((c) => criteriaService.delete(c.id)));
        }
        if (currentRound?.is_final) {
          await criteriaService.createBatchForFinalRound(selectedRoundId, itemsData);
        } else {
          await criteriaService.createBatchForTrack(selectedTrackId, itemsData);
        }
        message.success("Đã áp dụng bộ tiêu chí chuẩn");
        fetchCriteria();
      } catch (error) {
        message.error("Không thể áp dụng tiêu chí chuẩn");
      } finally {
        setIsLoading(false);
      }
    },
    [currentRound, selectedRoundId, selectedTrackId, currentCriteria, fetchCriteria],
  );

  const handleDeleteCriteria = useCallback(
    async (id) => {
      setIsLoading(true);
      try {
        await criteriaService.delete(id);
        message.success("Đã xóa tiêu chí");
        fetchCriteria();
      } catch (error) {
        error.status === 409
          ? message.error("Không thể xóa do tiêu chí đã có dữ liệu chấm điểm")
          : message.error("Lỗi khi xóa tiêu chí");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchCriteria],
  );

  return {
    hackathonRounds,
    hackathonTracks,
    currentRound,
    roundTracks,
    currentCriteria,
    weightSummary,
    totalWeight,
    isWeightValid,
    selectedRoundId,
    setSelectedRoundId,
    selectedTrackId,
    setSelectedTrackId,
    handleAutoBalance,
    handleCloneCriteria,
    handleSaveCriteria,
    handleBatchSaveCriteria,
    handleApplyStandardCriteria,
    deleteCriteria: handleDeleteCriteria,
    updateRound: async (id, data) => {
      try {
        await roundService.update(id, data);
        message.success("Cập nhật trạng thái vòng thi thành công");
        fetchBaseData();
      } catch (_err) {
        message.error("Lỗi khi cập nhật vòng thi");
      }
    },
    isLoading,
  };
};
