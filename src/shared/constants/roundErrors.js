import { resolveUserError } from '../errors/resolveUserError';

export const ROUND_ERROR_MESSAGES = {
  ROUND_FINAL_EXAM_ORDER: 'Ngày thi Chung kết phải sau vòng Sơ loại',
  ROUND_PRELIM_EXAM_ORDER: 'Ngày thi Sơ loại phải trước Chung kết',
  ROUND_FINAL_REQUIRES_PRELIM: 'Tạo vòng Sơ loại trước khi tạo Chung kết',
  ROUND_DUPLICATE_FINAL: 'Hackathon đã có vòng Chung kết — mỗi kỳ chỉ 1 vòng Chung kết',
  ROUND_TYPE_DUPLICATE: 'Hackathon đã có vòng loại này — mỗi loại chỉ tạo được 1 lần (Sơ loại / Bán kết / Chung kết)',
  ROUND_EXAM_BEFORE_SUBMISSION_OPEN: 'Ngày giờ thi phải trước thời điểm mở nộp bài',
  ROUND_EXAM_BEFORE_KICKOFF: 'Ngày thi phải sau khi Khai mạc kết thúc',
  EVENT_OUT_OF_HACKATHON: 'Ngày thi nằm ngoài khoảng thời gian diễn ra hackathon',
  ROUND_NO_CRITERIA: 'Bảng đấu chưa có tiêu chí đánh giá nào',
  ROUND_WEIGHT_NOT_ONE: 'Tổng trọng số các tiêu chí phải bằng 1.0 (100%)',
  ROUND_NOT_ACTIVE: 'Vòng thi chưa được kích hoạt',
  SUBMISSION_ALREADY_CLOSED: 'Vòng thi đã khóa sổ, không thể nộp bài hay chỉnh sửa điểm.',
  INVALID_STATE: 'Trạng thái vòng thi không cho phép thao tác này',
  INVALID_ROUND_STATE_UNRELEASED: 'Vòng thi chưa phát đề, không thể kết thúc sớm!',
  INVALID_ROUND_STATE_BEFORE_EXAM: 'Chưa đến giờ thi (đang thời gian chờ setup).',
  INVALID_ROUND_STATE_NOT_CLOSED:
    'Chưa đóng vòng thi (chưa hết giờ hoặc chưa kết thúc sớm), không thể khóa chấm!',
  INVALID_ROUND_STATE_QUEUE_NOT_SHUFFLED:
    'Chưa xáo trộn hàng đợi thuyết trình, không thể khóa chấm!',
  INVALID_ROUND_STATE_PRESENTATIONS_INCOMPLETE:
    'Chưa hoàn tất thuyết trình (còn đội WAITING/PRESENTING), không thể khóa chấm!',
  INVALID_ROUND_STATE_SCORING_INCOMPLETE:
    'Còn bài chưa được chấm điểm, không thể khóa chấm!',
  SCORING_NOT_OPEN:
    'Chưa thể chấm điểm. Đội thi chưa lên bục trình bày (Chờ Điều phối viên khởi động).',
  NO_TEAMS_IN_ROUND: 'Không có đội tham gia vòng thi này',
  TRACK_EMPTY_TEAMS: 'Có bảng đấu chưa có đội tham gia',
  JUDGE_NOT_ASSIGNED: 'Bảng đấu chưa có giám khảo được phân công',
  ACTIVE_TEAMS_NOT_LOCKED: 'Vui lòng khóa danh sách đội thi trước khi thực hiện thao tác này.',
};

export const getRoundErrorMessage = (error) =>
  resolveUserError(error, {
    domainMap: ROUND_ERROR_MESSAGES,
    fallback: 'Lỗi khi lưu vòng thi',
  });
