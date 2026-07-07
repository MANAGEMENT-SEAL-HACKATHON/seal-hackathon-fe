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
  PARTICIPATION_STATUS_META,
} from '../constants/studentTeam.constants';

export const getCurrentStudentId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const fromUser = user.userId || user.id;
    if (fromUser != null && fromUser !== '') {
      return toNumber(fromUser);
    }
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (token) {
      const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
      if (base64) {
        const payload = JSON.parse(atob(base64));
        const sub = payload.sub ?? payload.userId;
        if (sub != null) return toNumber(sub);
      }
    }
    return null;
  } catch {
    return null;
  }
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? value : number;
};

const resolveTeamSizeLimits = (team) => ({
  minTeamSize: team?.minTeamSize ?? TEAM_MEMBER_LIMITS.MIN_ACCEPTED,
  maxTeamSize: team?.maxTeamSize ?? TEAM_MEMBER_LIMITS.MAX_ACCEPTED,
});

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
  const { minTeamSize, maxTeamSize } = resolveTeamSizeLimits(team);
  const statusMeta = TEAM_STATUS_META[team.status] || { label: team.status || 'N/A', color: 'default' };
  const participationRaw = String(
    team.participationStatus ?? team.lotteryStatus ?? team.lottery_status ?? '',
  ).toUpperCase();
  const participationMeta = PARTICIPATION_STATUS_META[participationRaw] || null;
  const acceptedMembers = members.filter((member) => member.isAccepted);
  const currentMember = members.find((member) => toNumber(member.userId) === toNumber(currentStudentId));
  const userEmail = (() => {
    try {
      return JSON.parse(localStorage.getItem('userInfo') || '{}').email;
    } catch {
      return null;
    }
  })();
  const isCurrentUserLeader =
    toNumber(team.leaderId) === toNumber(currentStudentId) ||
    Boolean(
      userEmail &&
      members.some(
        (member) =>
          member.roleInTeam === 'LEADER' &&
          member.isAccepted &&
          member.email === userEmail,
      ),
    );
  const isLocked = Boolean(team.isLocked);
  const formationSubmitted = Boolean(team.formationSubmittedAt);
  const isPendingTeam = team.status === TEAM_STATUS.PENDING;
  const formationGraceDeadlineAt = team.formationGraceDeadlineAt ?? null;
  const isInFormationGracePeriod =
    isPendingTeam &&
    !formationSubmitted &&
    formationGraceDeadlineAt &&
    new Date(formationGraceDeadlineAt).getTime() > Date.now();
  const leaderCanEditRoster = isPendingTeam && !isLocked && !formationSubmitted;
  const hasMentor = Boolean(
    team.hasMentor ||
    team.hasMentorAssignment ||
    team.mentorAssigned ||
    team.mentorCount > 0 ||
    team.mentorAssignedCount > 0
  );

  const canChangeMembership = [TEAM_STATUS.PENDING, TEAM_STATUS.ACTIVE].includes(team.status) && !isLocked;
  const isMemberCountReady =
    acceptedMemberCount >= minTeamSize && acceptedMemberCount <= maxTeamSize;
  const canConfirmFormation =
    isCurrentUserLeader &&
    isPendingTeam &&
    !isLocked &&
    !formationSubmitted &&
    isMemberCountReady &&
    pendingInviteCount === 0;

  return {
    key: teamId,
    id: teamId,
    hackathonId: team.hackathonId ?? team.hackathon?.id ?? null,
    hackathonName: team.hackathonName || team.hackathon?.name || 'Hackathon',
    teamName: team.teamName || 'N/A',
    trackId: team.trackId ?? null,
    trackName: team.trackName ?? null,
    assignedGroup: team.assignedGroup ?? null,
    lotteryStatus: team.lotteryStatus ?? null,
    participationStatus: participationRaw || null,
    participationLabel: participationMeta?.label ?? null,
    participationColor: participationMeta?.color ?? null,
    isAdvanced: participationRaw === 'ADVANCED',
    isEliminatedFromFinal: participationRaw === 'ELIMINATED',
    leaderId: team.leaderId,
    leaderName: team.leaderName || 'Chưa cập nhật',
    chapterId: team.chapterId,
    status: team.status,
    statusLabel: statusMeta.label,
    statusColor: statusMeta.color,
    isLocked,
    lockedAt: team.lockedAt,
    rejectionReason: team.rejectionReason,
    createdAt: team.createdAt,
    acceptedMemberCount,
    pendingInviteCount,
    minTeamSize,
    maxTeamSize,
    memberCapacityLabel: `${acceptedMemberCount}/${maxTeamSize}`,
    isMemberCountReady,
    formationSubmitted,
    formationSubmittedAt: team.formationSubmittedAt ?? null,
    formationGraceDeadlineAt,
    isInFormationGracePeriod,
    canConfirmFormation,
    isFull: acceptedMemberCount >= maxTeamSize,
    hasMentor,
    canInvite:
      leaderCanEditRoster && isCurrentUserLeader && acceptedMemberCount < maxTeamSize,
    canTransferLeader: leaderCanEditRoster && isCurrentUserLeader,
    canCancelInvite: leaderCanEditRoster && isCurrentUserLeader,
    canLeaveTeam: canChangeMembership && !isCurrentUserLeader && currentMember?.isAccepted,
    canDisband:
      isCurrentUserLeader && isPendingTeam && !isLocked && !formationSubmitted && !hasMentor,
    isCurrentUserLeader,
    currentMember,
    acceptedMembers,
    transferCandidates: acceptedMembers.filter((member) => toNumber(member.userId) !== toNumber(team.leaderId)),
    members,
  };
};
