/**
 * Hook: useStudentInvitations
 * Chức năng: Quản lý trạng thái và thao tác dữ liệu (Fetch/Respond) cho danh sách lời mời gia nhập đội của sinh viên.
 */
import { useCallback, useMemo, useState, useEffect } from 'react';
import { message, notification } from 'antd';
import { getInvitationErrorMessage } from '../constants/studentInvitation.constants';
import { studentInvitationService } from '../services/studentInvitation.service';

const notifyError = (title, error, fallback) => {
  notification.error({
    message: title,
    description: getInvitationErrorMessage(error, fallback),
    placement: 'top',
    duration: 6,
    style: { width: 420, maxWidth: 'calc(100vw - 32px)', borderRadius: 14 },
  });
};

export const useStudentInvitations = () => {
  const [hackathonId, setHackathonId] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionKey, setActionKey] = useState('');

  const pendingCount = useMemo(
    () => invitations.filter((item) => item.memberStatus === 'PENDING').length,
    [invitations]
  );

  const fetchInvitations = useCallback(async () => {
    setIsLoading(true);
    try {
      let currentHackathonId = hackathonId;
      if (!currentHackathonId) {
        const activeHackathon = await studentInvitationService.getActiveHackathon();
        if (activeHackathon && activeHackathon.id) {
          currentHackathonId = activeHackathon.id;
          setHackathonId(currentHackathonId);
        }
      }

      if (!currentHackathonId) {
        setInvitations([]);
        setIsLoading(false);
        return;
      }

      const data = await studentInvitationService.getInvitations({ hackathonId: currentHackathonId });
      setInvitations(data);
    } catch (error) {
      notifyError('Không thể tải lời mời', error, 'Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId]);

  const respondInvitation = async (invitation, action) => {
    const key = `${invitation.teamId}-${action}`;
    setActionKey(key);
    try {
      await studentInvitationService.respondInvitation({
        teamId: invitation.teamId,
        userId: invitation.userId,
        action,
      });
      await fetchInvitations();
      message.success('Đã cập nhật phản hồi lời mời.');
      return true;
    } catch (error) {
      notifyError('Không thể phản hồi lời mời', error, 'Thao tác thất bại. Vui lòng thử lại.');
      return false;
    } finally {
      setActionKey('');
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchInvitations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchInvitations]);

  return {
    hackathonId,
    invitations,
    pendingCount,
    isLoading,
    actionKey,
    fetchInvitations,
    respondInvitation,
  };
};

