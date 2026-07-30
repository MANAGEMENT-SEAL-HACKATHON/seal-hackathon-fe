import axiosClient from '../../../shared/api/axiosClient';

const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : 'http://localhost:8080';

export const absoluteApiUrl = (path) => {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
};

export const showcaseService = {
  listHallOfFame: async (year) => {
    const response = await axiosClient.get('/api/v1/public/hall-of-fame', {
      params: year != null ? { year } : undefined,
    });
    return Array.isArray(response) ? response : [];
  },

  listPublishedArticles: async () => {
    const response = await axiosClient.get('/api/v1/public/articles');
    return Array.isArray(response) ? response : [];
  },

  getPublishedArticle: async (slug) => {
    return axiosClient.get(`/api/v1/public/articles/${slug}`);
  },

  listArticlesByHackathon: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/showcase/articles`);
    return Array.isArray(response) ? response : [];
  },

  listHofByHackathon: async (hackathonId) => {
    const response = await axiosClient.get(`/api/v1/hackathons/${hackathonId}/hall-of-fame`);
    return Array.isArray(response) ? response : [];
  },

  createArticle: async (hackathonId, payload) => {
    return axiosClient.post(`/api/v1/hackathons/${hackathonId}/showcase/articles`, payload);
  },

  updateArticle: async (id, payload) => {
    return axiosClient.put(`/api/v1/showcase/articles/${id}`, payload);
  },

  deleteArticle: async (id) => {
    return axiosClient.delete(`/api/v1/showcase/articles/${id}`);
  },

  publishArticle: async (id) => {
    return axiosClient.post(`/api/v1/showcase/articles/${id}/publish`);
  },

  unpublishArticle: async (id) => {
    return axiosClient.post(`/api/v1/showcase/articles/${id}/unpublish`);
  },

  generateDraft: async (hackathonId) => {
    return axiosClient.post(`/api/v1/hackathons/${hackathonId}/showcase/articles/generate-draft`);
  },

  uploadCover: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post(`/api/v1/showcase/articles/${id}/cover`, form);
  },

  uploadBlockImage: async (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient.post(`/api/v1/showcase/articles/${id}/block-images`, form);
  },

  backfillHallOfFame: async () => {
    return axiosClient.post('/api/v1/showcase/hall-of-fame/backfill');
  },
};
