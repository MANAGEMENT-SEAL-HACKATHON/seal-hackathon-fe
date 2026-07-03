import axiosClient from "../../../shared/api/axiosClient";

export const hackathonResultsService = {
  getTeamRankings: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/team-rankings`);
    return Array.isArray(response) ? response : (response?.items || response?.rankings || response?.data || []);
  },

  getChapterRankings: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/chapter-rankings`);
    return Array.isArray(response) ? response : (response?.items || response?.rankings || response?.data || []);
  },

  getIndividualRankings: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/individual-rankings`);
    return Array.isArray(response) ? response : (response?.items || response?.rankings || response?.data || []);
  },

  getPrizes: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/prizes`);
    return Array.isArray(response) ? response : (response?.items || response?.prizes || response?.data || []);
  },

  // === MUTATION APIs (WRITE) ===

  awardPrize: async (hackathonId, payload) => {
    const response = await axiosClient.post(`/api/v1/hackathons/${hackathonId}/prizes`, payload);
    return response.data;
  },

  confirmClosure: async (hackathonId, note) => {
    const response = await axiosClient.patch(`/api/v1/hackathons/${hackathonId}/confirm`, { confirm: true, note });
    return response.data;
  },

  revokePrize: async (prizeId) => {
    await axiosClient.delete(`/api/v1/prizes/${prizeId}`);
  },

  createExportJob: async (hackathonId, payload = { type: 'CSV_RANKINGS' }) => {
    const response = await axiosClient.post(`/api/v1/hackathons/${hackathonId}/export-jobs`, payload);
    return response?.data ?? response;
  },

  getExportJobStatus: async (jobId) => {
    const response = await axiosClient.get(`/api/v1/export-jobs/${jobId}`);
    return response?.data ?? response;
  },

  downloadExportFile: async (jobId) => {
    return axiosClient.get(`/api/v1/export-jobs/${jobId}/download`, { responseType: 'blob' });
  },

  // === HELPER APIs (Lấy Data cho Modal) ===

  getHackathonRounds: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/rounds`);
      if (Array.isArray(response)) return response;
      if (response?.data && Array.isArray(response.data)) return response.data;
      if (response?.items && Array.isArray(response.items)) return response.items;
      return [];
    } catch (_e) {
      return [];
    }
  },

  getHackathonTeams: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/teams`, { params: { hackathonId, size: 1000 } });
      if (Array.isArray(response)) return response;
      if (response?.data && Array.isArray(response.data)) return response.data;
      if (response?.items && Array.isArray(response.items)) return response.items;
      return [];
    } catch (_e) {
      return [];
    }
  }
};
