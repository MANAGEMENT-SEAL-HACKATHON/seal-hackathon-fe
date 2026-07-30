import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

const unwrapList = (res) => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

export const appealReviewService = {
  listByRound: async (roundId, status) => {
    const res = await axiosClient.get(ENDPOINTS.ROUNDS.APPEALS(roundId), {
      params: status ? { status } : undefined,
    });
    return unwrapList(res);
  },

  getById: (id) => axiosClient.get(ENDPOINTS.APPEALS.DETAIL(id)),

  claim: (id) => axiosClient.patch(ENDPOINTS.APPEALS.CLAIM(id)),

  review: (id, { decision, note }) =>
    axiosClient.patch(ENDPOINTS.APPEALS.REVIEW(id), {
      decision,
      note: note || undefined,
    }),
};
