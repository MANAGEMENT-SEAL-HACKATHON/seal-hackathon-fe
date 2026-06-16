// src/features/teams/services/teamService.js
import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const teamService = {
  // Lấy danh sách đội (Sẽ dùng để lấy danh sách đội ACTIVE để bốc thăm)
  listByHackathon: async (hackathonId, params) => {
    // Trả về danh sách teams theo hackathon, có thể truyền params { status: 'ACTIVE' }
    return axiosClient.get(ENDPOINTS.TEAMS.BASE, { params: { hackathonId, ...params } });
  },

  // Lấy chi tiết đội
  getById: async (teamId) => {
    return axiosClient.get(ENDPOINTS.TEAMS.DETAIL(teamId));
  },

  // GĐ2 - FR-13B: Bốc thăm Track (Lottery)
  runLottery: async (hackathonId, payload) => {
    // BE đã update, chỉ cần gửi Body JSON chuẩn
    return axiosClient.patch(ENDPOINTS.HACKATHONS.LOTTERY(hackathonId), payload);
  },

  // GĐ2 - FR-13B-R: Đổi Track (Re-lottery)
  changeTrack: async (teamId, roundId, trackId) => {
    const payload = { 
      trackId: Number(trackId), 
      track_id: Number(trackId) 
    };
    return axiosClient.patch(ENDPOINTS.TEAMS.UPDATE_TRACK(teamId, roundId), payload, {
      params: payload // Gắn luôn trackId lên thanh URL để BE dễ bắt
    });
  },

  // GĐ2 - FR-13C: Gán Mentor cho đội
  assignMentor: async (teamId, roundId, mentorId) => {
    return axiosClient.post(ENDPOINTS.TEAMS.MENTOR(teamId, roundId), { mentorId });
  },

  // GĐ2 - FR-13C: Gỡ Mentor khỏi đội
  removeMentor: async (teamId, roundId) => {
    return axiosClient.delete(ENDPOINTS.TEAMS.MENTOR(teamId, roundId));
  },
};