// src/features/judging/services/judgeService.js
import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const judgeService = {
  // 2.1 GET /judge-track-assignments - Danh sách Track (Sơ loại)
  getTrackAssignments: async () => {
    return axiosClient.get('/api/v1/me/judge-track-assignments');
  },

  // 2.2 GET /judge-final-assignments - Danh sách Round (Chung kết)
  getFinalAssignments: async () => {
    return axiosClient.get('/api/v1/me/judge-final-assignments');
  },

  // 2.3 GET /scoring-schedule - Xem lịch chấm thi
  getScoringSchedule: async (roundId) => {
    return axiosClient.get('/api/v1/me/scoring-schedule', { params: { roundId } });
  },

  // 2.4 GET /judge-history - Lấy lịch sử chấm thi (FINISHED)
  getJudgeHistory: async (year) => {
    return axiosClient.get('/api/v1/me/judge-history', { params: { year } });
  },

  // 3.1 GET /scores - Lấy danh sách điểm đã chấm của chính mình
  getMyScores: async (roundId, config = {}) => {
    // Lưu ý: PDF quy định chỉ có tham số roundId
    return axiosClient.get('/api/v1/me/scores', { params: { roundId }, ...config });
  },

  // 3.2 PATCH /scores/{scoreId}/comment - Cập nhật Comment cho bài chấm
  updateComment: async (scoreId, comment) => {
    return axiosClient.patch(`/api/v1/me/scores/${scoreId}/comment`, { comment });
  },

  // 3.3 PATCH /scoring-completion - Cập nhật trạng thái Tiến độ chấm
  updateScoringCompletion: async (assignmentId, completionStatus) => {
    return axiosClient.patch('/api/v1/me/scoring-completion', { assignmentId, completionStatus });
  },

  // 3.4 POST /tiebreak-evaluations - Gửi kết quả Tiebreak Vote (Dành cho HEAD Judge)
  submitTiebreak: async (roundId, orderedTeamIds) => {
    return axiosClient.post('/api/v1/me/tiebreak-evaluations', { roundId, orderedTeamIds });
  },

  // Lấy danh sách bài nộp theo track/round (đã lọc theo phân công judge)
  getSubmissions: async (params) => {
    return axiosClient.get(ENDPOINTS.JUDGE.SUBMISSIONS, { params });
  },
  
  // Nộp điểm mới (Toàn bộ form)
  submitScore: async (payload) => {
    return axiosClient.post('/api/v1/scores', payload);
  },

  // Lấy file slide bài nộp (Yêu cầu responseType: 'blob' để đọc được file PDF)
  getSubmissionSlide: async (submissionId) => {
    return axiosClient.get(`/api/v1/submissions/${submissionId}/slide`, {
      responseType: 'blob' 
    });
  },

  downloadSubmissionSlide: async (submissionId) => {
    return axiosClient.get(`/api/v1/submissions/${submissionId}/slide`, {
      params: { download: true },
      responseType: 'blob',
    });
  },

  getPresentationScoringStatus: async (roundId, trackId) =>
    axiosClient.get('/api/v1/me/judge/presentation-scoring-status', {
      params: { roundId, ...(trackId ? { trackId } : {}) },
    }),

  confirmSubmissionScoring: async (submissionId) =>
    axiosClient.post(`/api/v1/me/judge/submissions/${submissionId}/confirm-scoring`, {}),
};