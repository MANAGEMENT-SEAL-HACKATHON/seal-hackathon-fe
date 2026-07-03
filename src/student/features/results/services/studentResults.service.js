import axiosClient from "../../../../shared/api/axiosClient";
import { mapStudentLeaderboard, mapStudentScoreboard } from "../mappers/studentResults.mapper";

export const studentResultsService = {
  getRoundLeaderboard: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/me/rounds/${roundId}/leaderboard`);
    return mapStudentLeaderboard(response);
  },

  getPublicScoreboard: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/scoreboard`);
    return mapStudentScoreboard(response);
  },

  getHackathonRankings: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/me/hackathons/${hackathonId}/rankings`);
    return Array.isArray(response) ? response : (response?.items || response?.data || []);
  },

  getMyPrizes: async () => {
    const response = await axiosClient.get(`/api/v1/me/prizes`);
    return Array.isArray(response) ? response : (response?.items || response?.prizes || response?.data || []);
  },

  getMyCertificates: async () => {
    const response = await axiosClient.get(`/api/v1/me/certificates`);
    return Array.isArray(response) ? response : (response?.items || response?.certificates || response?.data || []);
  },

  getChapterRankings: async (hackathonId) => {
    try {
      const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/chapter-rankings`);
      return Array.isArray(response) ? response : response?.items || response?.data || [];
    } catch {
      return [];
    }
  },
};
