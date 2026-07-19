// src/features/teams/hooks/useLotteryManagement.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { message, Modal } from 'antd';
import { teamService } from '../services/teamService';
import { trackService } from '../../tracks/services/trackService';
import { roundService } from '../../rounds/services/roundService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { mapHackathonToFE } from '../../hackathons/mappers/hackathonMapper';
import { getLotteryGateReason } from '../../hackathons/utils/hackathonRegistrationRules';
import { classifyPendingTeams } from '../../hackathons/utils/pendingTeamBuckets';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import { mapTrackToBE } from '../../tracks/mappers/trackMapper';

export const useLotteryManagement = (hackathonId, onUpdated) => {
  const [rounds, setRounds] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [activeTeams, setActiveTeams] = useState([]);
  const [pendingTeams, setPendingTeams] = useState([]);
  const [hackathon, setHackathon] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  const notifyHub = useCallback(async () => {
    if (typeof onUpdated === 'function') await onUpdated();
  }, [onUpdated]);

  const fetchLotteryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rRes, tRes, teamsRes, pendingRes, hRes] = await Promise.all([
        roundService.listByHackathon(hackathonId),
        trackService.listByHackathon(hackathonId),
        teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
        teamService.listByHackathon(hackathonId, { status: 'PENDING' }),
        hackathonService.getById(hackathonId),
      ]);

      const roundList = Array.isArray(rRes) ? rRes : rRes?.items || [];
      const trackList = Array.isArray(tRes) ? tRes : tRes?.items || [];
      const teamList = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || [];
      const pendingList = Array.isArray(pendingRes) ? pendingRes : pendingRes?.items || [];

      setHackathon(mapHackathonToFE(hRes));
      setRounds(roundList.filter((r) => !r.is_final && !r.isFinal));
      setTracks(trackList);
      setActiveTeams(teamList);
      setPendingTeams(pendingList);

      if (!selectedRoundId && roundList.length > 0) {
        const firstPrelim = roundList.find((r) => !r.is_final && !r.isFinal);
        if (firstPrelim) setSelectedRoundId(firstPrelim.id);
      }
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu Bốc thăm & Bảng đấu');
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, selectedRoundId]);

  useEffect(() => {
    fetchLotteryData();
  }, [fetchLotteryData]);

  const selectedRound = useMemo(
    () => rounds.find((r) => r.id === selectedRoundId) ?? null,
    [rounds, selectedRoundId],
  );

  const pendingBuckets = useMemo(
    () => classifyPendingTeams(pendingTeams),
    [pendingTeams],
  );

  const lotteryGate = useMemo(() => {
    const reason = getLotteryGateReason(
      hackathon,
      activeTeams,
      selectedRound,
      pendingTeams,
    );
    return { allowed: !reason, reason };
  }, [hackathon, activeTeams, selectedRound, pendingTeams]);

  const handleAssignTopic = async (trackId, newTopic, currentTrackData) => {
    setIsLoading(true);
    try {
      const feData = {
        name: currentTrackData.name,
        description: currentTrackData.description,
        topic: newTopic,
        max_teams: currentTrackData.maxTeams ?? currentTrackData.max_teams,
        max_teams_per_group: currentTrackData.maxTeamsPerGroup ?? currentTrackData.max_teams_per_group,
        min_team_size: currentTrackData.minTeamSize ?? currentTrackData.min_team_size ?? 1,
        max_team_size: currentTrackData.maxTeamSize ?? currentTrackData.max_team_size ?? 5,
        status: currentTrackData.status || 'OPEN',
      };

      const payload = mapTrackToBE(feData);
      await trackService.update(trackId, payload);
      message.success('Đã gửi yêu cầu cập nhật lên hệ thống!');
      await fetchLotteryData();
      await notifyHub();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAutoLottery = async () => {
    if (isLoading) return;
    if (!selectedRoundId) return message.warning('Vui lòng chọn Vòng thi trước!');
    if (!lotteryGate.allowed) {
      return message.warning(lotteryGate.reason);
    }

    Modal.confirm({
      title: 'Bốc thăm tự động?',
      content:
        'Hệ thống sẽ phân ngẫu nhiên các đội ACTIVE đã khóa vào các bảng đấu. Thao tác này ảnh hưởng toàn bộ cohort — không nên bấm khi còn đội PENDING.',
      okText: 'Bốc thăm',
      cancelText: 'Hủy',
      onOk: async () => {
        if (isLoading) return;
        setIsLoading(true);
        try {
          await teamService.runLottery(hackathonId, { roundId: selectedRoundId, assignments: [] });
          message.success('Bốc thăm phân bảng thành công cho tất cả các đội!');
          await fetchLotteryData();
          await notifyHub();
        } catch (error) {
          message.error(getTeamErrorMessage(error));
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  const handleChangeTrack = async (teamId, newTrackId) => {
    if (!selectedRoundId) return;
    setIsLoading(true);
    try {
      await teamService.changeTrack(teamId, selectedRoundId, Number(newTrackId));
      message.success('Đã đổi Bảng đấu cho đội thi thành công!');
      await fetchLotteryData();
      await notifyHub();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    rounds,
    tracks,
    activeTeams,
    pendingTeams,
    pendingBuckets,
    hackathon,
    isLoading,
    selectedRoundId,
    setSelectedRoundId,
    lotteryGate,
    handleAssignTopic,
    handleRunAutoLottery,
    handleChangeTrack,
    refetch: fetchLotteryData,
  };
};
