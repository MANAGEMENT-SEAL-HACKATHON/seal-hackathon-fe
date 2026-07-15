import { resolveUserError } from '../../../shared/errors/resolveUserError';

export const PRELIMINARY_SUBMISSION_ERROR_MESSAGES = {
  INVALID_SLIDE_FORMAT: 'File slide phải là PDF.',
  INVALID_SLIDE_FILE: 'File slide không hợp lệ hoặc bị hỏng.',
  SLIDE_FILE_REQUIRED: 'Vui lòng tải lên file slide PDF.',
  INVALID_REPO_PLATFORM: 'Repository phải là GitHub hoặc GitLab công khai — không chấp nhận Google Drive.',
  REPO_NOT_PUBLIC: 'Repository chưa ở chế độ public. Hãy mở quyền truy cập rồi nộp lại.',
  PRELIM_NOT_MUTABLE:
    'Đội đã vào Chung kết hoặc bị loại — không thể nộp / sửa bài vòng Sơ loại.',
  TEAM_NOT_IN_TRACK: 'Đội chưa được phân bảng đấu. Hoàn tất bốc thăm trước khi nộp bài.',
  TEAM_NOT_IN_ROUND: 'Đội chưa tham gia vòng thi này.',
  TEAM_NOT_LOCKED: 'Đội chưa được khóa sau bốc thăm — liên hệ Ban tổ chức.',
  TEAM_NOT_ACTIVE: 'Đội thi chưa được duyệt / chưa ở trạng thái sẵn sàng.',
  NOT_TEAM_MEMBER: 'Bạn không thuộc đội này.',
  HACKATHON_NOT_ONGOING: 'Hackathon chưa ở trạng thái đang diễn ra.',
  HACKATHON_ARCHIVED: 'Hackathon đã kết thúc — chỉ xem lịch sử, không thể thay đổi.',
  EVENT_FINISHED: 'Sự kiện / hackathon đã kết thúc — không còn nhận bài.',
  SUBMISSION_NOT_STARTED: 'Sự kiện chưa mở — chưa đến thời gian nộp bài.',
  SUBMISSION_CLOSED: 'Đã đóng cửa sổ nộp bài / đóng sổ chấm — không còn nhận bài.',
  SUBMISSION_NOT_CLOSED_FOR_SHUFFLE: 'Chưa hết hạn nộp bài — không xáo hàng đợi.',
  PRESENTATION_ALREADY_STARTED: 'Đã bắt đầu thuyết trình — không xáo lại hàng đợi.',
  CROSS_HACKATHON_VIOLATION: 'Đội và vòng thi không cùng một kỳ Hackathon.',
  SCORING_NOT_OPEN:
    'Chưa thể chấm điểm. Đội thi chưa lên bục trình bày (Chờ Điều phối viên khởi động).',
  SCORING_LOCKED: 'Vòng đã khóa chấm điểm — không thể nộp điểm.',
  ROUND_NOT_ACTIVE: 'Vòng thi đã kết thúc hoặc không còn hoạt động.',
  ROUND_INACTIVE: 'Vòng thi đã kết thúc hoặc không còn hoạt động.',
  SUBMISSION_NOT_LATE_PENDING: 'Bài nộp không còn ở trạng thái chờ duyệt trễ.',
  LATE_PENDING_NOT_ALLOWED: 'Vòng Chung kết không cho phép duyệt bài nộp trễ.',
  LATE_PENDING: 'Nộp muộn (Đang chờ duyệt)',
  REVIEW_NOTE_REQUIRED: 'Bắt buộc nhập lý do khi từ chối bài nộp trễ.',
  SCORING_INCOMPLETE_BEFORE_NEXT: 'Chưa đủ điểm chấm cho đội hiện tại.',
  JUDGE_NOT_ASSIGNED: 'Giám khảo chưa được phân công cho bảng đấu / vòng này.',
  JUDGE_NOT_ASSIGNED_TO_TRACK: 'Bạn chưa được phân công chấm bảng đấu này.',
  NOT_TRACK_CONTROLLER: 'Bạn không có quyền điều khiển hàng đợi thuyết trình bảng đấu / vòng này.',
  VALIDATION_FAILED: 'Dữ liệu không hợp lệ.',
  INVALID_STATE: 'Thao tác không hợp lệ ở trạng thái hiện tại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  RESOURCE_NOT_FOUND:
    'Đội thi chưa được phân bảng trong vòng này. Hãy hoàn tất kết thúc đăng ký, khóa đội và bốc thăm trước.',
  ROUND_NOT_SCORING_LOCKED: 'Vòng thi chưa chốt điểm — chưa thể xem điểm.',
  SUBMISSION_ALREADY_CLOSED: 'Vòng thi đã khóa sổ, không thể nộp bài hay chỉnh sửa điểm.',
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
  let message = resolveUserError(error, {
    domainMap: PRELIMINARY_SUBMISSION_ERROR_MESSAGES,
    fallback: fallbackMessage || 'Có lỗi xảy ra. Vui lòng thử lại.',
  });

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
