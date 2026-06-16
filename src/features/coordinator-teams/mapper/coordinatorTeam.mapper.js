import dayjs from 'dayjs';
import {
  MEMBER_ROLE_LABELS,
  MEMBER_STATUS_COLORS,
  MEMBER_STATUS_LABELS,
  TEAM_STATUS_COLORS,
  TEAM_STATUS_LABELS,
} from '../constants/team.constants';

export const mapTeamForCoordinator = (team) => {
  if (!team) return null;

  const acceptedMemberCount = team.acceptedMemberCount || 0;
  const pendingInviteCount = team.pendingInviteCount || 0;
  const hasMentor = Boolean(
    team.hasMentor ||
      team.hasMentorAssignment ||
      team.mentorAssigned ||
      team.mentorCount > 0 ||
      team.mentorAssignedCount > 0
  );

  return {
    key: team.id,
    id: team.id,
    hackathonId: team.hackathonId,
    hackathonName: team.hackathonName,
    teamName: team.teamName || 'N/A',
    leaderId: team.leaderId,
    leaderName: team.leaderName || 'N/A',
    chapterId: team.chapterId,

    acceptedMemberCount,
    pendingInviteCount,
    memberStats: `${acceptedMemberCount}/5`,
    isInvalidMemberCount: acceptedMemberCount < 3 || acceptedMemberCount > 5,
    hasPendingInvites: pendingInviteCount > 0,
    hasMentor,

    status: team.status,
    statusLabel: TEAM_STATUS_LABELS[team.status] || team.status || 'N/A',
    statusColor: TEAM_STATUS_COLORS[team.status] || 'default',
    rejectionReason: team.rejectionReason,

    registeredAt: team.createdAt ? dayjs(team.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A',
    createdAt: team.createdAt,

    isLocked: Boolean(team.isLocked),
    lockedAt: team.lockedAt ? dayjs(team.lockedAt).format('DD/MM/YYYY HH:mm') : null,

    members: Array.isArray(team.members)
      ? team.members.map((member) => ({
          userId: member.userId,
          fullName: member.fullName || 'N/A',
          email: member.email || 'N/A',
          roleInTeam: member.roleInTeam,
          roleLabel: MEMBER_ROLE_LABELS[member.roleInTeam] || member.roleInTeam || 'N/A',
          status: member.status,
          statusLabel: MEMBER_STATUS_LABELS[member.status] || member.status || 'N/A',
          statusColor: MEMBER_STATUS_COLORS[member.status] || 'default',
        }))
      : [],
  };
};
