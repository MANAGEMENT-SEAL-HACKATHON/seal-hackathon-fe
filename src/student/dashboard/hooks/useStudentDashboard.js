import { useCallback, useEffect, useState } from 'react';
import { Modal, notification } from 'antd';
import { userService } from '../../../features/auth/services/userService';
import { studentTeamService } from '../../features/team/services/studentTeam.service';

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const normalizeProfile = (response) => {
  const profile = response?.data || response || {};
  const storedUser = getStoredUser();

  return {
    ...storedUser,
    ...profile,
    userId: profile.userId || profile.id || storedUser.userId,
    fullName: profile.fullName || storedUser.fullName,
  };
};

const isApprovedStudent = (user) => user?.role === 'STUDENT' && user?.status === 'APPROVED';

export const useStudentDashboard = () => {
  const [user, setUser] = useState(getStoredUser);
  const [activeHackathon, setActiveHackathon] = useState(null);
  const [teams, setTeams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      const storedUser = getStoredUser();
      const nextUser = normalizeProfile(await userService.getMe());

      if (storedUser.status && storedUser.status !== 'APPROVED' && nextUser.status === 'APPROVED') {
        Modal.success({
          title: 'Hồ sơ đã được phê duyệt',
          content: 'Tài khoản của bạn vừa được cấp quyền chính thức. Vui lòng đăng nhập lại để hệ thống cập nhật phiên bảo mật mới nhất.',
          okText: 'Đăng nhập lại ngay',
          onOk: () => {
            localStorage.clear();
            window.location.href = '/login';
          },
          keyboard: false,
          maskClosable: false,
        });
        return null;
      }

      localStorage.setItem('userInfo', JSON.stringify(nextUser));
      setUser(nextUser);
      window.dispatchEvent(new Event('userInfoUpdated'));
      return nextUser;
    } catch {
      if (!silent) {
        notification.error({
          message: 'Không thể cập nhật hồ sơ',
          description: 'Vui lòng thử lại sau hoặc đăng nhập lại nếu phiên làm việc đã hết hạn.',
          placement: 'top',
        });
      }
      return null;
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const refreshHackathonAndTeam = useCallback(async (profile) => {
    if (!isApprovedStudent(profile)) {
      setTeams([]);
      setActiveHackathon(null);
      return;
    }

    setIsTeamLoading(true);
    try {
      const hackathon = await studentTeamService.getActiveHackathon();
      setActiveHackathon(hackathon);

      if (!hackathon?.id) {
        setTeams([]);
        return;
      }

      const nextTeams = await studentTeamService.getMyTeams({ hackathonId: hackathon.id });
      setTeams(
        nextTeams.filter(
          (team) => team.currentMember?.isAccepted && team.status !== 'REJECTED' && team.status !== 'ELIMINATED'
        )
      );
    } catch {
      setTeams([]);
    } finally {
      setIsTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      const nextUser = await refreshProfile({ silent: true });
      await refreshHackathonAndTeam(nextUser || getStoredUser());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshProfile, refreshHackathonAndTeam]);

  useEffect(() => {
    const syncFromStorage = () => setUser(getStoredUser());
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshProfile({ silent: true }).then((nextUser) => refreshHackathonAndTeam(nextUser || getStoredUser()));
      }
    };

    window.addEventListener('userInfoUpdated', syncFromStorage);
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.removeEventListener('userInfoUpdated', syncFromStorage);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [refreshProfile, refreshHackathonAndTeam]);

  return {
    user,
    activeHackathon,
    selectedTeam: teams[0] || null,
    isLoading,
    isTeamLoading,
    isRefreshing,
    refreshProfile,
    refreshHackathonAndTeam,
  };
};
