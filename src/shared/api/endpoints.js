export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    REGISTER: '/api/v1/auth/register',
    LOGOUT: '/api/v1/auth/logout',
    OAUTH_GOOGLE_LOGIN: '/api/v1/auth/oauth/google',
    OAUTH_GITHUB_LOGIN_CODE: '/api/v1/auth/oauth/github/code',
    OAUTH_GOOGLE_LINK: '/api/v1/auth/oauth/google/link',
    OAUTH_GITHUB_LINK_CODE: '/api/v1/auth/oauth/github/link/code',
    OAUTH_GOOGLE_UNLINK: '/api/v1/auth/oauth/google/unlink',
    OAUTH_GITHUB_UNLINK: '/api/v1/auth/oauth/github/unlink',
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
  },
  HACKATHONS: {
    BASE: '/api/v1/hackathons',
    DETAIL: (id) => `/api/v1/hackathons/${id}`,
    READINESS: (id) => `/api/v1/hackathons/${id}/readiness`,
    STATUS: (id) => `/api/v1/hackathons/${id}/status`,
    ROUNDS: (hackathonId) => `/api/v1/hackathons/${hackathonId}/rounds`,
    TRACKS: (hackathonId) => `/api/v1/hackathons/${hackathonId}/tracks`,
    EVENTS: (hackathonId) => `/api/v1/hackathons/${hackathonId}/events`,
    LOTTERY: (hackathonId) => `/api/v1/hackathons/${hackathonId}/lottery`,
  },
  TEAMS: {
    BASE: '/api/v1/teams',
    BULK_APPROVE: '/api/v1/teams/bulk-approve',
    DETAIL: (teamId) => `/api/v1/teams/${teamId}`,
    STATUS: (teamId) => `/api/v1/teams/${teamId}/status`,
    APPROVE: (teamId) => `/api/v1/teams/${teamId}/approve`,
    TRANSFER_LEADER: (teamId) => `/api/v1/teams/${teamId}/transfer-leader`,
    
    INVITE_MEMBER: (teamId) => `/api/v1/teams/${teamId}/members/invite`,
    MEMBER_DETAIL: (teamId, userId) => `/api/v1/teams/${teamId}/members/${userId}`,
    
    // FR-13B-R: Đổi track (Đã gộp cả UPDATE_TRACK và TRACK để không bị lỗi)
    UPDATE_TRACK: (teamId, roundId) => `/api/v1/teams/${teamId}/rounds/${roundId}/track`,
    TRACK: (teamId, roundId) => `/api/v1/teams/${teamId}/rounds/${roundId}/track`, 
    
    // FR-13C: Quản lý Mentor theo vòng
    MENTOR: (teamId, roundId) => `/api/v1/teams/${teamId}/rounds/${roundId}/mentor`,
    MENTOR_HISTORY: (teamId) => `/api/v1/teams/${teamId}/mentors`,
  },
  ROUNDS: {
    BASE: '/api/v1/rounds',
    DETAIL: (id) => `/api/v1/rounds/${id}`,
    TRACKS: (roundId) => `/api/v1/rounds/${roundId}/tracks`,
    CRITERIA: (roundId) => `/api/v1/rounds/${roundId}/criteria`,
    CRITERIA_CLONE: (roundId) => `/api/v1/rounds/${roundId}/criteria/clone`,
    ACTIVATE: (id) => `/api/v1/rounds/${id}/activate`,
  },
  TRACKS: {
    BASE: '/api/v1/tracks',
    DETAIL: (id) => `/api/v1/tracks/${id}`,
    CRITERIA: (trackId) => `/api/v1/tracks/${trackId}/criteria`,
    CRITERIA_CLONE: (trackId) => `/api/v1/tracks/${trackId}/criteria/clone`,
  },
  CRITERIA: {
    DETAIL: (id) => `/api/v1/criteria/${id}`,
  },
  EVENTS: {
    DETAIL: (id) => `/api/v1/events/${id}`,
  },
  USERS: {
    ME: '/api/v1/users/me',
    ME_STUDENT_CARD: '/api/v1/users/me/student-card',
    STATUS: (userId) => `/api/v1/users/${userId}/status`,
    LIST: '/api/v1/users',
    DETAIL: (userId) => `/api/v1/users/${userId}`,
    TEMP_JUDGES: '/api/v1/users/temp-judges',
    RESEND_INVITATION: (invitationId) => `/api/v1/invitations/${invitationId}/resend`,
  },
};