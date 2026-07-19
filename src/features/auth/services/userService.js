import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const userService = {
  /**
   * Get current user profile.
   * Returns user info including status (PENDING / APPROVED / REJECTED) and role.
   */
  getMe: async () => {
    return axiosClient.get(ENDPOINTS.USERS.ME);
  },

  /**
   * Update current user's onboarding profile.
   * PATCH /api/v1/users/me
   * @param {object} payload - { fullName, userType, studentCode, chapterId, institution, phone }
   */
  patchMe: async (payload) => {
    return axiosClient.patch(ENDPOINTS.USERS.ME, payload);
  },

  /**
   * Upload student card image.
   * POST /api/v1/users/me/student-card
   * @param {File} file - The image file to upload
   */
  uploadStudentCard: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post(ENDPOINTS.USERS.ME_STUDENT_CARD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * Download current user's student card image (blob).
   * GET /api/v1/users/me/student-card
   */
  getMyStudentCardBlob: async () => {
    return axiosClient.get(ENDPOINTS.USERS.ME_STUDENT_CARD, {
      responseType: 'blob',
    });
  },

  /**
   * Admin / Coordinator: update user status to APPROVED, REJECTED or PENDING.
   * PATCH /api/v1/users/{userId}/status
   * @param {string|number} userId
   * @param {'APPROVED'|'REJECTED'|'PENDING'} status
   * @param {object} reasons - Optional reasons like { rejectionReason } or { overrideReason }
   */
  updateUserStatus: async (userId, status, reasons = {}) => {
    return axiosClient.patch(ENDPOINTS.USERS.STATUS(userId), { status, ...reasons });
  },

  /**
   * Get list of users.
   * GET /api/v1/users
   */
  getUsers: async (params) => {
    return axiosClient.get(ENDPOINTS.USERS.LIST, { params });
  },

  /**
   * Get user details.
   * GET /api/v1/users/{userId}
   */
  getUserDetail: async (userId) => {
    return axiosClient.get(ENDPOINTS.USERS.DETAIL(userId));
  },

  /**
   * Coordinator: download student card image as blob (Bearer auth).
   * GET /api/v1/users/{userId}/student-card
   */
  getStudentCardBlob: async (userId) => {
    return axiosClient.get(`${ENDPOINTS.USERS.DETAIL(userId)}/student-card`, {
      responseType: 'blob',
    });
  },

  /**
   * Create temporary judge guest.
   * POST /api/v1/users/temp-judges
   * @param {object} payload - { email, name, institution, hackathonId }
   */
  createTempJudge: async (payload) => {
    return axiosClient.post(ENDPOINTS.USERS.TEMP_JUDGES, payload);
  },

  /**
   * List temporary judges (server-side page/size).
   * GET /api/v1/users/temp-judges
   */
  getTempJudges: async (params = {}) => {
    return axiosClient.get(ENDPOINTS.USERS.TEMP_JUDGES, { params });
  },

  /**
   * Resend invitation to temp judge.
   * POST /api/v1/invitations/{invitationId}/resend
   */
  resendInvitation: async (invitationId) => {
    return axiosClient.post(ENDPOINTS.USERS.RESEND_INVITATION(invitationId));
  },

  revokeInvitation: async (invitationId) => {
    return axiosClient.post(ENDPOINTS.USERS.REVOKE_INVITATION(invitationId));
  },

  /**
   * Coordinator: search judge/mentor accounts for invite autocomplete.
   * GET /api/v1/users/lookup/coordinator?q=
   */
  searchCoordinatorInviteCandidates: async (q) => {
    return axiosClient.get(ENDPOINTS.USERS.LOOKUP_COORDINATOR, { params: { q } });
  },
};
