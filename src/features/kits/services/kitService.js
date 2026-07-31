import axiosClient from '../../../shared/api/axiosClient';
import { ENDPOINTS } from '../../../shared/api/endpoints';

export const SHIRT_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
export const SHIRT_FITS = ['UNISEX', 'MALE', 'FEMALE'];

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

  batchUpsertStock: (itemId, stocks) =>
    axiosClient.put(ENDPOINTS.KITS.ITEM_STOCKS(itemId), { stocks }),

  listCloneSources: (hackathonId) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_CLONE_SOURCES(hackathonId)),

  cloneKits: (hackathonId, data) =>
    axiosClient.post(ENDPOINTS.HACKATHONS.KIT_CLONE(hackathonId), data),

  listBundles: (hackathonId) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_BUNDLES(hackathonId)),

  createBundle: (hackathonId, data) =>
    axiosClient.post(ENDPOINTS.HACKATHONS.KIT_BUNDLES(hackathonId), data),

  updateBundle: (id, data) =>
    axiosClient.put(ENDPOINTS.KITS.BUNDLE_DETAIL(id), data),

  deleteBundle: (id) =>
    axiosClient.delete(ENDPOINTS.KITS.BUNDLE_DETAIL(id)),

  listRecipients: (hackathonId, q) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_RECIPIENTS(hackathonId), {
      params: q ? { q } : undefined,
    }),

  issue: (hackathonId, data) =>
    axiosClient.post(ENDPOINTS.HACKATHONS.KIT_ISSUE(hackathonId), data),

  issueBundle: (hackathonId, data) =>
    axiosClient.post(ENDPOINTS.HACKATHONS.KIT_ISSUE_BUNDLE(hackathonId), data),

  revoke: (allocationId, data) =>
    axiosClient.post(ENDPOINTS.KITS.ALLOCATION_REVOKE(allocationId), data),

  /** @returns {Promise<{ lines: Array, kickoffStartsAt?: string, beforeKickoff?: boolean }>} */
  reconciliation: (hackathonId) =>
    axiosClient.get(ENDPOINTS.HACKATHONS.KIT_RECONCILIATION(hackathonId)),

  listMyShirtSizes: () =>
    axiosClient.get(ENDPOINTS.ME_KITS.SHIRT_SIZES),

  updateMyShirtSizeAll: (preferredShirtSize, preferredShirtFit = 'UNISEX') =>
    axiosClient.put(ENDPOINTS.ME_KITS.SHIRT_SIZE, {
      preferredShirtSize,
      preferredShirtFit,
    }),

  updateMyShirtSize: (hackathonId, preferredShirtSize, preferredShirtFit = 'UNISEX') =>
    axiosClient.put(ENDPOINTS.ME_KITS.HACKATHON_SHIRT_SIZE(hackathonId), {
      preferredShirtSize,
      preferredShirtFit,
    }),
};
