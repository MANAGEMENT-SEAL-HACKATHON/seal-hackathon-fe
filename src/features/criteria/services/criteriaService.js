import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';
import { mapCriterionToFE, mapCriterionToBE } from '../mappers/criteriaMapper';

export const criteriaService = {
  listPayloadByTrack: async (trackId) => {
    const res = await axiosClient.get(ENDPOINTS.TRACKS.CRITERIA(trackId));
    const items = Array.isArray(res?.items) ? res.items.map(mapCriterionToFE) : [];
    return {
      items,
      weightSummary: res?.weightSummary || null,
    };
  },

  // 1. GET danh sách criteria theo Track (Vòng Sơ loại/Bảng đấu)
  listByTrack: async (trackId) => {
    const payload = await criteriaService.listPayloadByTrack(trackId);
    return payload.items;
  },

  listPayloadByFinalRound: async (roundId) => {
    const res = await axiosClient.get(ENDPOINTS.ROUNDS.CRITERIA(roundId));
    const items = Array.isArray(res?.items) ? res.items.map(mapCriterionToFE) : [];
    return {
      items,
      weightSummary: res?.weightSummary || null,
    };
  },

  // 2. GET danh sách criteria theo Round (Vòng Chung kết)
  listByFinalRound: async (roundId) => {
    const payload = await criteriaService.listPayloadByFinalRound(roundId);
    return payload.items;
  },

  // 3. POST tạo mới 1 tiêu chí cho Track
  createForTrack: async (trackId, data) => {
    return axiosClient.post(ENDPOINTS.TRACKS.CRITERIA(trackId), mapCriterionToBE(data));
  },

  // 4. POST tạo mới 1 tiêu chí cho Round (Chung kết)
  createForFinalRound: async (roundId, data) => {
    return axiosClient.post(ENDPOINTS.ROUNDS.CRITERIA(roundId), mapCriterionToBE(data));
  },

  // 5. POST tạo hàng loạt (Batch) tiêu chí cho Track
  createBatchForTrack: async (trackId, itemsData) => {
    const payload = {
      items: itemsData.map(item => mapCriterionToBE(item))
    };
    return axiosClient.post(`${ENDPOINTS.TRACKS.CRITERIA(trackId)}/batch`, payload);
  },

  // 6. POST tạo hàng loạt (Batch) tiêu chí cho Round (Chung kết)
  createBatchForFinalRound: async (roundId, itemsData) => {
    const payload = {
      items: itemsData.map(item => mapCriterionToBE(item))
    };
    return axiosClient.post(`${ENDPOINTS.ROUNDS.CRITERIA(roundId)}/batch`, payload);
  },

  // 7. POST sao chép (Clone) bộ tiêu chí cho Track
  cloneForTrack: async (trackId, cloneConfig) => {
    return axiosClient.post(ENDPOINTS.TRACKS.CRITERIA_CLONE(trackId), cloneConfig);
  },

  // 8. POST sao chép (Clone) bộ tiêu chí cho Round
  cloneForFinalRound: async (roundId, cloneConfig) => {
    return axiosClient.post(ENDPOINTS.ROUNDS.CRITERIA_CLONE(roundId), cloneConfig);
  },

  // 9. GET chi tiết 1 tiêu chí cụ thể
  getById: async (id) => {
    const res = await axiosClient.get(ENDPOINTS.CRITERIA.DETAIL(id));
    return mapCriterionToFE(res);
  },

  // 10. PUT cập nhật thông tin 1 tiêu chí
  update: async (id, data) => {
    return axiosClient.put(ENDPOINTS.CRITERIA.DETAIL(id), mapCriterionToBE(data));
  },

  // 11. DELETE xóa 1 tiêu chí
  delete: async (id) => {
    return axiosClient.delete(ENDPOINTS.CRITERIA.DETAIL(id));
  },

  // 12. GET tóm tắt tỷ trọng trọng số (Weight) theo Track
  getWeightSummaryByTrack: async (trackId) => {
    return axiosClient.get(`${ENDPOINTS.TRACKS.CRITERIA(trackId)}/weight-summary`);
  },

  // 13. GET tóm tắt tỷ trọng trọng số (Weight) theo Round
  getWeightSummaryByRound: async (roundId) => {
    return axiosClient.get(`${ENDPOINTS.ROUNDS.CRITERIA(roundId)}/weight-summary`);
  },

  // 14. GET danh sách track làm nguồn để clone (API MỚI BỔ SUNG)
  getCloneSourcesForTrack: async (trackId) => {
    return axiosClient.get(`/api/v1/tracks/${trackId}/criteria/clone-sources`);
  },

  listTemplates: () => axiosClient.get(ENDPOINTS.CRITERIA.TEMPLATES),
  createTemplate: (data) => axiosClient.post(ENDPOINTS.CRITERIA.TEMPLATES, data),
  updateTemplate: (id, data) => axiosClient.put(ENDPOINTS.CRITERIA.TEMPLATE_DETAIL(id), data),
  deleteTemplate: (id) => axiosClient.delete(ENDPOINTS.CRITERIA.TEMPLATE_DETAIL(id)),
  applyTemplateToTrack: (trackId, templateId, replaceExisting) =>
    axiosClient.post(ENDPOINTS.CRITERIA.APPLY_TEMPLATE_TO_TRACK(trackId, templateId), {
      replaceExisting,
    }),
  applyTemplateToFinalRound: (roundId, templateId, replaceExisting) =>
    axiosClient.post(ENDPOINTS.CRITERIA.APPLY_TEMPLATE_TO_ROUND(roundId, templateId), {
      replaceExisting,
    }),
};
