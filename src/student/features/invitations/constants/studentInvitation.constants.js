/**
 * Constants: Student Invitation
 * Chức năng: Chứa các hằng số, trạng thái hiển thị và thông báo lỗi cho module Hộp thư Lời mời.
 */
export const INVITATION_ACTION = {
  ACCEPT: 'ACCEPT',
  REJECT: 'REJECT',
};

export const INVITATION_STATUS_META = {
  PENDING: { label: 'Chờ phản hồi', color: 'gold' },
  ACCEPTED: { label: 'Đã tham gia', color: 'green' },
  REJECTED: { label: 'Đã từ chối', color: 'red' },
  LEFT: { label: 'Đã rời đội', color: 'default' },
};

export const INVITATION_ERROR_MESSAGES = {
  TEAM_LOCKED: 'Đội đã bị khóa, không thể thay đổi thành viên.',
  REGISTRATION_CLOSED: 'Đã hết hạn đăng ký hoặc phản hồi lời mời.',
  USER_IN_ANOTHER_TEAM: 'Bạn đã thuộc đội khác trong hackathon này.',
  LEADER_CANNOT_LEAVE_TEAM: 'Trưởng nhóm không thể tự rời đội. Hãy chuyển quyền trước.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
};

export const getInvitationErrorMessage = (error, fallback = 'Thao tác thất bại. Vui lòng thử lại.') => {
  const code = error?.code || error?.data?.error?.code || error?.response?.data?.error?.code;
  return INVITATION_ERROR_MESSAGES[code] || error?.message || fallback;
};

