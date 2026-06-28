// src/features/round-results/services/roundResults.service.js
import axiosClient from "../../../shared/api/axiosClient";
import {
  mapOfficialRanking,
  mapTiebreakItems,
  mapWildcardCandidates,
} from "../mappers/roundResults.mapper";

export const roundResultsService = {
  getRanking: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/ranking`);
    return mapOfficialRanking(response);
  },

  getTiebreak: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/tiebreak`);
    // Trả về thẳng data thô chứa candidateTeamIds
    return response?.data !== undefined ? response.data : response;
  },

  getWildcardCandidates: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/wildcard-candidates`);
    return mapWildcardCandidates(response);
  },

  decideWildcardReview: (reviewId, { approved, note }) =>
    axiosClient.patch(`/api/v1/wildcard-reviews/${reviewId}`, {
      approved,
      coordinatorNote: note,
    }),

  publishRound: (roundId) =>
    axiosClient.patch(`/api/v1/rounds/${roundId}/publish`),

  advanceTeams: (roundId, payload) =>
    axiosClient.post(`/api/v1/rounds/${roundId}/advance`, payload),

  resolveTiebreak: (roundId, payload) =>
    axiosClient.post(`/api/v1/rounds/${roundId}/tiebreak/resolve`, payload),
};