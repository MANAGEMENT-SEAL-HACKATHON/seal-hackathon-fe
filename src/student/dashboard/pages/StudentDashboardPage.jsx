import { Grid, Skeleton, Space, Typography } from 'antd';
import { motion } from 'framer-motion';
import { CalendarClock, CheckCircle2, ClipboardList, ShieldCheck, UsersRound } from 'lucide-react';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import ProfileStatusBanner from '../components/ProfileStatusBanner';
import HackathonTimeline from '../components/HackathonTimeline';
import TeamOverviewWidget from '../components/TeamOverviewWidget';
import LiveCountdownWidget from '../components/LiveCountdownWidget';
import FinalSubmissionPanel from '../../features/submission/components/FinalSubmissionPanel';

const { Text, Title } = Typography;

const STATUS_LABEL = {
  APPROVED: 'Đã được duyệt',
  PENDING: 'Chờ duyệt tài khoản',
  REJECTED: 'Đã bị từ chối',
};

const getDisplayName = (user) => user?.fullName || user?.email || 'Sinh viên';

const getHackathonName = (hackathon, selectedTeam) =>
  hackathon?.name || hackathon?.hackathonName || selectedTeam?.hackathonName || 'Chưa có hackathon đang mở';

const getMissionState = (user, selectedTeam) => {
  if (user?.status !== 'APPROVED') {
    return {
      label: 'Chờ duyệt tài khoản',
      title: 'Tài khoản của bạn đang chờ Coordinator phê duyệt',
      description: 'Sau khi được duyệt, bạn mới có thể tạo đội, nhận lời mời và theo dõi đầy đủ tiến độ Hackathon.',
      icon: ShieldCheck,
      color: '#faad14',
    };
  }

  if (!selectedTeam) {
    return {
      label: 'Đã được duyệt',
      title: `Xin chào, ${getDisplayName(user)}`,
      description: 'Bạn đã sẵn sàng tham gia. Bước tiếp theo là tạo đội hoặc xử lý lời mời vào đội.',
      icon: ClipboardList,
      color: '#67e8f9',
    };
  }

  return {
    label: 'Đã được duyệt',
    title: `Xin chào, ${getDisplayName(user)}`,
    description: `${selectedTeam.teamName} đang có ${selectedTeam.acceptedMemberCount || 0} thành viên đã tham gia.`,
    icon: CheckCircle2,
    color: '#67e8f9',
  };
};

const StudentDashboardPage = () => {
  const screens = Grid.useBreakpoint();
  const {
    user,
    activeHackathon,
    selectedTeam,
    isLoading: isDashboardLoading,
    isTeamLoading,
  } = useStudentDashboard();
  const mission = getMissionState(user, selectedTeam);
  const MissionIcon = mission.icon;
  const hackathonName = getHackathonName(activeHackathon, selectedTeam);

  if (isDashboardLoading && !user?.email) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  return (
    <Space
      direction="vertical"
      size={20}
      style={{
        width: '100%',
        maxWidth: 1240,
        margin: '0 auto',
        paddingBottom: 64,
      }}
    >
      <ProfileStatusBanner user={user} />

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
          padding: screens.md ? '40px 48px' : '28px 24px',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, #001529 0%, #003a8c 50%, #13c2c2 100%)',
          boxShadow: '0 24px 48px rgba(0, 58, 140, 0.15)',
          color: '#fff',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: '18%',
            width: 300,
            height: 300,
            background: 'rgba(19,194,194,0.4)',
            filter: 'blur(80px)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            left: '8%',
            width: 250,
            height: 250,
            background: 'rgba(24,144,255,0.4)',
            filter: 'blur(60px)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.06) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: screens.lg ? '1.35fr 0.65fr' : '1fr',
            gap: 24,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 8,
                color: user?.status === 'APPROVED' ? '#67e8f9' : '#ffe58f',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.18)',
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              <MissionIcon size={16} />
              <span>{mission.label}</span>
            </div>

            <Title
              level={1}
              style={{
                margin: 0,
                maxWidth: 760,
                fontSize: screens.md ? 38 : 29,
                lineHeight: 1.12,
                fontWeight: 800,
                letterSpacing: 0,
                color: '#fff',
                textShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {mission.title}
            </Title>
            <Text
              style={{
                display: 'block',
                maxWidth: 680,
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {mission.description}
            </Text>
          </div>

          <div
            style={{
              borderRadius: 8,
              padding: 18,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 18px 40px rgba(0,0,0,0.12)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <Space direction="vertical" size={14} style={{ width: '100%' }}>
              <Text strong style={{ color: 'rgba(255,255,255,0.82)' }}>
                Tổng quan nhanh
              </Text>
              <div style={{ display: 'grid', gap: 10 }}>
                <MiniStat
                  icon={<ShieldCheck size={18} />}
                  label="Tài khoản"
                  value={STATUS_LABEL[user?.status] || user?.status || 'Chờ duyệt tài khoản'}
                  color={user?.status === 'APPROVED' ? '#67e8f9' : '#ffe58f'}
                />
                <MiniStat
                  icon={<UsersRound size={18} />}
                  label="Đội hiện tại"
                  value={selectedTeam?.teamName || 'Chưa có đội'}
                  color="#13c2c2"
                />
                <MiniStat
                  icon={<CalendarClock size={18} />}
                  label="Hackathon"
                  value={hackathonName}
                  color="#fa8c16"
                />
              </div>
            </Space>
          </div>
        </div>
      </motion.section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: screens.xl ? 'minmax(0, 1.15fr) minmax(320px, 0.85fr)' : '1fr',
          gap: 20,
          alignItems: 'stretch',
        }}
      >
        <TeamOverviewWidget user={user} selectedTeam={selectedTeam} isLoading={isTeamLoading} />
        <LiveCountdownWidget hackathon={activeHackathon} selectedTeam={selectedTeam} />
      </div>

      {/* ========================================== */}
      {/* KHU VỰC NỘP BÀI CHUNG KẾT (TÍCH HỢP MỚI)   */}
      {/* ========================================== */}
      {selectedTeam && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <FinalSubmissionPanel
            teamId={selectedTeam.id}
            hackathonId={activeHackathon?.id}
          />
        </motion.div>
      )}

      <HackathonTimeline hackathon={activeHackathon} selectedTeam={selectedTeam} />
    </Space>
  );
};

const MiniStat = ({ icon, label, value, color }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '38px 1fr',
      gap: 12,
      alignItems: 'center',
      padding: '10px 12px',
      borderRadius: 8,
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.1)',
    }}
  >
    <span
      style={{
        width: 38,
        height: 38,
        display: 'grid',
        placeItems: 'center',
        borderRadius: 8,
        color,
        background: `${color}26`,
        boxShadow: `0 8px 18px ${color}16`,
      }}
    >
      {icon}
    </span>
    <span style={{ minWidth: 0 }}>
      <Text style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.68)' }}>
        {label}
      </Text>
      <Text strong ellipsis style={{ display: 'block', color: '#fff' }}>
        {value}
      </Text>
    </span>
  </div>
);

export default StudentDashboardPage;