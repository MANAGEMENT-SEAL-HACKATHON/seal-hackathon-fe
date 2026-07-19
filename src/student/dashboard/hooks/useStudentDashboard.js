import { useCallback, useEffect, useState } from 'react';
import { Modal, notification } from 'antd';
import { userService } from '../../../features/auth/services/userService';
import { studentTeamService } from '../../features/team/services/studentTeam.service';
import { studentHackathonService } from '../../features/hackathon/services/studentHackathon.service';
import { roundService } from '../../../features/rounds/services/roundService';
import { eventService } from '../../../features/events/services/eventService';
import { mapRoundToFE } from '../../../features/rounds/mappers/roundMapper';

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
  const [nextAction, setNextAction] = useState(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
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
      setNextAction(null);
      setUpcomingDeadlines([]);
      return;
    }

    setIsTeamLoading(true);
    try {
      const nextTeams = (await studentTeamService.getMyTeams()).filter(
        (team) =>
          team.currentMember?.isAccepted &&
          ['PENDING', 'ACTIVE'].includes(team.status),
      );

      let primaryHackathonId = nextTeams[0]?.hackathonId;
      if (!primaryHackathonId) {
        const registered = await studentHackathonService.getRegisteredHackathons('ONGOING');
        primaryHackathonId = registered[0]?.id;
      }
      if (!primaryHackathonId) {
        const pendingConfirm = await studentHackathonService.getRegisteredHackathons('PENDING_CONFIRM');
        primaryHackathonId = pendingConfirm[0]?.id;
      }

      if (!primaryHackathonId) {
        setActiveHackathon(null);
        setTeams([]);
        setNextAction({ title: 'Đăng ký / tham gia sự kiện', detail: 'Chưa có hackathon đang gắn với đội của bạn.' });
        setUpcomingDeadlines([]);
        return;
      }

      const hackathon = await studentHackathonService.getHackathonDetail(primaryHackathonId);
      setActiveHackathon(hackathon);
      setTeams(
        nextTeams.filter((team) => Number(team.hackathonId) === Number(primaryHackathonId))
      );

      const [roundsRaw, eventsRaw] = await Promise.all([
        roundService.listByHackathon(primaryHackathonId).catch(() => []),
        eventService.listByHackathon(primaryHackathonId).catch(() => []),
      ]);
      const rounds = (Array.isArray(roundsRaw) ? roundsRaw : roundsRaw?.items || []).map(mapRoundToFE);
      const activeRound =
        rounds.find((r) => r.is_active && !r.submission_closed) ||
        rounds.find((r) => r.is_active) ||
        null;
      const submitDeadline =
        activeRound?.submission_deadline ||
        activeRound?.submissionDeadline ||
        activeRound?.end_time ||
        null;
      if (activeRound) {
        setNextAction({
          title: `Vòng đang mở: ${activeRound.name || activeRound.roundName}`,
          detail: submitDeadline
            ? `Hạn nộp: ${new Date(submitDeadline).toLocaleString('vi-VN')}`
            : 'Theo dõi hạn nộp trong trang đội / vòng thi.',
        });
      } else {
        setNextAction({
          title: 'Chưa có vòng đang mở nộp bài',
          detail: 'Theo dõi lịch trình sự kiện hoặc kết quả đã công bố.',
        });
      }

      const now = Date.now();
      const events = (Array.isArray(eventsRaw) ? eventsRaw : eventsRaw?.items || [])
        .map((e) => ({
          name: e.name || e.eventName || e.title,
          start: e.startTime || e.startAt || e.start_time,
        }))
        .filter((e) => e.start && new Date(e.start).getTime() >= now - 3600_000)
        .sort((a, b) => new Date(a.start) - new Date(b.start))
        .slice(0, 5);
      setUpcomingDeadlines(events);
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
    nextAction,
    upcomingDeadlines,
    isLoading,
    isTeamLoading,
    isRefreshing,
    refreshProfile,
    refreshHackathonAndTeam,
  };
};
