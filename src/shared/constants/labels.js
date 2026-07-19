/**
 * Single source of truth for user-facing Vietnamese labels.
 * Never render raw enum codes on UI — use labelOf().
 */

export const labelOf = (map, value, fallback = '—') => {
  if (value == null || value === '') return fallback;
  const key = String(value).toUpperCase();
  return map[key] ?? map[value] ?? fallback;
};

/** Soft-localize English status suffixes that appear inside seed/event display names. */
export const displayEventName = (name, fallback = '—') => {
  if (name == null || name === '') return fallback;
  return String(name)
    .replace(/\s*\(Completed\)/gi, ' (Đã kết thúc)')
    .replace(/\s*\(Finished\)/gi, ' (Đã kết thúc)')
    .replace(/\s*\(Pending confirm\)/gi, ' (Chờ chốt sổ)')
    .replace(/\s*\(Pending\)/gi, ' (Chờ xử lý)')
    .replace(/\s*\(Active\)/gi, ' (Đang diễn ra)')
    .replace(/\s*\(Ongoing\)/gi, ' (Đang diễn ra)')
    .replace(/\s*\(Draft\)/gi, ' (Bản nháp)')
    .replace(/\s*\(Copy\)/gi, ' (Bản sao)')
    .replace(/\s*\(Closed\)/gi, ' (Đã đóng)')
    .replace(/\s*\(Inactive\)/gi, ' (Không hoạt động)')
    .replace(/\s+active\b/gi, ' đang diễn ra')
    .replace(/\s+Pending confirm\b/gi, ' Chờ chốt sổ');
};

/**
 * Strip status suffixes from event display names so status is shown only via Badge/Tag.
 * Display-only — does not mutate stored names.
 */
export const stripEventStatusSuffix = (name) => {
  if (name == null || name === '') return name;
  return String(name)
    .replace(/\s*\((?:Đã kết thúc|Đã hoàn thành|Đang diễn ra|Bản nháp|Chờ chốt sổ|Chờ chót sổ|Đã đóng|Không hoạt động|Bản sao|Chờ xử lý)\)/gi, '')
    .replace(/\s*\((?:Completed|Finished|Active|Ongoing|Draft|Closed|Inactive|Copy|Pending confirm|Pending)\)/gi, '')
    .replace(/\s+đang diễn ra\b/gi, '')
    .replace(/\s+Chờ chốt sổ\b/gi, '')
    .trim();
};

export const HACKATHON_STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  ONGOING: 'Đang diễn ra',
  PENDING_CONFIRM: 'Chờ chốt sổ',
  FINISHED: 'Đã kết thúc',
  ACTIVE: 'Đang diễn ra',
  COMPLETED: 'Đã hoàn thành',
  CLOSED: 'Đã đóng',
  INACTIVE: 'Không hoạt động',
};

/** Single source for hackathon status colors (Badge.status + Tag.color presets). */
export const HACKATHON_STATUS_COLORS = {
  DRAFT: 'default',
  ONGOING: 'success',
  PENDING_CONFIRM: 'warning',
  FINISHED: 'error',
  ACTIVE: 'success',
  COMPLETED: 'error',
  CLOSED: 'default',
  INACTIVE: 'default',
};

export const ROUND_STATUS_LABELS = {
  DRAFT: 'Bản nháp',
  ACTIVE: 'Đang diễn ra',
  ONGOING: 'Đang diễn ra',
  LOCKED: 'Đã khóa',
  COMPLETED: 'Đã hoàn thành',
  FINISHED: 'Đã kết thúc',
  CLOSED: 'Đã đóng',
  INACTIVE: 'Không hoạt động',
};

export const COMPLETION_STATUS_LABELS = {
  NOT_STARTED: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn thành',
};

export const TEAM_STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  ACTIVE: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  ELIMINATED: 'Bị loại',
  INACTIVE: 'Không hoạt động',
};

export const USER_STATUS_LABELS = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối',
  INCOMPLETE: 'Chưa đủ thông tin',
};

export const EVENT_TYPE_LABELS = {
  OPENING: 'Khai mạc',
  CLOSING: 'Bế mạc',
  WORKSHOP: 'Workshop',
  CODING: 'Coding',
  PRESENTATION: 'Thuyết trình',
  SCORING: 'Chấm điểm',
  BREAK: 'Nghỉ giữa giờ',
  OTHER: 'Khác',
  DEADLINE: 'Hạn chót',
  MENTORING: 'Hướng dẫn',
};

export const EXPORT_JOB_TYPE_LABELS = {
  CSV_SCORES: 'Điểm chi tiết (CSV)',
  CSV_RANKINGS: 'Bảng xếp hạng (CSV)',
  ANONYMIZED_RBL: 'Dataset RBL ẩn danh (CSV)',
  FULL_REPORT: 'Báo cáo đầy đủ (CSV)',
};

export const EXPORT_JOB_STATUS_LABELS = {
  PENDING: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  RUNNING: 'Đang chạy',
  DONE: 'Hoàn thành',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại',
};

export const PRIZE_TYPE_LABELS = {
  FIRST: 'Giải nhất',
  SECOND: 'Giải nhì',
  THIRD: 'Giải ba',
  CREATIVE: 'Giải sáng tạo',
  PRACTICAL: 'Giải thực tiễn',
  SPECIAL: 'Giải đặc biệt',
  OTHER: 'Khác',
};

export const CRITERIA_TYPE_LABELS = {
  TECHNICAL: 'Kỹ thuật',
  SOFT_SKILL: 'Kỹ năng mềm',
  SOFT: 'Kỹ năng mềm',
  BUSINESS: 'Kinh doanh',
  DESIGN: 'Thiết kế',
  PENALTY: 'Điểm trừ',
  OTHER: 'Khác',
};

export const ASSIGNMENT_TYPE_LABELS = {
  JUDGE: 'Giám khảo',
  MENTOR: 'Cố vấn',
  COORDINATOR: 'Điều phối',
  INTERNAL: 'Nội bộ',
  GUEST: 'Khách mời',
  HEAD: 'Trưởng ban',
};

export const WC_CATEGORY_LABELS = {
  TECHNICAL: 'Kỹ thuật',
  SOFT: 'Kỹ năng mềm',
  OTHER: 'Khác',
  FORCE_MAJEURE: 'Bất khả kháng',
  TIEBREAK: 'Đồng điểm',
  MANUAL: 'Thủ công',
};
