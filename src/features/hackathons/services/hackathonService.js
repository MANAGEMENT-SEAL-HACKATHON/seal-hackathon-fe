import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const hackathonService = {
  search: async (params) => {
    return axiosClient.get(ENDPOINTS.HACKATHONS.BASE, { params });
  },
  
  getById: async (id) => {
    return axiosClient.get(ENDPOINTS.HACKATHONS.DETAIL(id));
  },
  
  create: async (data) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.BASE, data);
  },
  
  update: async (id, data) => {
    return axiosClient.put(ENDPOINTS.HACKATHONS.DETAIL(id), data);
  },
  
  delete: async (id) => {
    return axiosClient.delete(ENDPOINTS.HACKATHONS.DETAIL(id));
  },

  getReadiness: async (id, targetStatus = 'ONGOING') => {
    return axiosClient.get(ENDPOINTS.HACKATHONS.READINESS(id), { params: { target: targetStatus } });
  },

  updateStatus: async (id, status, note = '') => {
    return axiosClient.patch(ENDPOINTS.HACKATHONS.STATUS(id), { status, note });
  }
};
