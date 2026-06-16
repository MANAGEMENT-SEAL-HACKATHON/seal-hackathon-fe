/**
 * Hook: useStudentTeam
 * Chức năng: Quản lý trạng thái (State) và tự động gọi API (Fetch) để lấy danh sách đội thi của sinh viên.
 */
import { useCallback, useEffect, useState } from 'react';
import { notification } from 'antd';
import { getStudentTeamErrorMessage } from '../constants/studentTeam.constants';
import { studentTeamService } from '../services/studentTeam.service';

const showLargeTeamNotice = ({ type = 'error', message: title, description }) => {
  notification[type]({
    message: title,
    description,
    placement: 'top',
    duration: 6,
    style: {
      width: 420,
      maxWidth: 'calc(100vw - 32px)',
      borderRadius: 14,
      boxShadow: '0 14px 36px rgba(15, 23, 42, 0.14)',
    },
  });
};

export const useStudentTeam = () => {
  const [hackathonId, setHackathonId] = useState('');
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedTeam = teams.find((team) => team.id === selectedTeamId) || teams[0] || null;

  const replaceTeam = (nextTeam) => {
    if (!nextTeam) return;
    setTeams((prev) => {
      const exists = prev.some((team) => team.id === nextTeam.id);
      if (!exists) return [nextTeam, ...prev];
      return prev.map((team) => (team.id === nextTeam.id ? nextTeam : team));
    });
    setSelectedTeamId(nextTeam.id);
  };

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      let currentHackathonId = hackathonId;
      if (!currentHackathonId) {
        const activeHackathon = await studentTeamService.getActiveHackathon();
        if (activeHackathon && activeHackathon.id) {
          currentHackathonId = activeHackathon.id;
          setHackathonId(currentHackathonId);
        }
      }

      const rawData = await studentTeamService.getMyTeams();
      const data = rawData.filter(
        team =>
          (!team.currentMember || team.currentMember.isAccepted) &&
          team.status !== 'REJECTED' &&
          team.status !== 'ELIMINATED'
      );
      setTeams(data);
      setSelectedTeamId((currentId) =>
        data.some((team) => team.id === currentId) ? currentId : data[0]?.id || null
      );
    } catch (error) {
      showLargeTeamNotice({
        message: 'Không thể tải đội của bạn',
        description: getStudentTeamErrorMessage(error, 'Vui lòng thử lại sau.'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchTeams();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTeams]);

  const refreshSelectedTeam = async (teamId = selectedTeam?.id) => {
    if (!teamId) return null;
    try {
      const detail = await studentTeamService.getTeamDetail(teamId);
      replaceTeam(detail);
      return detail;
    } catch {
      return null;
    }
  };

  return {
    hackathonId,
    setHackathonId,
    teams,
    selectedTeam,
    selectedTeamId,
    setSelectedTeamId,
    isLoading,
    fetchTeams,
    refreshSelectedTeam,
  };
};

