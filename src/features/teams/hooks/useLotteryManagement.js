// src/features/teams/hooks/useLotteryManagement.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import { teamService } from '../services/teamService';
import { trackService } from '../../tracks/services/trackService';
import { roundService } from '../../rounds/services/roundService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { mapHackathonToFE } from '../../hackathons/mappers/hackathonMapper';
import { getTeamErrorMessage } from '../../../shared/constants/teamErrors';
import { mapTrackToBE } from '../../tracks/mappers/trackMapper';

const isTeamLocked = (team) => !!(team?.isLocked ?? team?.is_locked);

export const useLotteryManagement = (hackathonId) => {
  const [rounds, setRounds] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [activeTeams, setActiveTeams] = useState([]);
  const [hackathon, setHackathon] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  const fetchLotteryData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rRes, tRes, teamsRes, hRes] = await Promise.all([
        roundService.listByHackathon(hackathonId),
        trackService.listByHackathon(hackathonId),
        teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
        hackathonService.getById(hackathonId),
      ]);

      const roundList = Array.isArray(rRes) ? rRes : rRes?.items || [];
      const trackList = Array.isArray(tRes) ? tRes : tRes?.items || [];
      const teamList = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || [];

      setHackathon(mapHackathonToFE(hRes));
      setRounds(roundList.filter((r) => !r.is_final && !r.isFinal));
      setTracks(trackList);
      setActiveTeams(teamList);

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

  const lotteryGate = useMemo(() => {
    if (hackathon?.status && hackathon.status !== 'ONGOING') {
      return {
        allowed: false,
        reason: 'Bốc thăm chỉ thực hiện khi hackathon đã ONGOING (sau bước Mở đăng ký ở tab Đánh giá).',
      };
    }

    const regEnd = hackathon?.registration_end
      ? dayjs(hackathon.registration_end).startOf('day')
      : null;

    if (!regEnd) {
      return { allowed: false, reason: 'Chưa có ngày kết thúc đăng ký.' };
    }

    if (!dayjs().startOf('day').isAfter(regEnd)) {
      return {
        allowed: false,
        reason: 'Khóa đội và bốc thăm chỉ từ ngày hôm sau khi kết thúc đăng ký.',
      };
    }

    if (activeTeams.length === 0) {
      return { allowed: false, reason: 'Chưa có đội ACTIVE được duyệt để bốc thăm.' };
    }

    const unlockedTeams = activeTeams.filter((t) => !isTeamLocked(t));
    if (unlockedTeams.length > 0) {
      return {
        allowed: false,
        reason: `Còn ${unlockedTeams.length} đội chưa bị khóa (is_locked). Hệ thống khóa sau ngày đăng ký.`,
      };
    }

    return { allowed: true, reason: '' };
  }, [hackathon, activeTeams]);

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
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunAutoLottery = async () => {
    if (!selectedRoundId) return message.warning('Vui lòng chọn Vòng thi trước!');
    if (!lotteryGate.allowed) {
      return message.warning(lotteryGate.reason);
    }

    setIsLoading(true);
    try {
      await teamService.runLottery(hackathonId, { roundId: selectedRoundId, assignments: [] });
      message.success('Bốc thăm phân bảng thành công cho tất cả các đội!');
      await fetchLotteryData();
    } catch (error) {
      message.error(getTeamErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeTrack = async (teamId, newTrackId) => {
    if (!selectedRoundId) return;
    setIsLoading(true);
    try {
      await teamService.changeTrack(teamId, selectedRoundId, Number(newTrackId));
      message.success('Đã đổi Bảng đấu cho đội thi thành công!');
      await fetchLotteryData();
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
