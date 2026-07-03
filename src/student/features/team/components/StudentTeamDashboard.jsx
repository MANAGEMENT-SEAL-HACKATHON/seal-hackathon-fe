/**
 * Component: StudentTeamDashboard
 * Chức năng: Layout chính của màn hình quản lý đội (khi sinh viên đã có đội). Bao gồm danh sách thành viên và thông tin tổng quan.
 */
import { Row, Col, Space, Collapse } from 'antd';
import { motion } from 'framer-motion';
import TeamMemberManager from './TeamMemberManager';
import TeamOverviewCard from './TeamOverviewCard';
import FinalSubmissionPanel from '../../submission/components/FinalSubmissionPanel';
import RoundProblemPanel from '../../round/components/RoundProblemPanel';
import FinalRoundProblemPanel from '../../round/components/FinalRoundProblemPanel';
import StudentFallTrackSelectCard from './StudentFallTrackSelectCard';
import StudentRelotteryTrackCard from './StudentRelotteryTrackCard';
import TeamJourneyPanel from '../../../../features/teams/components/TeamJourneyPanel';
import TeamMentorHistoryPanel from '../../../../features/teams/components/TeamMentorHistoryPanel';

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
    >
      <Row gutter={[32, 32]}>
        <Col xs={24} lg={15} xl={16}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
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
            {selectedTeam?.id && effectiveHackathonId && (
              <RoundProblemPanel
                team={selectedTeam}
                hackathonId={effectiveHackathonId}
              />
            )}
            {selectedTeam?.id && effectiveHackathonId && (
              <FinalRoundProblemPanel
                teamId={selectedTeam.id}
                hackathonId={effectiveHackathonId}
              />
            )}
            {selectedTeam?.id && effectiveHackathonId && (
              <FinalSubmissionPanel
                teamId={selectedTeam.id}
                hackathonId={effectiveHackathonId}
              />
            )}
            {selectedTeam?.id && (
              <Collapse
                items={[
                  {
                    key: 'journey',
                    label: 'Hành trình đội',
                    children: (
                      <TeamJourneyPanel
                        teamId={selectedTeam.id}
                        teamName={selectedTeam.teamName}
                      />
                    ),
                  },
                  {
                    key: 'mentors',
                    label: 'Lịch sử mentor',
                    children: (
                      <TeamMentorHistoryPanel
                        teamId={selectedTeam.id}
                        teamName={selectedTeam.teamName}
                      />
                    ),
                  },
                ]}
              />
            )}
          </Space>
        </Col>

        <Col xs={24} lg={9} xl={8}>
          <div style={{ position: 'sticky', top: 24 }}>
            <TeamOverviewCard
              team={selectedTeam}
              onConfirmFormation={confirmTeamFormation}
              actionLoading={isActionLoading}
            />
          </div>
        </Col>
      </Row>
    </motion.div>
  );
};

export default StudentTeamDashboard;
