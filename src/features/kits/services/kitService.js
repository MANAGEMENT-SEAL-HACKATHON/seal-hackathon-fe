import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export const kitService = {
  listItems: (hackathonId) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_ITEMS(hackathonId)),

  createItem: (hackathonId, data) =>
    axiosClient.post(ENDPOINTS.HACKATHONS.KIT_ITEMS(hackathonId), data),

  updateItem: (id, data) =>
    axiosClient.put(ENDPOINTS.KITS.ITEM_DETAIL(id), data),

  deleteItem: (id) =>
    axiosClient.delete(ENDPOINTS.KITS.ITEM_DETAIL(id)),

  upsertStock: (itemId, data) =>
    axiosClient.put(ENDPOINTS.KITS.ITEM_STOCK(itemId), data),

  listRecipients: (hackathonId, q) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_RECIPIENTS(hackathonId), {
      params: q ? { q } : undefined,
    }),

  issue: (hackathonId, data) =>
    axiosClient.post(ENDPOINTS.HACKATHONS.KIT_ISSUE(hackathonId), data),

  revoke: (allocationId, data) =>
    axiosClient.post(ENDPOINTS.KITS.ALLOCATION_REVOKE(allocationId), data),

  reconciliation: (hackathonId) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_RECONCILIATION(hackathonId)),

  listMyShirtSizes: () =>
    axiosClient.get(ENDPOINTS.ME_KITS.SHIRT_SIZES),

  updateMyShirtSizeAll: (preferredShirtSize) =>
    axiosClient.put(ENDPOINTS.ME_KITS.SHIRT_SIZE, { preferredShirtSize }),

  updateMyShirtSize: (hackathonId, preferredShirtSize) =>
    axiosClient.put(ENDPOINTS.ME_KITS.HACKATHON_SHIRT_SIZE(hackathonId), {
      preferredShirtSize,
    }),
};
