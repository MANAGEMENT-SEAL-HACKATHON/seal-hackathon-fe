export const PRELIMINARY_SUBMISSION_ERROR_MESSAGES = {
  INVALID_SLIDE_FORMAT: 'File slide phải là PDF.',
  INVALID_SLIDE_FILE: 'File slide không hợp lệ hoặc bị hỏng.',
  SLIDE_FILE_REQUIRED: 'Vui lòng tải lên file slide PDF.',
  INVALID_REPO_PLATFORM: 'Repository phải là GitHub hoặc GitLab công khai — không chấp nhận Google Drive.',
  REPO_NOT_PUBLIC: 'Repository chưa ở chế độ public. Hãy mở quyền truy cập rồi nộp lại.',
  TEAM_NOT_IN_TRACK: 'Đội chưa được phân bảng đấu. Hoàn tất bốc thăm track trước khi nộp bài.',
  TEAM_NOT_IN_ROUND: 'Đội chưa tham gia vòng thi này.',
  TEAM_NOT_LOCKED: 'Đội chưa được khóa sau bốc thăm — liên hệ Ban tổ chức.',
  TEAM_NOT_ACTIVE: 'Đội chưa ở trạng thái ACTIVE.',
  NOT_TEAM_MEMBER: 'Bạn không thuộc đội này.',
  HACKATHON_NOT_ONGOING: 'Hackathon chưa ở trạng thái đang diễn ra.',
  HACKATHON_ARCHIVED: 'Hackathon đã kết thúc — chỉ xem lịch sử, không thể thay đổi.',
  CROSS_HACKATHON_VIOLATION: 'Đội và vòng thi không cùng một kỳ Hackathon.',
  SCORING_NOT_OPEN: 'Chỉ chấm điểm khi đội đang thuyết trình (slot PRESENTING).',
  SCORING_LOCKED: 'Vòng đã khóa chấm điểm — không thể nộp điểm.',
  ROUND_NOT_ACTIVE: 'Vòng thi chưa được kích hoạt.',
  SUBMISSION_NOT_LATE_PENDING: 'Bài nộp không còn ở trạng thái chờ duyệt trễ.',
  LATE_PENDING_NOT_ALLOWED: 'Vòng Chung kết không cho phép duyệt bài nộp trễ.',
  REVIEW_NOTE_REQUIRED: 'Bắt buộc nhập lý do khi từ chối bài nộp trễ.',
  SCORING_INCOMPLETE_BEFORE_NEXT: 'Chưa đủ điểm chấm cho đội hiện tại.',
  JUDGE_NOT_ASSIGNED: 'Giám khảo chưa được phân công cho track/vòng này.',
  JUDGE_NOT_ASSIGNED_TO_TRACK: 'Bạn chưa được phân công chấm track này.',
  NOT_TRACK_CONTROLLER: 'Bạn không có quyền điều khiển hàng đợi thuyết trình track/vòng này.',
  VALIDATION_FAILED: 'Dữ liệu không hợp lệ.',
  INVALID_STATE: 'Thao tác không hợp lệ ở trạng thái hiện tại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  RESOURCE_NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu.',
  ROUND_NOT_SCORING_LOCKED: 'Vòng thi chưa chốt điểm — chưa thể xem điểm.',
};

export const extractPreliminarySubmissionErrorCode = (error) =>
  error?.code ||
  error?.data?.error?.code ||
  error?.response?.data?.error?.code ||
  error?.response?.data?.code;

export const extractPreliminarySubmissionErrorDetails = (error) =>
  error?.details ||
  error?.data?.error?.details ||
  error?.response?.data?.error?.details ||
  null;

export const formatScoringIncompleteMessage = (details) => {
  if (!details) {
    return PRELIMINARY_SUBMISSION_ERROR_MESSAGES.SCORING_INCOMPLETE_BEFORE_NEXT;
  }
  const reason = details.reason || details.Reason;
  const scored = details.scoredJudgeCount ?? details.scored_judge_count;
  const required = details.requiredJudgeCount ?? details.required_judge_count;
  if (reason === 'NO_SCORES') {
    return 'Chưa có điểm chấm cho đội đang thuyết trình.';
  }
  if (reason === 'MISSING_JUDGE_SCORES' && scored != null && required != null) {
    return `Chỉ ${scored}/${required} giám khảo đã chốt điểm.`;
  }
  return PRELIMINARY_SUBMISSION_ERROR_MESSAGES.SCORING_INCOMPLETE_BEFORE_NEXT;
};

export const resolvePreliminarySubmissionError = (error, fallbackMessage) => {
  const code = extractPreliminarySubmissionErrorCode(error);
  const details = extractPreliminarySubmissionErrorDetails(error);
  let message =
    (code && PRELIMINARY_SUBMISSION_ERROR_MESSAGES[code]) ||
    error?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    fallbackMessage ||
    'Có lỗi xảy ra. Vui lòng thử lại.';

  if (code === 'SCORING_INCOMPLETE_BEFORE_NEXT') {
    message = formatScoringIncompleteMessage(details);
  }

  return {
    code,
    message,
    details,
    isScoringIncomplete: code === 'SCORING_INCOMPLETE_BEFORE_NEXT',
  };
};
