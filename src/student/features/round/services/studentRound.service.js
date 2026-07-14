import axiosClient from '../../../../shared/api/axiosClient';

const emptyDeadline = () => ({
  roundId: undefined,
  deadline: undefined,
  problemReleased: false,
});

export const studentRoundService = {
  getCurrentDeadline: async (hackathonId) => {
    try {
      return await axiosClient.get('/api/v1/me/rounds/current/deadline', {
        params: hackathonId ? { hackathonId } : undefined,
      });
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      // GĐ2: prelim chưa active → 404; wrong role → 403
      if (status === 404 || status === 403) {
        return emptyDeadline();
      }
      throw err;
    }
  },

  getProblem: async (roundId) => axiosClient.get(`/api/v1/me/rounds/${roundId}/problem`),

  downloadProblemStatement: async (roundId) =>
    axiosClient.get(`/api/v1/me/rounds/${roundId}/problem-statement`, {
      responseType: 'blob',
    }),

  getFinalRound: async (hackathonId) =>
    axiosClient.get(`/api/v1/me/hackathons/${hackathonId}/final-round`),
};
