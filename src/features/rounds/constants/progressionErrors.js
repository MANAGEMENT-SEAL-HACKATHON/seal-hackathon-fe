export const PROGRESSION_ERROR_MESSAGES = {
  RESULT_NOT_PUBLISHED: 'Cần công bố kết quả sơ loại trước khi thực hiện bước này.',
  TIEBREAK_REQUIRED: 'Còn trường hợp đồng điểm tại ranh giới Top N — hãy phân xử ở tab Tiebreak trước.',
  ROUND_NOT_SCORING_LOCKED: 'Vòng thi chưa khóa chấm điểm — không thể công bố hoặc chốt kết quả.',
  INVALID_STATE: 'Thao tác không hợp lệ ở trạng thái hiện tại của vòng thi.',
  TEAM_NOT_IN_ROUND: 'Đội không thuộc vòng thi này.',
  JUDGE_NOT_ASSIGNED: 'Chưa gán giám khảo Chung kết (guest judge) — không thể kích hoạt vòng CK.',
  NO_PRIZES_RECORDED: 'Chưa trao giải thưởng nào — cần ít nhất một giải trước khi chốt sổ.',
  HACKATHON_NOT_PENDING_CONFIRM: 'Hackathon chưa ở trạng thái chờ xác nhận đóng giải.',
  HACKATHON_NOT_ONGOING: 'Hackathon không còn ở trạng thái đang diễn ra.',
  HACKATHON_ARCHIVED: 'Hackathon đã kết thúc — chỉ xem lịch sử, không thể thay đổi.',
  CROSS_HACKATHON_VIOLATION: 'Dữ liệu không cùng một kỳ Hackathon.',
  PRIZE_DUPLICATE: 'Giải thưởng trùng hạng hoặc đội đã được trao giải.',
  REVIEW_NOTE_REQUIRED: 'Bắt buộc nhập ghi chú khi từ chối.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  RESOURCE_NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu.',
};

export const extractProgressionErrorCode = (error) =>
  error?.code ||
  error?.data?.error?.code ||
  error?.response?.data?.error?.code ||
  error?.response?.data?.code;

export const resolveProgressionError = (error, fallbackMessage) => {
  const code = extractProgressionErrorCode(error);
  const message =
    (code && PROGRESSION_ERROR_MESSAGES[code]) ||
    error?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    fallbackMessage ||
    'Có lỗi xảy ra. Vui lòng thử lại.';

  return { code, message };
};
