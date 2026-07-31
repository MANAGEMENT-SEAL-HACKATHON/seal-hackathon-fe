/**
 * Service: Student Invitation
 * Chức năng: Đảm nhiệm việc kết nối API để lấy danh sách lời mời và phản hồi (Đồng ý/Từ chối) lên Backend.
 */
import axiosClient from '../../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../../shared/api/endpoints';
import { mapTeamToInvitation } from '../mapper/studentInvitation.mapper';
import { studentHackathonService } from '../../hackathon/services/studentHackathon.service';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
};

export const studentInvitationService = {
  /** Chỉ dùng hackathon đã đăng ký — không fallback ONGOING đầu tiên. */
  getActiveHackathon: async () => studentHackathonService.getPrimaryRegisteredHackathon(),

  getInvitations: async ({ hackathonId, status } = {}) => {
    if (!hackathonId) return [];
    const res = await axiosClient.get(ENDPOINTS.TEAMS.BASE, {
      params: { hackathonId, status },
    });
    return unwrapList(res).map(mapTeamToInvitation).filter(Boolean);
  },

  respondInvitation: async ({ teamId, userId, action }) => {
    return axiosClient.patch(ENDPOINTS.TEAMS.MEMBER_DETAIL(teamId, userId), { action });
  },
};
