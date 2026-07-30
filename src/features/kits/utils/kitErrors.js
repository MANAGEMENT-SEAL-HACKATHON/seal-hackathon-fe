/**
 * @param {import('axios').AxiosError|object|string|null|undefined} error
 * @param {string} [fallback]
 */
import { resolveUserError } from '../../../shared/errors/resolveUserError';

export const KIT_ERROR_MESSAGES = {
  KIT_OUT_OF_STOCK: 'Hết tồn kho cho món/size này — không thể phát thêm.',
  KIT_ALREADY_ISSUED: 'Sinh viên đã nhận món kit này rồi.',
  CONCURRENT_MODIFICATION: 'Tồn kho vừa được cập nhật bởi người khác — tải lại và thử lại.',
  VALIDATION_FAILED: 'Thiếu hoặc sai thông tin size / số lượng. Kiểm tra lại trước khi lưu.',
  FORBIDDEN: 'Chỉ phát kit cho thành viên đã chấp nhận của đội đang hoạt động.',
};

export function resolveKitError(error, fallback = 'Không thể thực hiện thao tác kit.') {
  return resolveUserError(error, { domainMap: KIT_ERROR_MESSAGES, fallback });
}
