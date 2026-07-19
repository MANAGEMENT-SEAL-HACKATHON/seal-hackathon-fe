// src/shared/constants/teamErrors.js
import { resolveUserError } from '../errors/resolveUserError';

export const TEAM_ERROR_MESSAGES = {
  // Lỗi Bốc thăm & Track
  ROUND_ALREADY_ACTIVE: 'Vòng thi đã được kích hoạt, không thể thực hiện thao tác lúc này.',
  TRACK_GROUP_FULL: 'Bảng đấu này đã đạt giới hạn tối đa số lượng đội. Vui lòng chọn bảng khác.',
  TEAM_ALREADY_IN_TRACK_THIS_ROUND: 'Đội này đã được xếp vào một bảng đấu trong vòng thi này rồi.',
  HACKATHON_NOT_ONGOING: 'Kỳ Hackathon chưa mở hoặc không còn đang diễn ra.',
  HACKATHON_ARCHIVED: 'Kỳ Hackathon đã kết thúc — chỉ xem lịch sử, không thể thay đổi.',
  CROSS_HACKATHON_VIOLATION: 'Đội và tài nguyên không cùng một kỳ Hackathon.',
  TEAM_ROUND_PARTICIPATION_MISSING: 'Đội thi chưa có quyền tham gia vòng này. Vui lòng bốc thăm Sơ loại trước.',
  RESOURCE_NOT_FOUND:
    'Đội thi chưa được phân bảng trong vòng này. Hãy hoàn tất kết thúc đăng ký, khóa đội và bốc thăm trước.',
  ACTIVE_TEAMS_NOT_LOCKED: 'Vui lòng khóa danh sách đội thi trước khi thực hiện thao tác này.',
  TEAMS_PENDING_APPROVAL:
    'Còn đội đang chờ xử lý (chờ duyệt / 24h suy nghĩ). Hãy duyệt hoặc từ chối hết trước khi bốc thăm / kích hoạt sơ loại.',
  REGISTRATION_ALREADY_CLOSED: 'Đăng ký đã kết thúc trước đó — không thể kết thúc đăng ký sớm lần nữa.',
  REGISTRATION_CLOSED: 'Đăng ký đã đóng. Không thể bốc thăm hoặc đổi bảng lúc này.',
  TRACK_CLOSED: 'Bảng đấu đã đóng — không thể chuyển đội vào bảng này.',
  TEAM_NOT_ACTIVE: 'Đội thi chưa được duyệt / chưa ở trạng thái sẵn sàng.',

  // Lỗi phân công Mentor (FR-13C)
  MENTOR_ASSIGNMENT_NOT_FOR_FINAL_ROUND: 'Không thể phân công Mentor hỗ trợ đội thi tại Vòng Chung kết.',
  TEAM_ALREADY_HAS_MENTOR_IN_ROUND: 'Đội này đã được phân công Mentor trong vòng thi hiện tại.',
  TEAM_NOT_IN_ROUND: 'Đội thi chưa được bốc thăm vào vòng này.',

  // Lỗi phân công Giám khảo (Judge Panel & Cross-Validation)
  CONFLICT_MENTOR_JUDGE_SAME_ROUND_TRACK: 'Một người không thể vừa là mentor vừa là giám khảo của cùng một bảng đấu.',
  CONFLICT_SAME_TRACK: 'Người này đã có vai trò xung đột trên bảng đấu này.',
  JUDGE_ALREADY_ASSIGNED_TO_TRACK: 'Giám khảo này đã được phân công vào hạng mục này rồi.',
  INTERNAL_JUDGE_NOT_ALLOWED_IN_FINAL: 'Giảng viên nội bộ không được phép chấm thi tại Vòng Chung kết.',
  ROUND_HAS_SCORES: 'Không thể gỡ phân công vì Giám khảo đã có điểm chấm thực tế trong vòng này.',

  // Lỗi Lời mời & Thành viên
  DUPLICATE_PENDING_INVITATION: 'Đã có lời mời đang chờ phản hồi cho email này.',
  INVITATION_RESEND_AFTER_KICKOFF_CUTOFF: 'Chỉ được gửi lại lời mời trước khi sự kiện Khai mạc diễn ra 48 giờ.',

  TEAM_LOCKED: 'Hệ thống đã khóa danh sách đội thi do quá hạn đăng ký.',
  TEAM_NOT_LOCKED:
    'Chưa thể bốc thăm: đội thi chưa bị khóa. Hãy kết thúc đăng ký (hoặc dùng «Kết thúc đăng ký sớm») để khóa đội trước.',
  JUDGE_FINAL_AT_PHASE1: 'Không thể gán Giám khảo Chung kết ở giai đoạn đầu. Chỉ gán giám khảo Sơ loại theo bảng đấu.',
  EVENT_ORDER_VIOLATION: 'Thứ tự sự kiện không hợp lệ: tạo Khai mạc trước Workshop; trên lịch Workshop phải trước Khai mạc và khác ngày.',
  INVALID_SLIDE_FORMAT: 'Link slide phải trỏ tới file PDF (.pdf).',
};

export const getTeamErrorMessage = (error) =>
  resolveUserError(error, {
    domainMap: TEAM_ERROR_MESSAGES,
    fallback: 'Đã có lỗi xảy ra khi xử lý dữ liệu.',
  });
