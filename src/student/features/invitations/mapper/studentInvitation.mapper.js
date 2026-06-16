/**
 * Mapper: Student Invitation
 * Chức năng: Chuyển đổi dữ liệu đội thi và trạng thái thành viên từ Backend thành định dạng hiển thị cho Lời mời.
 */
import { INVITATION_STATUS_META } from '../constants/studentInvitation.constants';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const sameValue = (left, right) => String(left || '') === String(right || '');

export const mapTeamToInvitation = (team) => {
  if (!team) return null;

  const currentUser = getCurrentUser();
  const members = Array.isArray(team.members) ? team.members : [];
  const currentMember = members.find(
    (member) =>
      sameValue(member.userId, currentUser.userId || currentUser.id) ||
      sameValue(member.email, currentUser.email)
  );

  if (!currentMember) return null;

  const statusMeta = INVITATION_STATUS_META[currentMember.status] || {
    label: currentMember.status || 'N/A',
    color: 'default',
  };

  return {
    key: `${team.id}-${currentMember.userId}`,
    teamId: team.id,
    hackathonId: team.hackathonId,
    hackathonName: team.hackathonName || 'Hackathon',
    teamName: team.teamName || 'N/A',
    leaderName: team.leaderName || 'N/A',
    userId: currentMember.userId || currentUser.userId || currentUser.id,
    memberStatus: currentMember.status,
    memberStatusLabel: statusMeta.label,
    memberStatusColor: statusMeta.color,
    roleInTeam: currentMember.roleInTeam,
    acceptedMemberCount: team.acceptedMemberCount || 0,
    pendingInviteCount: team.pendingInviteCount || 0,
    isLocked: Boolean(team.isLocked),
    createdAt: team.createdAt,
    canAccept: currentMember.status === 'PENDING' && !team.isLocked,
    canReject: currentMember.status === 'PENDING' && !team.isLocked,
  };
};

