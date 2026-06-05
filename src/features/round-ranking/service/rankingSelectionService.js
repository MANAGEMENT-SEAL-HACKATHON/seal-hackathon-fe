import axiosClient from "../../../shared/api/axiosClient";
import { ENDPOINTS } from "../../../shared/api/endpoints";

const extractList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getHackathonName = (hackathon) =>
  hackathon.hackathonName || hackathon.name || `Hackathon #${hackathon.id}`;

const getRoundName = (round) =>
  round.name || round.roundName || `Round #${round.id}`;

export const rankingSelectionService = {
  getHackathons: async () => {
    const response = await axiosClient.get(ENDPOINTS.HACKATHONS.BASE);
    return extractList(response).filter(Boolean).map((hackathon) => ({
      id: hackathon.id,
      name: getHackathonName(hackathon),
      status: hackathon.status,
    }));
  },

  getRoundsByHackathon: async (hackathonId) => {
    const response = await axiosClient.get(ENDPOINTS.HACKATHONS.ROUNDS(hackathonId));
    return extractList(response).filter(Boolean).map((round) => ({
      id: round.id,
      name: getRoundName(round),
      isFinal: Boolean(round.isFinal ?? round.is_final),
      isActive: Boolean(round.isActive ?? round.is_active),
    }));
  },
};
