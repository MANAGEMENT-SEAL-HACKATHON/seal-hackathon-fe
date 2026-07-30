import axiosClient from "../../../../shared/api/axiosClient";
import { mapStudentLeaderboard, mapStudentScoreboard, mapFinalRankings } from "../mappers/studentResults.mapper";

export const studentResultsService = {
  getHackathonRankings: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/me/hackathons/${hackathonId}/rankings`);
    return mapFinalRankings(response);
  },

  getRoundLeaderboard: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/me/rounds/${roundId}/leaderboard`);
    return mapStudentLeaderboard(response);
  },

  getPublicScoreboard: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/scoreboard`);
    return mapStudentScoreboard(response);
  },

  getMyPrizes: async () => {
    const response = await axiosClient.get(`/api/v1/me/prizes`);
    return Array.isArray(response) ? response : (response?.items || response?.prizes || response?.data || []);
  },
};
