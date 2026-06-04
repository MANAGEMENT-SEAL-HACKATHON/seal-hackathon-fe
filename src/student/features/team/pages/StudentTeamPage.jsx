/**
 * Page: StudentTeamPage
 * Chức năng: Trang gốc điều phối luồng dữ liệu (Container) cho toàn bộ không gian Quản lý đội thi. Quyết định hiển thị Onboarding hay Dashboard.
 */
import { useState } from 'react';
import { Button, Card, Drawer, Grid, Skeleton, Space, Typography, theme } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { LockKeyhole } from 'lucide-react';
import { useStudentTeam } from '../hooks/useStudentTeam';
import { useTeamActions } from '../hooks/useTeamActions';
import { useStudentInvitations } from '../../invitations/hooks/useStudentInvitations';
import StudentInvitationsPage from '../../invitations/pages/StudentInvitationsPage';
import StudentTeamOnboarding from '../components/StudentTeamOnboarding';
import StudentTeamDashboard from '../components/StudentTeamDashboard';

const { Text, Title } = Typography;

const StudentTeamPage = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  if (userInfo.status !== 'APPROVED') {
    return <StudentTeamAccessNotice userInfo={userInfo} />;
  }

  return <StudentTeamWorkspace />;
};

const StudentTeamAccessNotice = ({ userInfo }) => {
  const { token } = theme.useToken();

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 64 }}>
      <Card
        style={{
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowTertiary,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: 0 } }}
      >
        <div
          style={{
            padding: '42px 32px',
            background: `linear-gradient(135deg, rgba(250,173,20,0.14), ${token.colorBgContainer} 56%, rgba(19,194,194,0.12))`,
            textAlign: 'center',
          }}
        >
          <Space direction="vertical" size={16} align="center" style={{ width: '100%' }}>
            <span
              style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                color: '#faad14',
                background: 'rgba(250,173,20,0.16)',
                border: '1px solid rgba(250,173,20,0.28)',
              }}
            >
              <LockKeyhole size={30} />
            </span>
            <div>
              <Title level={2} style={{ margin: 0 }}>
                Chờ duyệt tài khoản
              </Title>
              <Text style={{ display: 'block', marginTop: 10, color: token.colorTextSecondary, fontSize: 16 }}>
                Tài khoản {userInfo.fullName || userInfo.email || 'của bạn'} cần được Coordinator phê duyệt trước khi quản lý đội thi.
              </Text>
            </div>
            <Text type="secondary">
              Khi trạng thái chuyển sang “Đã được duyệt”, mục Quản lý đội sẽ mở đầy đủ chức năng tạo đội, mời thành viên và chuyển leader.
            </Text>
          </Space>
        </div>
      </Card>
    </div>
  );
};

const StudentTeamWorkspace = () => {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [forceShowMenu, setForceShowMenu] = useState(true);
  const [isInvitationsDrawerOpen, setIsInvitationsDrawerOpen] = useState(false);

  const {
    hackathonId,
    setHackathonId,
    teams,
    selectedTeam,
    isLoading,
    fetchTeams,
    refreshSelectedTeam,
  } = useStudentTeam();

  const {
    isActionLoading,
    createTeam,
    inviteMember,
    cancelPendingInvite,
    leaveTeam,
    transferLeader,
    disbandTeam,
  } = useTeamActions({
    teams,
    fetchTeams,
    refreshSelectedTeam,
    setHackathonId,
  });

  const {
    pendingCount,
    fetchInvitations,
  } = useStudentInvitations();

  const hasTeams = teams.length > 0;

  const handleCreateTeam = async (payload) => {
    const success = await createTeam(payload);
    if (success) {
      setForceShowMenu(false);
    }
    return success;
  };
  
  const handleInvitationActionSuccess = () => {
    fetchTeams();
    fetchInvitations();
    if (teams.length === 0) {
      setIsInvitationsDrawerOpen(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 64 }}>
      {/* Dynamic Glassmorphism Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
          padding: '40px 48px',
          marginBottom: 32,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 50%, #13c2c2 100%)',
          boxShadow: '0 24px 48px rgba(0, 58, 140, 0.15)',
          color: '#fff',
        }}
      >
        {/* Decorative Floating Orbs */}
        <div style={{ position: 'absolute', top: -50, right: '20%', width: 300, height: 300, background: 'rgba(19, 194, 194, 0.4)', filter: 'blur(80px)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, left: '10%', width: 250, height: 250, background: 'rgba(24, 144, 255, 0.4)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }} />
        
        {/* Abstract pattern overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600 }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {hasTeams && !forceShowMenu && (
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />} 
                onClick={() => setForceShowMenu(true)}
                style={{ color: 'rgba(255,255,255,0.85)', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center' }}
              >
                Quay lại Menu
              </Button>
            )}
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontSize: 13, display: 'block', marginBottom: 8 }}>
              Workspace
            </Text>
            <Title level={1} style={{ margin: 0, color: '#fff', fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, textShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              Quản lý đội
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginTop: 12, display: 'block', lineHeight: 1.6 }}>
              Không gian quản lý thành viên, theo dõi trạng thái duyệt đội và thiết lập chiến thuật xuất sắc nhất cho Hackathon.
            </Text>
          </motion.div>
        </div>
        
      </motion.div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Skeleton active paragraph={{ rows: 12 }} />
          </motion.div>
        ) : (!hasTeams || forceShowMenu) ? (
          <StudentTeamOnboarding 
            hackathonId={hackathonId}
            hasTeams={hasTeams}
            setForceShowMenu={setForceShowMenu}
            setIsInvitationsDrawerOpen={setIsInvitationsDrawerOpen}
            invitationsCount={pendingCount}
            onCreateTeam={handleCreateTeam}
            isActionLoading={isActionLoading}
          />
        ) : (
          <StudentTeamDashboard 
            selectedTeam={selectedTeam}
            isActionLoading={isActionLoading}
            inviteMember={inviteMember}
            cancelPendingInvite={cancelPendingInvite}
            leaveTeam={leaveTeam}
            transferLeader={transferLeader}
            disbandTeam={disbandTeam}
            fetchInvitations={fetchInvitations}
          />
        )}
      </AnimatePresence>

      {/* Invitations Drawer */}
      <Drawer
        title={<span style={{ fontSize: 18, fontWeight: 700 }}>Hộp thư Lời mời</span>}
        placement="right"
        width={screens.md ? 800 : '100%'}
        onClose={() => setIsInvitationsDrawerOpen(false)}
        open={isInvitationsDrawerOpen}
        styles={{ body: { padding: '24px', background: token.colorBgLayout } }}
      >
        <StudentInvitationsPage onActionSuccess={handleInvitationActionSuccess} hasTeams={hasTeams} />
      </Drawer>
    </div>
  );
};

export default StudentTeamPage;

