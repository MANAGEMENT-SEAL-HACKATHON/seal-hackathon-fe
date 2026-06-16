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
    return mapTiebreakItems(response);
  },

  getWildcardCandidates: async (roundId) => {
    const response = await axiosClient.get(`/api/v1/rounds/${roundId}/wildcard-candidates`);
    return mapWildcardCandidates(response);
  },

  decideWildcardReview: (reviewId, { approved, note }) =>
    axiosClient.patch(`/api/v1/wildcard-reviews/${reviewId}`, {
      coordinatorApproved: approved,
      coordinatorNote: note,
    }),
};

