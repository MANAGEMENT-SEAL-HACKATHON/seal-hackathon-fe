import axiosClient from "../../../../shared/api/axiosClient";

export const studentResultsService = {
  getRoundLeaderboard: async (roundId) => {
    try {
      const response = await axiosClient.get(`/api/v1/me/rounds/${roundId}/leaderboard`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getPublicScoreboard: async (roundId) => {
    try {
      const response = await axiosClient.get(`/api/v1/rounds/${roundId}/scoreboard`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getHackathonRankings: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/me/hackathons/${hackathonId}/rankings`);
      return Array.isArray(response) ? response : (response?.items || response?.data || []);
    } catch (e) {
      return [];
    }
  },

  getMyPrizes: async () => {
    try {
      const response = await axiosClient.get(`/api/v1/me/prizes`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (e) {
      return [];
    }
  },

  getMyCertificates: async () => {
    try {
      const response = await axiosClient.get(`/api/v1/me/certificates`);
      return Array.isArray(response) ? response : (response?.data || []);
    } catch (e) {
      return [];
    }
  }
};
