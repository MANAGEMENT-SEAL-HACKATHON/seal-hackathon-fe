import { useCallback, useEffect, useState } from 'react';
import { notification, Modal } from 'antd';
import { userService } from '../../../features/auth/services/userService';

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

export const useStudentDashboard = () => {
  const [user, setUser] = useState(getStoredUser);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshProfile = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsRefreshing(true);
    }

    try {
      const storedUser = getStoredUser();
      const nextUser = normalizeProfile(await userService.getMe());
      
      // Force token refresh if status changed to APPROVED
      if (storedUser.status && storedUser.status !== 'APPROVED' && nextUser.status === 'APPROVED') {
        Modal.success({
          title: '🎉 Hồ sơ đã được phê duyệt!',
          content: 'Tài khoản của bạn vừa được cấp quyền chính thức. Vui lòng đăng nhập lại để hệ thống cập nhật chứng chỉ bảo mật (Token) mới nhất cho bạn.',
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshProfile({ silent: true });
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshProfile]);

  useEffect(() => {
    const syncFromStorage = () => setUser(getStoredUser());
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshProfile({ silent: true });
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
  }, [refreshProfile]);

  return {
    user,
    isLoading,
    isRefreshing,
    refreshProfile,
  };
};
