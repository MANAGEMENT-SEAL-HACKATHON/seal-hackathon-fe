/**
 * Service: Student Team
 * Chức năng: Cung cấp các phương thức gọi API trực tiếp lên hệ thống Backend cho các nghiệp vụ liên quan đến Đội thi.
 */
import axiosClient from '../../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../../shared/api/endpoints';
import { mapStudentTeam } from '../mapper/studentTeam.mapper';

const MY_TEAMS_ENDPOINT = '/api/v1/me/teams';
const getTeamInvitesEndpoint = (teamId) => `/api/v1/teams/${teamId}/invites`;

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
};

const unwrapItem = (res) => res?.data || res || null;

export const studentTeamService = {
  getActiveHackathon: async () => {
    const res = await axiosClient.get('/api/v1/hackathons/active', { params: { size: 1 } });
    const items = unwrapList(res);
    return items.length > 0 ? items[0] : null;
  },

  getMyTeams: async () => {
    const res = await axiosClient.get(MY_TEAMS_ENDPOINT);
    const teamSummaries = unwrapList(res);

    const teams = await Promise.all(
      teamSummaries.map(async (summary) => {
        const teamId = summary.teamId ?? summary.id;

        try {
          const detail = await axiosClient.get(ENDPOINTS.TEAMS.DETAIL(teamId));
          return mapStudentTeam({ ...unwrapItem(detail), ...summary });
        } catch {
          return mapStudentTeam(summary);
        }
      })
    );

    return teams.filter(Boolean);
  },

  getTeamDetail: async (teamId) => {
    const res = await axiosClient.get(ENDPOINTS.TEAMS.DETAIL(teamId));
    return mapStudentTeam(unwrapItem(res));
  },

  createTeam: async ({ hackathonId, teamName }) => {
    const res = await axiosClient.post(MY_TEAMS_ENDPOINT, { hackathonId, teamName });
    return mapStudentTeam(unwrapItem(res));
  },

  inviteMember: async (teamId, email) => {
    return axiosClient.post(getTeamInvitesEndpoint(teamId), { email });
  },

  cancelPendingInvite: async (teamId, userId) => {
    return axiosClient.delete(ENDPOINTS.TEAMS.MEMBER_DETAIL(teamId, userId));
  },

  leaveTeam: async (teamId, userId) => {
    return axiosClient.patch(ENDPOINTS.TEAMS.MEMBER_DETAIL(teamId, userId), { action: 'LEFT' });
  },

  transferLeader: async (teamId, newLeaderId) => {
    const res = await axiosClient.patch(ENDPOINTS.TEAMS.TRANSFER_LEADER(teamId), { newLeaderId });
    return mapStudentTeam(unwrapItem(res));
  },

  disbandTeam: async (teamId) => {
    return axiosClient.delete(ENDPOINTS.TEAMS.DETAIL(teamId));
  },
};

