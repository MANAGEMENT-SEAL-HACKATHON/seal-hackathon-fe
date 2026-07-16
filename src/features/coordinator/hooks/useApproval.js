import { useState, useCallback } from 'react';
import { message, notification } from 'antd';
import { approvalService } from '../services/approval.service';
import { getTeamErrorMessage } from '../constants/team.constants';

export const useApproval = (hackathonId) => {
  const [teams, setTeams] = useState([]);
  const [teamDetails, setTeamDetails] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [loadingTeamDetailIds, setLoadingTeamDetailIds] = useState([]);

  const fetchTeams = useCallback(async (status = 'PENDING') => {
    if (!hackathonId) return;
    setIsLoading(true);
    try {
      const data = await approvalService.getTeamsForApproval(hackathonId, status);
      setTeams(data.filter(Boolean));
    } catch (error) {
      notification.error({
        message: 'Lỗi tải dữ liệu',
        description: getTeamErrorMessage(error, 'Không thể lấy danh sách đội thi.'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  const loadTeamDetail = useCallback(async (teamId) => {
    if (!teamId || teamDetails[teamId]) return;

    setLoadingTeamDetailIds((prev) => [...prev, teamId]);
    try {
      const detail = await approvalService.getTeamDetail(teamId);
      setTeamDetails((prev) => ({ ...prev, [teamId]: detail }));
    } catch (error) {
      notification.error({
        message: 'Không thể tải chi tiết đội',
        description: getTeamErrorMessage(error, 'Vui lòng thử lại sau.'),
      });
    } finally {
      setLoadingTeamDetailIds((prev) => prev.filter((id) => id !== teamId));
    }
  }, [teamDetails]);

  const removeTeamFromState = (teamId) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId));
    setTeamDetails((prev) => {
      const next = { ...prev };
      delete next[teamId];
      return next;
    });
  };

  const handleApprove = async (teamId) => {
    setIsActionLoading(true);
    try {
      await approvalService.approveTeam(teamId);
      message.success('Đã duyệt đội thành công.');
      removeTeamFromState(teamId);
      return true;
    } catch (error) {
      message.error(getTeamErrorMessage(error, 'Duyệt đội thất bại.'));
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReject = async (teamId, reason) => {
    setIsActionLoading(true);
    try {
      await approvalService.rejectTeam(teamId, reason);
      message.success('Đã từ chối đội.');
      removeTeamFromState(teamId);
      return true;
    } catch (error) {
      message.error(getTeamErrorMessage(error, 'Có lỗi xảy ra khi từ chối đội.'));
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDisband = async (teamId) => {
    setIsActionLoading(true);
    try {
      await approvalService.disbandTeam(teamId);
      message.success('Đã giải tán đội thành công.');
      removeTeamFromState(teamId);
      return true;
    } catch (error) {
      notification.error({
        message: 'Không thể giải tán',
        description: getTeamErrorMessage(error, 'Đội đang có ràng buộc dữ liệu.'),
      });
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkApprove = async (teamIds) => {
    setIsActionLoading(true);
    try {
      const res = await approvalService.bulkApproveTeams(hackathonId, teamIds);
      const payload = res?.data ?? res ?? {};
      const approvedCount = payload.approvedCount ?? payload.approved_count ?? 0;
      const errors = payload.errors ?? [];
      await fetchTeams('PENDING');
      if (errors.length > 0) {
        notification.warning({
          message: `Đã duyệt ${approvedCount}/${teamIds.length} đội`,
          description: errors.slice(0, 5).join(' · '),
          duration: 8,
        });
        return approvedCount > 0;
      }
      message.success(`Đã duyệt ${approvedCount}/${teamIds.length} đội.`);
      return true;
    } catch (error) {
      message.error(getTeamErrorMessage(error, 'Có lỗi xảy ra khi duyệt hàng loạt.'));
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    teams,
    teamDetails,
    isLoading,
    isActionLoading,
    loadingTeamDetailIds,
    fetchTeams,
    loadTeamDetail,
    handleApprove,
    handleReject,
    handleDisband,
    handleBulkApprove,
  };
};
