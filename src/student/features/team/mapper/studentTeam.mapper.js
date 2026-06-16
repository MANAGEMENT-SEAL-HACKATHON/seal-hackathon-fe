/**
 * Mapper: Student Team
 * Chức năng: Biến đổi dữ liệu (Data mapping) từ API Backend thành định dạng chuẩn hóa phù hợp để hiển thị trên UI.
 */
import {
  MEMBER_ROLE_META,
  MEMBER_STATUS,
  MEMBER_STATUS_META,
  TEAM_MEMBER_LIMITS,
  TEAM_STATUS,
  TEAM_STATUS_META,
} from '../constants/studentTeam.constants';

export const getCurrentStudentId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return user.userId || user.id || null;
  } catch {
    return null;
  }
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
};

export const mapStudentTeamMember = (member) => {
  if (!member) return null;

  const roleMeta = MEMBER_ROLE_META[member.roleInTeam] || { label: member.roleInTeam || 'N/A', color: 'default' };
  const statusMeta = MEMBER_STATUS_META[member.status] || { label: member.status || 'N/A', color: 'default' };

  return {
    userId: member.userId,
    fullName: member.fullName || 'N/A',
    email: member.email || 'N/A',
    roleInTeam: member.roleInTeam,
    roleLabel: roleMeta.label,
    roleColor: roleMeta.color,
    status: member.status,
    statusLabel: statusMeta.label,
    statusColor: statusMeta.color,
    isAccepted: member.status === MEMBER_STATUS.ACCEPTED,
    isPending: member.status === MEMBER_STATUS.PENDING,
  };
};

export const mapStudentTeam = (team) => {
  if (!team) return null;

  const teamId = team.teamId ?? team.id;
  const currentStudentId = getCurrentStudentId();
  const members = Array.isArray(team.members) ? team.members.map(mapStudentTeamMember).filter(Boolean) : [];
  const acceptedMemberCount = team.acceptedMemberCount ?? members.filter((member) => member.isAccepted).length;
  const pendingInviteCount = team.pendingInviteCount ?? members.filter((member) => member.isPending).length;
  const statusMeta = TEAM_STATUS_META[team.status] || { label: team.status || 'N/A', color: 'default' };
  const acceptedMembers = members.filter((member) => member.isAccepted);
  const currentMember = members.find((member) => toNumber(member.userId) === toNumber(currentStudentId));
  const isCurrentUserLeader = toNumber(team.leaderId) === toNumber(currentStudentId);
  const canChangeMembership = [TEAM_STATUS.PENDING, TEAM_STATUS.ACTIVE].includes(team.status) && !team.isLocked;
  const canTransferLeaderByStatus = team.status === TEAM_STATUS.PENDING && !team.isLocked;
  const hasMentor = Boolean(
    team.hasMentor ||
      team.hasMentorAssignment ||
      team.mentorAssigned ||
      team.mentorCount > 0 ||
      team.mentorAssignedCount > 0
  );

  return {
    key: teamId,
    id: teamId,
    hackathonId: team.hackathonId,
    hackathonName: team.hackathonName || 'Hackathon',
    teamName: team.teamName || 'N/A',
    trackId: team.trackId ?? null,
    trackName: team.trackName ?? null,
    assignedGroup: team.assignedGroup ?? null,
    lotteryStatus: team.lotteryStatus ?? null,
    leaderId: team.leaderId,
    leaderName: team.leaderName || 'N/A',
    chapterId: team.chapterId,
    status: team.status,
    statusLabel: statusMeta.label,
    statusColor: statusMeta.color,
    isLocked: Boolean(team.isLocked),
    lockedAt: team.lockedAt,
    rejectionReason: team.rejectionReason,
    createdAt: team.createdAt,
    acceptedMemberCount,
    pendingInviteCount,
    memberCapacityLabel: `${acceptedMemberCount}/${TEAM_MEMBER_LIMITS.MAX_ACCEPTED}`,
    isMemberCountReady:
      acceptedMemberCount >= TEAM_MEMBER_LIMITS.MIN_ACCEPTED &&
      acceptedMemberCount <= TEAM_MEMBER_LIMITS.MAX_ACCEPTED,
    isFull: acceptedMemberCount >= TEAM_MEMBER_LIMITS.MAX_ACCEPTED,
    hasMentor,
    canInvite:
      canChangeMembership &&
      isCurrentUserLeader &&
      acceptedMemberCount < TEAM_MEMBER_LIMITS.MAX_ACCEPTED,
    canTransferLeader: canTransferLeaderByStatus && isCurrentUserLeader,
    canLeaveTeam: canChangeMembership && !isCurrentUserLeader && currentMember?.isAccepted,
    canDisband:
      isCurrentUserLeader &&
      [TEAM_STATUS.PENDING, TEAM_STATUS.ACTIVE].includes(team.status) &&
      !team.isLocked &&
      !hasMentor,
    isCurrentUserLeader,
    currentMember,
    acceptedMembers,
    transferCandidates: acceptedMembers.filter((member) => toNumber(member.userId) !== toNumber(team.leaderId)),
    members,
  };
};

