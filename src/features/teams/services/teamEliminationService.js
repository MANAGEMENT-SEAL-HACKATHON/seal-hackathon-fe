import axiosClient from "../../../shared/api/axiosClient";

const getEliminateTeamUrl = (teamId) => `/api/v1/teams/${teamId}/eliminate`;

export const teamEliminationService = {
  eliminateTeam: async (teamId, reason) => {
    return axiosClient.patch(getEliminateTeamUrl(teamId), {
      reason: reason.trim(),
    });
  },
};
