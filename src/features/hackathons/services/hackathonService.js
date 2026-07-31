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

  clone: async (sourceId, data) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.CLONE(sourceId), data);
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

  uploadBanner: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(ENDPOINTS.HACKATHONS.BANNER(id), formData);
  },

  updateStatus: async (id, status, note = '') => {
    return axiosClient.patch(ENDPOINTS.HACKATHONS.STATUS(id), { status, note });
  },

  closeRegistrationEarly: async (id, body) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.CLOSE_REGISTRATION_EARLY(id), body);
  },

  previewCompetitionSchedule: async (id, body, assumeCloseRegToday = false) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.COMPETITION_SCHEDULE_PREVIEW(id), body, {
      params: { assumeCloseRegToday },
    });
  },

  adjustCompetitionSchedule: async (id, body) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.COMPETITION_SCHEDULE_ADJUST(id), body);
  },

  previewRegistrationExtension: async (id, body) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.REGISTRATION_EXTENSION_PREVIEW(id), body);
  },

  extendRegistration: async (id, body) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.REGISTRATION_EXTENSION(id), body);
  },
};
