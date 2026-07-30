import { resolveUserError } from '../../../shared/errors/resolveUserError';

export const PROGRESSION_ERROR_MESSAGES = {
  RESULT_NOT_PUBLISHED: 'Cần công bố kết quả sơ loại trước khi thực hiện bước này.',
  TIEBREAK_REQUIRED: 'Có các đội đồng điểm tại ranh giới đi tiếp. Vui lòng giải quyết Tiebreak.',
  ROUND_NOT_SCORING_LOCKED: 'Vòng thi chưa khóa chấm điểm — không thể công bố hoặc chốt kết quả.',
  APPEAL_PENDING_BLOCKS_ADVANCE: 'Còn đơn khiếu nại chưa xử lý — không thể chốt chuyển vòng.',
  APPEAL_WINDOW_DOES_NOT_FIT: 'Cửa sổ khiếu nại không vừa lịch Chung kết — chọn phương án công bố.',
  APPEAL_WINDOW_BELOW_MINIMUM: 'Cửa sổ khiếu nại dưới mức tối thiểu.',
  APPEAL_WINDOW_SKIP_REASON_REQUIRED: 'Bắt buộc nhập lý do khi bỏ qua cửa sổ khiếu nại.',
  APPEAL_WINDOW_HAS_PENDING: 'Còn đơn khiếu nại mở — không thể đóng cửa sổ sớm.',
  APPEAL_WINDOW_LOCKED_AFTER_PUBLISH: 'Đã công bố sơ loại — không chỉnh cửa sổ khiếu nại được nữa.',
  APPEAL_DECISION_NOTE_REQUIRED: 'Bắt buộc nhập ghi chú khi từ chối khiếu nại.',
  APPEAL_DELAY_LIMIT_EXCEEDED: 'Đã hết ngân sách dời giờ kháng cáo.',
  INVALID_STATE: 'Thao tác không hợp lệ ở trạng thái hiện tại của vòng thi.',
  TEAM_NOT_IN_ROUND: 'Đội không thuộc vòng thi này.',
  JUDGE_NOT_ASSIGNED: 'Chưa gán giám khảo Chung kết (guest judge) — không thể kích hoạt vòng Chung kết.',
  NO_PRIZES_RECORDED: 'Chưa trao giải thưởng nào — cần ít nhất một giải trước khi chốt sổ.',
  HACKATHON_NOT_PENDING_CONFIRM: 'Hackathon chưa ở trạng thái đang chờ chốt sổ điểm.',
  HACKATHON_NOT_ONGOING: 'Hackathon không còn ở trạng thái đang diễn ra.',
  HACKATHON_ARCHIVED: 'Hackathon đã kết thúc — chỉ xem lịch sử, không thể thay đổi.',
  CROSS_HACKATHON_VIOLATION: 'Dữ liệu không cùng một kỳ Hackathon.',
  PRIZE_DUPLICATE: 'Giải thưởng trùng hạng hoặc đội đã được trao giải.',
  REVIEW_NOTE_REQUIRED: 'Bắt buộc nhập ghi chú khi từ chối.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  RESOURCE_NOT_FOUND:
    'Đội thi chưa được phân bảng trong vòng này. Hãy hoàn tất kết thúc đăng ký, khóa đội và bốc thăm trước.',
  PENDING_CONFIRM: 'Đang chờ chốt sổ điểm',
  SUBMISSION_ALREADY_CLOSED: 'Vòng thi đã khóa sổ, không thể nộp bài hay chỉnh sửa điểm.',
};

export const extractProgressionErrorCode = (error) =>
  error?.code ||
  error?.data?.error?.code ||
  error?.response?.data?.error?.code ||
  error?.response?.data?.code;

export const resolveProgressionError = (error, fallbackMessage) => {
  const code = extractProgressionErrorCode(error);
  const message = resolveUserError(error, {
    domainMap: PROGRESSION_ERROR_MESSAGES,
    fallback: fallbackMessage || 'Có lỗi xảy ra. Vui lòng thử lại.',
  });
  return { code, message };
};
