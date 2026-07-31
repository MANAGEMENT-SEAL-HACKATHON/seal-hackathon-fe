import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const eventService = {
  listByHackathon: async (hackathonId, params) => {
    return axiosClient.get(ENDPOINTS.HACKATHONS.EVENTS(hackathonId), { params });
  },
  
  getById: async (id) => {
    return axiosClient.get(ENDPOINTS.EVENTS.DETAIL(id));
  },
  
  create: async (hackathonId, data) => {
    return axiosClient.post(ENDPOINTS.HACKATHONS.EVENTS(hackathonId), data);
  },
  
  update: async (id, data) => {
    return axiosClient.put(ENDPOINTS.EVENTS.DETAIL(id), data);
  },
  
  delete: async (id) => {
    return axiosClient.delete(ENDPOINTS.EVENTS.DETAIL(id));
  },

  getBuffetMenu: async (eventId) => {
    return axiosClient.get(ENDPOINTS.EVENTS.BUFFET_MENU(eventId));
  },

  replaceBuffetMenu: async (eventId, items) => {
    return axiosClient.put(ENDPOINTS.EVENTS.BUFFET_MENU(eventId), items);
  },
};
