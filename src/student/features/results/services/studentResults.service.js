import axiosClient from "../../../../shared/api/axiosClient";
import { mapStudentScoreboard } from "../mappers/studentResults.mapper";

export const studentResultsService = {
  getPublicScoreboard: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/scoreboard`);
    return mapStudentScoreboard(response);
  },

  getStudentLeaderboard: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/me/rounds/${roundId}/leaderboard`);
    return mapStudentScoreboard(response);
  },
};
