import axiosClient from "../../../shared/api/axiosClient";

export const hackathonResultsService = {
  getTeamRankings: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/team-rankings`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (e) {
      return [];
    }
  },

  getChapterRankings: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/chapter-rankings`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (e) {
      return [];
    }
  },

  getIndividualRankings: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/individual-rankings`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (e) {
      return [];
    }
  },

  getPrizes: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/prizes`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (e) {
      return [];
    }
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

  // === HELPER APIs (Lấy Data cho Modal) ===

  getHackathonRounds: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/rounds`);
      if (Array.isArray(response)) return response;
      if (response?.data && Array.isArray(response.data)) return response.data;
      if (response?.items && Array.isArray(response.items)) return response.items;
      return [];
    } catch (e) {
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
    } catch (e) {
      return [];
    }
  }
};
