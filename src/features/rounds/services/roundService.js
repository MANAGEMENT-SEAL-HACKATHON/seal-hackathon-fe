import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const roundService = {
  listByHackathon: async (hackathonId) => {
    return axiosClient.get(ENDPOINTS.HACKATHONS.ROUNDS(hackathonId));
  },
  
  getById: async (id) => {
    return axiosClient.get(ENDPOINTS.ROUNDS.DETAIL(id));
  },
  
  createByHackathon: async (hackathonId, data) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.ROUNDS(hackathonId), data);
  },
  
  update: async (id, data) => {
    return axiosClient.put(ENDPOINTS.ROUNDS.DETAIL(id), data);
  },
  
  delete: async (id) => {
    return axiosClient.delete(ENDPOINTS.ROUNDS.DETAIL(id));
  },
  
  // ==========================================
  // BƯỚC 1: API Kích hoạt Vòng thi
  // ==========================================
  activate: async (id, data = {}) => {
    return axiosClient.patch(ENDPOINTS.ROUNDS.ACTIVATE(id), data);
  },

  // ==========================================
  // BƯỚC 8: API Khóa chấm điểm (Dùng endpoint theo logic BE)
  // ==========================================
  lockScoring: async (id, payload) => {
    return axiosClient.patch(`/api/v1/rounds/${id}/lock-scoring`, payload);
  }
};