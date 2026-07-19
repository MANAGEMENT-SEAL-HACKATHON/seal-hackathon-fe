export const TEAM_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  REJECTED: 'REJECTED',
  ELIMINATED: 'ELIMINATED',
};

export const TEAM_STATUS_COLORS = {
  [TEAM_STATUS.PENDING]: 'gold',
  [TEAM_STATUS.ACTIVE]: 'green',
  [TEAM_STATUS.REJECTED]: 'red',
  [TEAM_STATUS.ELIMINATED]: 'default',
};

export const TEAM_STATUS_LABELS = {
  [TEAM_STATUS.PENDING]: 'Chờ duyệt',
  [TEAM_STATUS.ACTIVE]: 'Đã duyệt',
  [TEAM_STATUS.REJECTED]: 'Bị từ chối',
  [TEAM_STATUS.ELIMINATED]: 'Bị loại',
};

export const MEMBER_ROLE = {
  LEADER: 'LEADER',
  MEMBER: 'MEMBER',
};

export const MEMBER_ROLE_LABELS = {
  [MEMBER_ROLE.LEADER]: 'Trưởng nhóm',
  [MEMBER_ROLE.MEMBER]: 'Thành viên',
};

export const MEMBER_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  LEFT: 'LEFT',
};

export const MEMBER_STATUS_COLORS = {
  [MEMBER_STATUS.PENDING]: 'orange',
  [MEMBER_STATUS.ACCEPTED]: 'green',
  [MEMBER_STATUS.REJECTED]: 'red',
  [MEMBER_STATUS.LEFT]: 'default',
};

export const MEMBER_STATUS_LABELS = {
  [MEMBER_STATUS.PENDING]: 'Chờ phản hồi',
  [MEMBER_STATUS.ACCEPTED]: 'Đã tham gia',
  [MEMBER_STATUS.REJECTED]: 'Đã từ chối',
  [MEMBER_STATUS.LEFT]: 'Đã rời đội',
};

export const TAB_KEYS = {
  APPROVAL: 'approval_tab',
  ALLOCATION: 'allocation_tab',
};

export const TEAM_ERROR_CODES = {
  TEAM_NAME_DUPLICATE: 'TEAM_NAME_DUPLICATE',
  TEAM_MEMBER_FULL: 'TEAM_MEMBER_FULL',
  TEAM_INVALID_MEMBER_COUNT: 'TEAM_INVALID_MEMBER_COUNT',
  INVALID_TEAM_SIZE: 'INVALID_TEAM_SIZE',
  MERGED_TEAM_TOO_LARGE: 'MERGED_TEAM_TOO_LARGE',
  TEAM_IS_FULL: 'TEAM_IS_FULL',
  TEAM_LOCKED: 'TEAM_LOCKED',
  TEAM_HAS_MENTOR: 'TEAM_HAS_MENTOR_CANNOT_DISBAND',
  TEAM_ALREADY_ACTIVE: 'TEAM_ALREADY_ACTIVE',
  TEAM_HAS_PENDING_MEMBERS: 'TEAM_HAS_PENDING_MEMBERS',
  USER_IN_ANOTHER_TEAM: 'USER_IN_ANOTHER_TEAM',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  TEAM_FORMATION_NOT_SUBMITTED: 'TEAM_FORMATION_NOT_SUBMITTED',
  HACKATHON_NOT_ONGOING: 'HACKATHON_NOT_ONGOING',
  FORBIDDEN: 'FORBIDDEN',
};

export const TEAM_ERROR_MESSAGES = {
  [TEAM_ERROR_CODES.TEAM_NAME_DUPLICATE]: 'Tên đội này đã tồn tại trong Hackathon, vui lòng chọn tên khác.',
  [TEAM_ERROR_CODES.TEAM_MEMBER_FULL]: 'Đội đã đủ 5 thành viên, không thể thêm hoặc gộp thêm.',
  [TEAM_ERROR_CODES.TEAM_INVALID_MEMBER_COUNT]: 'Đội phải có từ 3 đến 5 thành viên.',
  [TEAM_ERROR_CODES.INVALID_TEAM_SIZE]: 'Đội phải có từ 3 đến 5 thành viên.',
  [TEAM_ERROR_CODES.MERGED_TEAM_TOO_LARGE]: 'Gộp đội sẽ vượt quá 5 thành viên.',
  [TEAM_ERROR_CODES.TEAM_IS_FULL]: 'Đội đã đủ 5 thành viên, không thể thêm.',
  [TEAM_ERROR_CODES.TEAM_LOCKED]: 'Đội này đã bị khóa, không thể thay đổi thành viên hoặc thao tác thêm.',
  [TEAM_ERROR_CODES.TEAM_HAS_MENTOR]: 'Không thể giải tán đội đã được phân công Mentor.',
  [TEAM_ERROR_CODES.TEAM_ALREADY_ACTIVE]: 'Đội đã được duyệt, không thể thực hiện thao tác này.',
  [TEAM_ERROR_CODES.TEAM_HAS_PENDING_MEMBERS]: 'Đội vẫn còn lời mời chờ phản hồi, cần xử lý trước khi duyệt.',
  [TEAM_ERROR_CODES.USER_IN_ANOTHER_TEAM]: 'Có thành viên đã thuộc đội khác trong sự kiện này.',
  [TEAM_ERROR_CODES.REGISTRATION_CLOSED]: 'Đã hết hạn đăng ký đội cho sự kiện này.',
  [TEAM_ERROR_CODES.TEAM_FORMATION_NOT_SUBMITTED]:
    'Trưởng nhóm chưa xác nhận thành lập đội. Chỉ duyệt sau khi trưởng nhóm bấm xác nhận.',
  [TEAM_ERROR_CODES.HACKATHON_NOT_ONGOING]: 'Sự kiện không đang diễn ra.',
  [TEAM_ERROR_CODES.FORBIDDEN]: 'Bạn không có quyền thực hiện thao tác này.',
};

export const getTeamErrorMessage = (error, fallback) => {
  const code = error?.code || error?.data?.error?.code || error?.response?.data?.error?.code;
  return TEAM_ERROR_MESSAGES[code] || error?.message || fallback;
};
