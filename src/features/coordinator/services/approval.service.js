import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import { mapTeamForCoordinator } from '../mappers/coordinatorTeam.mapper';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  return [];
};

const unwrapItem = (res) => res?.data || res || null;

export const approvalService = {
  getTeamsForApproval: async (hackathonId, status = 'PENDING') => {
    const params = { hackathonId, status };
    const res = await axiosClient.get(ENDPOINTS.TEAMS.BASE, { params });
    return unwrapList(res).map(mapTeamForCoordinator);
  },

  getTeamDetail: async (teamId) => {
    const res = await axiosClient.get(ENDPOINTS.TEAMS.DETAIL(teamId));
    return mapTeamForCoordinator(unwrapItem(res));
  },

  approveTeam: async (teamId) => {
    return axiosClient.patch(ENDPOINTS.TEAMS.APPROVE(teamId));
  },

  rejectTeam: async (teamId, rejectionReason) => {
    const payload = { status: 'REJECTED', rejectionReason };
    return axiosClient.patch(ENDPOINTS.TEAMS.STATUS(teamId), payload);
  },

  bulkApproveTeams: async (hackathonId, teamIds) => {
    const payload = { hackathonId, teamIds };
    const res = await axiosClient.post(ENDPOINTS.TEAMS.BULK_APPROVE, payload);
    return unwrapItem(res);
  },

  disbandTeam: async (teamId) => {
    return axiosClient.delete(ENDPOINTS.TEAMS.DETAIL(teamId));
  },
};
