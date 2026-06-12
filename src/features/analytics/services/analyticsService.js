import axiosClient from '../../../shared/api/axiosClient';

export const analyticsService = {
  // GET /api/v1/rounds/{id}/rbl/variance
  getRblVariance: async (roundId) => {
    return axiosClient.get(`/api/v1/rounds/${roundId}/rbl/variance`);
  },
  
  // GET /api/v1/rounds/{id}/rbl/progress
  getRblProgress: async (roundId) => {
    return axiosClient.get(`/api/v1/rounds/${roundId}/rbl/progress`);
  },

  // POST /api/v1/hackathons/{id}/export-jobs
  createExportJob: async (hackathonId, payload = { type: 'CSV_SCORES' }) => {
    return axiosClient.post(`/api/v1/hackathons/${hackathonId}/export-jobs`, payload);
  },

  // GET /api/v1/export-jobs/{id}
  getExportJobStatus: async (jobId) => {
    return axiosClient.get(`/api/v1/export-jobs/${jobId}`);
  },

  // GET /api/v1/export-jobs/{id}/download
  downloadExportFile: async (jobId) => {
    return axiosClient.get(`/api/v1/export-jobs/${jobId}/download`, {
      responseType: 'blob', // Điều này ép file được tải xuống
    });
  }
};