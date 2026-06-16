/**
 * Hook: useTeamActions
 * Chức năng: Cung cấp các hàm xử lý hành động (Mutation) như: Tạo đội, Mời thành viên, Rời đội, Chuyển quyền và Giải tán đội.
 */
import { useState } from 'react';
import { message, notification } from 'antd';
import { getStudentTeamErrorMessage } from '../constants/studentTeam.constants';
import { studentTeamService } from '../services/studentTeam.service';

const getCurrentUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

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

const isKnownUnauthorizedCreator = (userInfo) => {
  if (!userInfo?.role && !userInfo?.status) return false;
  return userInfo.role !== 'STUDENT' || userInfo.status !== 'APPROVED';
};

const normalizeEmail = (email) => email?.trim().toLowerCase();

const getCurrentUserId = () => {
  const userInfo = getCurrentUserInfo();
  return userInfo.userId || userInfo.id || null;
};

export const useTeamActions = ({ teams, fetchTeams, refreshSelectedTeam, setHackathonId }) => {
  const [isActionLoading, setIsActionLoading] = useState(false);

  const createTeam = async (payload) => {
    const userInfo = getCurrentUserInfo();
    if (isKnownUnauthorizedCreator(userInfo)) {
      showLargeTeamNotice({
        type: 'warning',
        message: 'Chưa thể tạo đội',
        description: `Tài khoản cần là sinh viên đã được phê duyệt. Trạng thái hiện tại: ${userInfo.status || 'chưa xác định'}.`,
      });
      return false;
    }

    setIsActionLoading(true);
    try {
      await studentTeamService.createTeam(payload);
      if (setHackathonId) setHackathonId(payload.hackathonId || '');
      await fetchTeams();
      message.success('Đã tạo đội thành công.');
      return true;
    } catch (error) {
      showLargeTeamNotice({
        message: 'Tạo đội không thành công',
        description: getStudentTeamErrorMessage(error, 'Tạo đội thất bại. Vui lòng kiểm tra lại quyền tài khoản và hackathon.'),
      });
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const inviteMember = async (teamId, email) => {
    const targetTeam = teams.find((team) => team.id === teamId);
    const inviteEmail = email?.trim();
    const existingMember = targetTeam?.members?.find((member) => {
      const isClosedStatus = member.status === 'REJECTED' || member.status === 'LEFT';
      return normalizeEmail(member.email) === normalizeEmail(inviteEmail) && !isClosedStatus;
    });

    if (existingMember) {
      showLargeTeamNotice({
        type: 'warning',
        message: 'Chưa thể gửi lời mời',
        description:
          existingMember.status === 'PENDING'
            ? 'Thành viên này đã có lời mời đang chờ phản hồi trong đội.'
            : 'Thành viên này đã có trong đội hiện tại.',
      });
      return false;
    }

    setIsActionLoading(true);
    try {
      await studentTeamService.inviteMember(teamId, inviteEmail);
      if (refreshSelectedTeam) await refreshSelectedTeam(teamId);
      message.success('Đã gửi lời mời thành viên.');
      return true;
    } catch (error) {
      showLargeTeamNotice({
        message: 'Mời thành viên không thành công',
        description: getStudentTeamErrorMessage(error, 'Mời thành viên thất bại. Vui lòng kiểm tra lại email và trạng thái đội.'),
      });
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const cancelPendingInvite = async (teamId, userId) => {
    setIsActionLoading(true);
    try {
      await studentTeamService.cancelPendingInvite(teamId, userId);
      if (refreshSelectedTeam) await refreshSelectedTeam(teamId);
      message.success('Đã hủy lời mời đang chờ.');
      return true;
    } catch (error) {
      message.error(getStudentTeamErrorMessage(error, 'Không thể hủy lời mời.'));
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const leaveTeam = async (teamId) => {
    const targetTeam = teams.find((team) => team.id === teamId);
    const currentUserId = targetTeam?.currentMember?.userId || getCurrentUserId();

    if (!currentUserId) {
      showLargeTeamNotice({
        type: 'warning',
        message: 'Chưa thể rời đội',
        description: 'Không xác định được tài khoản hiện tại. Vui lòng đăng nhập lại rồi thử lại.',
      });
      return false;
    }

    setIsActionLoading(true);
    try {
      await studentTeamService.leaveTeam(teamId, currentUserId);
      await fetchTeams();
      message.success('Đã rời đội thành công.');
      return true;
    } catch (error) {
      showLargeTeamNotice({
        message: 'Không thể rời đội',
        description: getStudentTeamErrorMessage(error, 'Đội đã khóa hoặc bạn không có quyền rời đội này.'),
      });
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const transferLeader = async (teamId, newLeaderId) => {
    setIsActionLoading(true);
    try {
      await studentTeamService.transferLeader(teamId, newLeaderId);
      if (refreshSelectedTeam) await refreshSelectedTeam(teamId);
      message.success('Đã chuyển quyền trưởng nhóm.');
      return true;
    } catch (error) {
      message.error(getStudentTeamErrorMessage(error, 'Chuyển quyền thất bại.'));
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  const disbandTeam = async (teamId) => {
    setIsActionLoading(true);
    try {
      await studentTeamService.disbandTeam(teamId);
      await fetchTeams();
      message.success('Đã giải tán đội.');
      return true;
    } catch (error) {
      notification.error({
        message: 'Không thể giải tán đội',
        description: getStudentTeamErrorMessage(error, 'Đội đang có ràng buộc nghiệp vụ.'),
      });
      return false;
    } finally {
      setIsActionLoading(false);
    }
  };

  return {
    isActionLoading,
    createTeam,
    inviteMember,
    cancelPendingInvite,
    leaveTeam,
    transferLeader,
    disbandTeam,
  };
};

