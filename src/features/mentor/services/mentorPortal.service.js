import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const mentorPortalService = {
  getTeamAssignments: async (roundId) => {
    const res = await axiosClient.get(ENDPOINTS.MENTOR_PORTAL.TEAM_ASSIGNMENTS, {
      params: roundId ? { roundId } : undefined,
    });
    return unwrapList(res);
  },

  getPresentationSlot: async (teamId) => {
    return axiosClient.get(ENDPOINTS.MENTOR_PORTAL.PRESENTATION_SLOT(teamId));
  },

  getFinalRoundSchedule: async (roundId) => {
    return axiosClient.get(ENDPOINTS.MENTOR_PORTAL.ROUND_SCHEDULE(roundId));
  },

  getHackathonRankings: async (hackathonId) => {
    return axiosClient.get(ENDPOINTS.MENTOR_PORTAL.HACKATHON_RANKINGS(hackathonId));
  },

  getHistory: async (year) => {
    const res = await axiosClient.get(ENDPOINTS.MENTOR_PORTAL.HISTORY, {
      params: year ? { year } : undefined,
    });
    if (res?.items) return res.items;
    return unwrapList(res);
  },

  getTrackAssignments: async () => {
    const res = await axiosClient.get(ENDPOINTS.MENTOR_PORTAL.TRACK_ASSIGNMENTS);
    return unwrapList(res);
  },
};
