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

  createAppeal: async ({ teamId, roundId, reason, evidenceUrl }) => {
    return axiosClient.post(ENDPOINTS.STUDENT_PORTAL.APPEALS, {
      teamId: Number(teamId),
      roundId: Number(roundId),
      reason,
      evidenceUrl: evidenceUrl || undefined,
    });
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

  downloadCertificate: async (certificateId, download = true) => {
    return axiosClient.get(ENDPOINTS.STUDENT_PORTAL.CERTIFICATE_DOWNLOAD(certificateId), {
      params: { download },
      responseType: 'blob',
    });
  },
};
