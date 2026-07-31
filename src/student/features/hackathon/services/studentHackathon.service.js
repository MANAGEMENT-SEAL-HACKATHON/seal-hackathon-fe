import axiosClient from '../../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  return [];
};

const unwrapItem = (res) => res?.data || res || null;

export const studentHackathonService = {
  browse: async (status = 'ONGOING') => {
    const res = await axiosClient.get(ENDPOINTS.STUDENT_HACKATHONS.BROWSE, {
      params: status ? { status } : undefined,
    });
    return unwrapList(res);
  },

  getRegisteredHackathons: async (status = 'ONGOING') => {
    const items = await studentHackathonService.browse(status);
    return items.filter((item) => item.registered);
  },

  /** Hackathon sinh viên đã đăng ký — ưu tiên ONGOING có team ACTIVE, sau đó PENDING_CONFIRM, cuối cùng fallback */
  getPrimaryRegisteredHackathon: async (status) => {
    try {
      const [allHackathons, teamsRes] = await Promise.all([
        studentHackathonService.browse(status),
        axiosClient.get('/api/v1/me/teams').catch(() => []),
      ]);
      const registered = allHackathons.filter((item) => item.registered);
      if (!registered.length) return null;

      const teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || teamsRes?.data || [];

      // 1. Ưu tiên hackathon ONGOING có team ACTIVE
      for (const hack of registered) {
        if (String(hack.status || '').toUpperCase() === 'ONGOING') {
          const hasActiveTeam = teams.some(
            (t) => Number(t.hackathonId) === Number(hack.id) && String(t.status || '').toUpperCase() === 'ACTIVE'
          );
          if (hasActiveTeam) {
            return studentHackathonService.getHackathonDetail(hack.id);
          }
        }
      }

      // 2. Sau đó ưu tiên hackathon PENDING_CONFIRM
      const pendingConfirmHack = registered.find(
        (hack) => String(hack.status || '').toUpperCase() === 'PENDING_CONFIRM'
      );
      if (pendingConfirmHack) {
        return studentHackathonService.getHackathonDetail(pendingConfirmHack.id);
      }

      // 3. Sau đó ưu tiên hackathon ONGOING bất kỳ
      const ongoingHack = registered.find(
        (hack) => String(hack.status || '').toUpperCase() === 'ONGOING'
      );
      if (ongoingHack) {
        return studentHackathonService.getHackathonDetail(ongoingHack.id);
      }

      // 4. Fallback dùng phần tử đầu tiên
      return studentHackathonService.getHackathonDetail(registered[0].id);
    } catch {
      return null;
    }
  },

  getHackathonDetail: async (hackathonId) => {
    if (!hackathonId) return null;
    try {
      const detail = await axiosClient.get(ENDPOINTS.HACKATHONS.DETAIL(hackathonId));
      return unwrapItem(detail);
    } catch {
      return { id: hackathonId };
    }
  },

  register: async (hackathonId, body) => {
    const payload =
      body && (body.preferredShirtSize || body.preferredShirtFit)
        ? {
            preferredShirtSize: body.preferredShirtSize || undefined,
            preferredShirtFit: body.preferredShirtFit || undefined,
          }
        : undefined;
    return axiosClient.post(ENDPOINTS.STUDENT_HACKATHONS.REGISTER(hackathonId), payload);
  },

  unregister: async (hackathonId) => {
    return axiosClient.delete(ENDPOINTS.STUDENT_HACKATHONS.REGISTER(hackathonId));
  },
};
