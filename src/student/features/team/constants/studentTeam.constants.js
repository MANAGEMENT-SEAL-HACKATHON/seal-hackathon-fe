/**
 * Constants: Student Team
 * Chức năng: Chứa các hằng số cấu hình, màu sắc và thông báo lỗi tĩnh cho module Quản lý Đội.
 */
export const TEAM_MEMBER_LIMITS = {
  MIN_ACCEPTED: 3,
  MAX_ACCEPTED: 5,
};

export const TEAM_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  ELIMINATED: 'ELIMINATED',
};

export const MEMBER_ROLE = {
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
};

export const MEMBER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  LEFT: 'LEFT',
};

export const TEAM_STATUS_META = {
  [TEAM_STATUS.PENDING]: { label: 'Chờ duyệt', color: 'gold' },
  [TEAM_STATUS.ACTIVE]: { label: 'Đã duyệt', color: 'green' },
  [TEAM_STATUS.REJECTED]: { label: 'Bị từ chối', color: 'red' },
  [TEAM_STATUS.ELIMINATED]: { label: 'Bị loại', color: 'default' },
};

export const MEMBER_ROLE_META = {
  [MEMBER_ROLE.LEADER]: { label: 'Trưởng nhóm', color: 'blue' },
  [MEMBER_ROLE.MEMBER]: { label: 'Thành viên', color: 'default' },
};

export const MEMBER_STATUS_META = {
  [MEMBER_STATUS.PENDING]: { label: 'Chờ phản hồi', color: 'orange' },
  [MEMBER_STATUS.ACCEPTED]: { label: 'Đã tham gia', color: 'green' },
  [MEMBER_STATUS.REJECTED]: { label: 'Đã từ chối', color: 'red' },
  [MEMBER_STATUS.LEFT]: { label: 'Đã rời đội', color: 'default' },
};

export const TEAM_ACTION_ERROR_MESSAGES = {
  TEAM_NAME_DUPLICATE: 'Tên đội đã tồn tại trong hackathon này.',
  REGISTRATION_CLOSED: 'Đã hết hạn đăng ký hoặc thay đổi thành viên.',
  USER_IN_ANOTHER_TEAM: 'Bạn hoặc thành viên này đã thuộc đội khác trong hackathon.',
  HACKATHON_NOT_ONGOING: 'Hackathon chưa ở trạng thái đang diễn ra.',
  TEAM_LEADER_NOT_APPROVED: 'Tài khoản trưởng nhóm chưa được phê duyệt.',
  INVALID_ROLE: 'Tài khoản không có vai trò phù hợp để thao tác đội.',
  TEAM_MEMBER_FULL: 'Đội đã đủ 5 thành viên được xác nhận.',
  TEAM_LOCKED: 'Đội đã bị khóa, không thể thay đổi thành viên.',
  INVITEE_NOT_APPROVED: 'Thành viên được mời chưa được phê duyệt.',
  INVITEE_INVALID_ROLE: 'Người được mời không phải sinh viên hợp lệ.',
  NEW_LEADER_NOT_MEMBER: 'Người nhận quyền phải là thành viên đã tham gia đội.',
  NEW_LEADER_NOT_APPROVED: 'Người nhận quyền chưa được phê duyệt.',
  TEAM_HAS_MENTOR_CANNOT_DISBAND: 'Đội đã có Mentor, không thể giải tán.',
  TEAM_ALREADY_ACTIVE: 'Đội đã hoạt động, không thể thực hiện thao tác này.',
  CANNOT_DELETE_ACCEPTED_MEMBER: 'Không thể xóa thành viên đã tham gia, chỉ có thể hủy lời mời đang chờ.',
  LEADER_CANNOT_LEAVE_TEAM: 'Trưởng nhóm không thể tự rời đội. Hãy chuyển quyền trưởng nhóm trước.',
  FORBIDDEN: 'Bạn chưa có quyền thực hiện thao tác này. Hãy đăng nhập bằng tài khoản sinh viên đã được Coordinator phê duyệt.',
};

export const getStudentTeamErrorMessage = (error, fallback = 'Thao tác thất bại. Vui lòng thử lại.') => {
  const code = 
    error?.code || 
    error?.data?.code || 
    error?.data?.error?.code || 
    error?.response?.data?.error?.code ||
    error?.data?.warnings?.[0]?.code ||
    error?.response?.data?.warnings?.[0]?.code;
    
  return TEAM_ACTION_ERROR_MESSAGES[code] || error?.message || fallback;
};

