/**
 * Page: StudentTeamPage
 * Chức năng: Trang chính Quản lý đội thi Hackathon dành cho sinh viên.
 * Cải tiến UI Siêu Cấp - "NỔI BẬT KHỎI BACKGROUND":
 * - Thay đổi nền trang ở Light Mode thành Nền Mesh Xám Xanh đậm đà, tạo độ tương phản 3D sắc nét.
 * - Khôi phục và kết nối hoàn hảo với StudentTeamDashboard để giữ nguyên toàn bộ tính năng nộp bài, chọn track và lịch sử mentor.
 * - Tích hợp chuẩn xác 100% với useStudentTeam, useTeamActions và useStudentInvitations!
 */
import { useState } from 'react';
import { Button, Empty, Skeleton, Typography, theme, Row, Col, Badge, Space } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ShieldAlert, Trophy, Users, Sparkles, Zap } from 'lucide-react';
import { useStudentTeam } from '../hooks/useStudentTeam';
import { useTeamActions } from '../hooks/useTeamActions';
import { useStudentInvitations } from '../../invitations/hooks/useStudentInvitations';
import StudentTeamOnboarding from '../components/StudentTeamOnboarding';
import StudentTeamDashboard from '../components/StudentTeamDashboard';

const { Title, Text } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const StudentTeamPage = () => {
  const {
    hackathonId,
    setHackathonId,
    teams,
    selectedTeam: team,
    isLoading: teamLoading,
    fetchTeams,
    refreshSelectedTeam,
  } = useStudentTeam();

  const {
    isActionLoading,
    createTeam,
    inviteMember,
    cancelPendingInvite: cancelInvite,
    leaveTeam,
    kickMember,
    transferLeader,
    disbandTeam,
    confirmTeamFormation: confirmFormation,
  } = useTeamActions({ teams, fetchTeams, refreshSelectedTeam, setHackathonId });

  const {
    invitations: invites = [],
    pendingCount: pendingInvitesCount,
    isLoading: invitesLoading,
    fetchInvitations,
    respondInvitation,
  } = useStudentInvitations();

  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const handleAcceptInvite = async (inv) => {
    try {
      const success = await respondInvitation(inv, 'ACCEPT');
      if (success) {
        await fetchTeams();
      }
    } catch (error) {
      console.error('Failed to accept invite:', error);
    }
  };

  const handleRejectInvite = async (inv) => {
    try {
      await respondInvitation(inv, 'REJECT');
    } catch (error) {
      console.error('Failed to reject invite:', error);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: isDark
          ? 'radial-gradient(circle at 10% 10%, rgba(0, 82, 156, 0.15) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(243, 112, 33, 0.12) 0%, transparent 60%), #0B0F19'
          : 'radial-gradient(circle at 15% 15%, rgba(243, 112, 33, 0.12) 0%, transparent 50%), radial-gradient(circle at 85% 85%, rgba(0, 82, 156, 0.12) 0%, transparent 50%), linear-gradient(180deg, #E2E8F0 0%, #F1F5F9 50%, #E2E8F0 100%)',
        padding: '36px 32px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* TOP HERO SECTION */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 36,
            paddingBottom: 24,
            borderBottom: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 82, 156, 0.18)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <motion.div
              whileHover={{ rotate: 15, scale: 1.08 }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 20,
                background: `linear-gradient(135deg, ${FPT.blue} 0%, #00C6FF 100%)`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: `0 10px 24px -4px rgba(0, 82, 156, 0.5), inset 0 2px 4px rgba(255,255,255,0.4)`,
                border: '2px solid rgba(255,255,255,0.3)',
                flexShrink: 0,
              }}
            >
              <Trophy size={30} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
            </motion.div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ 
                  background: isDark ? 'rgba(243, 112, 33, 0.25)' : 'rgba(243, 112, 33, 0.15)', 
                  color: isDark ? '#FF8C42' : FPT.orange, 
                  padding: '4px 12px', 
                  borderRadius: 8, 
                  fontSize: 11, 
                  fontWeight: 800, 
                  letterSpacing: '0.06em',
                  border: `1px solid rgba(243, 112, 33, 0.4)`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <Sparkles size={13} /> TRUNG TÂM CHIẾN THUẬT HACKATHON
                </span>
              </div>
              <Title level={2} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, fontSize: 30, letterSpacing: '-0.02em' }}>
                Quản Lý Đội Thi & Đội Hình
              </Title>
            </div>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <AnimatePresence mode="wait">
          {teamLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: 48,
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                borderRadius: 28,
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
                boxShadow: '0 20px 48px rgba(0,0,0,0.06)',
              }}
            >
              <Skeleton active avatar paragraph={{ rows: 6 }} />
            </motion.div>
          ) : !team ? (
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <StudentTeamOnboarding />
            </motion.div>
          ) : (
            <motion.div
              key="team-studio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <StudentTeamDashboard
                selectedTeam={team}
                hackathonId={team.hackathonId || 1}
                isActionLoading={teamLoading || isActionLoading}
                inviteMember={inviteMember}
                cancelPendingInvite={cancelInvite}
                leaveTeam={leaveTeam}
                kickMember={kickMember}
                transferLeader={transferLeader}
                disbandTeam={disbandTeam}
                confirmTeamFormation={confirmFormation}
                fetchInvitations={fetchInvitations}
                onTeamRefresh={fetchTeams}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default StudentTeamPage;
