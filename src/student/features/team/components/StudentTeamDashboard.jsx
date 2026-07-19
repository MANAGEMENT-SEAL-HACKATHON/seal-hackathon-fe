/**
 * Component: StudentTeamDashboard
 * Chức năng: Layout chính của màn hình quản lý đội.
 * Kiến trúc UI mới: Chuyển từ chia 2 cột cồng kềnh sang bố cục Không gian Chỉ huy 1 cột (Single-Column Enterprise Workspace),
 * chuẩn Linear / Vercel / GitHub. Đảm bảo thoáng đãng, sang trọng, đầy đủ 100% tính năng.
 */
import { Space } from 'antd';
import { motion } from 'framer-motion';
import TeamMemberManager from './TeamMemberManager';
import TeamOverviewCard from './TeamOverviewCard';
import FormationGraceBanner from './FormationGraceBanner';
import StudentFallTrackSelectCard from './StudentFallTrackSelectCard';
import StudentRelotteryTrackCard from './StudentRelotteryTrackCard';
import TeamMentorHistoryPanel from '../../../../features/teams/components/TeamMentorHistoryPanel';
import TeamScoreBreakdownCard from './TeamScoreBreakdownCard';

const StudentTeamDashboard = ({ 
  selectedTeam, 
  hackathonId,
  isActionLoading, 
  inviteMember, 
  cancelPendingInvite, 
  leaveTeam, 
  kickMember,
  transferLeader, 
  disbandTeam, 
  confirmTeamFormation,
  fetchInvitations,
  onTeamRefresh,
}) => {
  const effectiveHackathonId = selectedTeam?.hackathonId || hackathonId;

  return (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        paddingBottom: 48,
      }}
    >
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        {/* 0. GRACE URGENCY — leader + member đều thấy trước mọi thứ */}
        <FormationGraceBanner
          team={selectedTeam}
          onConfirmFormation={confirmTeamFormation}
          actionLoading={isActionLoading}
          onExpired={() => onTeamRefresh?.()}
        />

        {/* 1. HERO TOURNAMENT BANNER STRIP (Full Width) */}
        <TeamOverviewCard
          team={selectedTeam}
          onConfirmFormation={confirmTeamFormation}
          actionLoading={isActionLoading}
        />

        {/* 2. TRACK SELECTION PANELS (If needed) */}
        {(selectedTeam?.canTransferLeader ||
          selectedTeam?.canConfirmFormation ||
          selectedTeam?.isCurrentUserLeader) &&
          effectiveHackathonId &&
          !selectedTeam?.trackId && (
          <StudentFallTrackSelectCard
            hackathonId={effectiveHackathonId}
            teamId={selectedTeam.id}
            currentTrackId={selectedTeam.trackId}
            onSelected={() => onTeamRefresh?.()}
          />
        )}
        {selectedTeam?.trackId && effectiveHackathonId && (
          <StudentRelotteryTrackCard
            hackathonId={effectiveHackathonId}
            teamId={selectedTeam.id}
            team={selectedTeam}
            onChanged={() => onTeamRefresh?.()}
          />
        )}

        {/* 3. ROSTER COMMAND WORKSPACE (Full Width - Clean Roster Table/List) */}
        <TeamMemberManager
          team={selectedTeam}
          loading={isActionLoading}
          onInviteMember={inviteMember}
          onCancelInvite={cancelPendingInvite}
          onLeaveTeam={async (teamId) => {
            const success = await leaveTeam(teamId);
            if (success) fetchInvitations();
          }}
          onKickMember={kickMember}
          onTransferLeader={transferLeader}
          onDisbandTeam={async (teamId) => {
            const success = await disbandTeam(teamId);
            if (success) fetchInvitations();
          }}
        />

        {/* 4. ĐIỂM ĐỘI (sau công bố — giám khảo ẩn danh) */}
        {selectedTeam?.id && (
          <TeamScoreBreakdownCard teamId={selectedTeam.id ?? selectedTeam.teamId} />
        )}

        {/* 5. MENTOR PROFILE CARD */}
        {selectedTeam?.id && (
          <TeamMentorHistoryPanel
            teamId={selectedTeam.id}
          />
        )}
      </Space>
    </motion.div>
  );
};

export default StudentTeamDashboard;
