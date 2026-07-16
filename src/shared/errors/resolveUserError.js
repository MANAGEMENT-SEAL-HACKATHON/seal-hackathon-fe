/**
 * Central user-facing error resolver.
 * Order: domain map by code → shared map → sanitize raw IT → fallback VN.
 *
 * @param {object|string|null|undefined} error
 * @param {{ domainMap?: Record<string, string>, fallback?: string }} [options]
 * @returns {string}
 */

export const SANITIZE_FALLBACK =
  'Có lỗi dữ liệu xảy ra hoặc thao tác chưa đúng trình tự. Vui lòng tải lại trang và thử lại.';

const IT_LEAK_RE = /teamId=|roundId=|hackathonId=|with id=|is_locked|PATCH \//i;
/** Entire message is SCREAMING_SNAKE_CASE (enum / ErrorCode only). */
const ENUM_ONLY_RE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+$/;

export function extractErrorCode(error) {
  if (!error) return '';
  if (typeof error === 'string') return '';
  return String(
    error.code ||
      error.data?.error?.code ||
      error.data?.code ||
      error.response?.data?.error?.code ||
      error.response?.data?.code ||
      '',
  );
}

export function extractErrorMessage(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return String(
    error.message ||
      error.data?.error?.message ||
      error.data?.message ||
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      '',
  );
}

export function isUnsafeUserMessage(message) {
  const msg = String(message || '').trim();
  if (!msg) return true;
  if (IT_LEAK_RE.test(msg)) return true;
  if (ENUM_ONLY_RE.test(msg)) return true;
  return false;
}

/** Shared codes used across domains. */
export const SHARED_ERROR_MESSAGES = {
  RESOURCE_NOT_FOUND:
    'Đội thi chưa được phân bảng trong vòng này. Hãy hoàn tất kết thúc đăng ký, khóa đội và bốc thăm trước.',
  ACTIVE_TEAMS_NOT_LOCKED: 'Vui lòng khóa danh sách đội thi trước khi thực hiện thao tác này.',
  SUBMISSION_ALREADY_CLOSED: 'Vòng thi đã khóa sổ, không thể nộp bài hay chỉnh sửa điểm.',
  SCORING_NOT_OPEN:
    'Chưa thể chấm điểm. Đội thi chưa lên bục trình bày (Chờ Điều phối viên khởi động).',
  REGISTRATION_ALREADY_CLOSED: 'Đăng ký đã kết thúc trước đó — không thể kết thúc đăng ký sớm lần nữa.',
  REGISTRATION_CLOSED: 'Đăng ký đã đóng. Không thể bốc thăm hoặc đổi bảng lúc này.',
  TRACK_CLOSED: 'Bảng đấu đã đóng — không thể chuyển đội vào bảng này.',
  TEAM_NOT_ACTIVE: 'Đội thi chưa được duyệt / chưa ở trạng thái sẵn sàng.',
  LATE_PENDING: 'Nộp muộn (Đang chờ duyệt)',
  PENDING_CONFIRM: 'Chờ chốt sổ',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  INVALID_STATE: 'Thao tác không hợp lệ ở trạng thái hiện tại.',
};

/** Human labels for status enums shown in UI (not always errors). */
export const STATUS_LABELS = {
  LATE_PENDING: 'Nộp muộn (Đang chờ duyệt)',
  PENDING_CONFIRM: 'Chờ chốt sổ',
  REJECTED: 'Bài nộp bị từ chối',
  HARD_LOCK: 'Đã khóa cứng nộp bài',
  PRESENTING: 'Đang thuyết trình',
  ACTIVE: 'Đang diễn ra',
  ONGOING: 'Đang diễn ra',
};

export function resolveStatusLabel(status) {
  if (!status) return '';
  const key = String(status).toUpperCase();
  return STATUS_LABELS[key] || String(status);
}

/**
 * @param {object|string|null|undefined} error
 * @param {{ domainMap?: Record<string, string>, fallback?: string }} [options]
 * @returns {string}
 */
export function resolveUserError(error, options = {}) {
  const { domainMap, fallback } = options;
  const code = extractErrorCode(error);
  const rawMessage = extractErrorMessage(error);

  if (code && domainMap?.[code]) {
    return domainMap[code];
  }
  if (code && SHARED_ERROR_MESSAGES[code]) {
    return SHARED_ERROR_MESSAGES[code];
  }

  if (rawMessage && !isUnsafeUserMessage(rawMessage)) {
    return rawMessage;
  }

  if (rawMessage && isUnsafeUserMessage(rawMessage)) {
    return SANITIZE_FALLBACK;
  }

  return fallback || SANITIZE_FALLBACK;
}

export { IT_LEAK_RE };
