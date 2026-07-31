/**
 * @param {import('axios').AxiosError|object|string|null|undefined} error
 * @param {string} [fallback]
 */
import { resolveUserError } from '../../../shared/errors/resolveUserError';

export const KIT_ERROR_MESSAGES = {
  KIT_OUT_OF_STOCK: 'Hết tồn kho cho món/size này — không thể phát thêm.',
  KIT_ALREADY_ISSUED: 'Sinh viên đã nhận món kit này rồi.',
  KIT_BUNDLE_EMPTY: 'Combo kit phải có ít nhất một món.',
  KIT_ITEM_IN_BUNDLE: 'Không thể xóa món đang nằm trong combo kit — gỡ khỏi combo trước.',
  KIT_ITEM_NAME_REQUIRED: 'Món loại Khác cần tên cụ thể (không dùng "khác"/"other").',
  CONCURRENT_MODIFICATION: 'Tồn kho vừa được cập nhật bởi người khác — tải lại và thử lại.',
  VALIDATION_FAILED: 'Thiếu hoặc sai thông tin size / số lượng. Kiểm tra lại trước khi lưu.',
  FORBIDDEN: 'Chỉ phát kit cho thành viên đã chấp nhận của đội đang hoạt động.',
};

export function resolveKitError(error, fallback = 'Không thể thực hiện thao tác kit.') {
  return resolveUserError(error, { domainMap: KIT_ERROR_MESSAGES, fallback });
}
