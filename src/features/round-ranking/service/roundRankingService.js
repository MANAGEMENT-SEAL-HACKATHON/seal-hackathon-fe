import axiosClient from "../../../shared/api/axiosClient";
import { mapRankingPreviewItems } from "./rankingPreviewMapper";

const getRankingPreviewUrl = (roundId) => `/api/v1/rounds/${roundId}/ranking/preview`;

export const roundRankingService = {
  getRankingPreview: async (roundId) => {
    const response = await axiosClient.get(getRankingPreviewUrl(roundId));
    return mapRankingPreviewItems(response);
  },
};
