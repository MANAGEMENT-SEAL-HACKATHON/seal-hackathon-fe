import axiosClient from '../../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../../shared/api/endpoints';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.hackathons)) return res.hackathons;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const studentPortalService = {
  getHistory: async () => {
    const res = await axiosClient.get(ENDPOINTS.STUDENT_PORTAL.HISTORY);
    if (res?.hackathons) return res.hackathons;
    return unwrapList(res);
  },

  getAnnualAwards: async (year) => {
    const res = await axiosClient.get(ENDPOINTS.STUDENT_PORTAL.ANNUAL_AWARDS, {
      params: year ? { year } : undefined,
    });
    return unwrapList(res);
  },

  uploadAppealEvidence: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(ENDPOINTS.STUDENT_PORTAL.APPEAL_EVIDENCE, formData);
  },

  createAppeal: async ({ teamId, roundId, reason, evidenceUrl, evidences }) => {
    const body = {
      teamId: Number(teamId),
      roundId: Number(roundId),
      reason,
    };
    if (Array.isArray(evidences) && evidences.length > 0) {
      body.evidences = evidences;
    } else if (evidenceUrl) {
      body.evidenceUrl = evidenceUrl;
    }
    return axiosClient.post(ENDPOINTS.STUDENT_PORTAL.APPEALS, body);
  },

  listMyAppeals: async () => {
    const res = await axiosClient.get(ENDPOINTS.STUDENT_PORTAL.APPEALS);
    return unwrapList(res);
  },

  selectFallTrack: async (trackId) => {
    return axiosClient.post(ENDPOINTS.STUDENT_PORTAL.TRACK_SELECT(trackId), {});
  },

  listSelectableFallTracks: async (hackathonId) => {
    const res = await axiosClient.get(ENDPOINTS.STUDENT_PORTAL.SELECTABLE_TRACKS(hackathonId));
    return unwrapList(res);
  },

  relotteryTrackAsStudent: async (teamId, roundId, trackId) => {
    return axiosClient.patch(ENDPOINTS.STUDENT_PORTAL.RELOTTERY_TRACK(teamId, roundId), {
      trackId: Number(trackId),
    });
  },
};
