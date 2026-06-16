/**
 * Component: StudentTeamDashboard
 * Chức năng: Layout chính của màn hình quản lý đội (khi sinh viên đã có đội). Bao gồm danh sách thành viên và thông tin tổng quan.
 */
import React from 'react';
import { Row, Col, Space } from 'antd';
import { motion } from 'framer-motion';
import TeamMemberManager from './TeamMemberManager';
import TeamOverviewCard from './TeamOverviewCard';

const StudentTeamDashboard = ({ 
  selectedTeam, 
  isActionLoading, 
  inviteMember, 
  cancelPendingInvite, 
  leaveTeam, 
  transferLeader, 
  disbandTeam, 
  fetchInvitations 
}) => {
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
            <TeamMemberManager
              team={selectedTeam}
              loading={isActionLoading}
              onInviteMember={inviteMember}
              onCancelInvite={cancelPendingInvite}
              onLeaveTeam={async (teamId) => {
                const success = await leaveTeam(teamId);
                if (success) fetchInvitations();
              }}
              onTransferLeader={transferLeader}
              onDisbandTeam={async (teamId) => {
                const success = await disbandTeam(teamId);
                if (success) fetchInvitations();
              }}
            />
          </Space>
        </Col>

        <Col xs={24} lg={9} xl={8}>
          <div style={{ position: 'sticky', top: 24 }}>
            <TeamOverviewCard team={selectedTeam} />
          </div>
        </Col>
      </Row>
    </motion.div>
  );
};

export default StudentTeamDashboard;

