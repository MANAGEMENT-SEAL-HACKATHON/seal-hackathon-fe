import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

// === DỊCH VỤ GỌI API CHO TÍNH NĂNG REVIEW ===
export const reviewService = {
  // 1. Lấy dữ liệu kiểm tra Readiness
  checkReadiness: async (hackathonId, targetStatus = 'ONGOING') => {
    return axiosClient.get(ENDPOINTS.HACKATHONS.READINESS(hackathonId), {
      params: { target: targetStatus }
    });
  },

  // 2. Chuyển đổi trạng thái Hackathon (Kích hoạt)
  changeStatus: async (hackathonId, status, note = '') => {
    return axiosClient.patch(ENDPOINTS.HACKATHONS.STATUS(hackathonId), { status, note });
  }
};