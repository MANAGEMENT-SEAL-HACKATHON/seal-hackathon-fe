import { Grid, Skeleton, Typography, Button, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentDashboard } from '../hooks/useStudentDashboard';
import ProfileStatusBanner from '../components/ProfileStatusBanner';
import HackathonTimeline from '../components/HackathonTimeline';
import TeamOverviewWidget from '../components/TeamOverviewWidget';
import LiveCountdownWidget from '../components/LiveCountdownWidget';
import TeamJourneyPanel from '../../../features/teams/components/TeamJourneyPanel';
import HackathonRegistrationPanel from '../../features/hackathon/components/HackathonRegistrationPanel';

const { Text, Title } = Typography;

/* ─── OFFICIAL FPT LOGO COLOR TRIAD ─── */
const FPT = {
  blue: '#00529C',       // Chữ F - Cobalt/Royal Blue
  blueDark: '#003366',   // Deep Blue for gradients
  blueLight: '#1E73BE',  // Accent Blue
  orange: '#F37021',     // Chữ P - FPT Vibrant Orange
  orangeLight: '#FF8C42',// Warm Orange
  green: '#46B749',      // Chữ T - FPT Leaf Green
  greenDark: '#2E8B57',  // Deep Green
  amber: '#F59E0B',
};

const STATUS_LABEL = {
  APPROVED: 'Đã được duyệt',
  PENDING: 'Chờ duyệt tài khoản',
  REJECTED: 'Đã bị từ chối',
};

const getDisplayName = (user) => user?.fullName || user?.email || 'Sinh viên';

const getHackathonName = (hackathon, selectedTeam) =>
  selectedTeam?.hackathonName ||
  hackathon?.name ||
  hackathon?.hackathonName ||
  null;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

const StudentDashboardPage = () => {
  const navigate = useNavigate();
  const screens = Grid.useBreakpoint();
  const { token } = theme.useToken();
  const {
    user,
    activeHackathon,
    selectedTeam,
    nextAction,
    upcomingDeadlines,
    isLoading: isDashboardLoading,
    isTeamLoading,
    refreshHackathonAndTeam,
  } = useStudentDashboard();

  const hackathonName = getHackathonName(activeHackathon, selectedTeam);
  const isApproved = user?.status === 'APPROVED';

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1280,
        margin: '0 auto',
        paddingBottom: 64,
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* ─── Profile Status Banner (non-approved only) ─── */}
      <ProfileStatusBanner user={user} />

      {nextAction ? (
        <div
          data-testid="student-next-action"
          style={{
            borderRadius: 16,
            padding: '16px 20px',
            background: 'linear-gradient(90deg, rgba(0,82,156,0.08), rgba(243,112,33,0.08))',
            border: '1px solid rgba(0,82,156,0.15)',
          }}
        >
          <Text strong style={{ color: FPT.blue }}>Hành động kế tiếp</Text>
          <Title level={4} style={{ margin: '4px 0' }}>{nextAction.title}</Title>
          <Text type="secondary">{nextAction.detail}</Text>
          {upcomingDeadlines?.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">Sắp tới: </Text>
              {upcomingDeadlines.slice(0, 3).map((e) => (
                <Text key={`${e.name}-${e.start}`} style={{ marginRight: 12 }}>
                  {e.name} ({new Date(e.start).toLocaleString('vi-VN')})
                </Text>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* ─── HERO: FPT Official Blue & Orange Command Center ─── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 24,
          padding: screens.md ? '36px 42px' : '28px 22px',
          background: `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 55%, #002244 100%)`,
          color: '#fff',
          minHeight: 180,
          boxShadow: '0 16px 40px rgba(0, 82, 156, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Decorative FPT Triad Lighting */}
        <div style={{ position: 'absolute', top: -50, right: '10%', width: 300, height: 300, background: `radial-gradient(circle, rgba(243, 112, 33, 0.3) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: '5%', width: 240, height: 240, background: `radial-gradient(circle, rgba(70, 183, 73, 0.25) 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.04) 1px, transparent 0)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: screens.lg ? '1fr auto' : '1fr', gap: 24, alignItems: 'center' }}>
          <div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 14px',
                borderRadius: 999,
                background: 'rgba(243, 112, 33, 0.2)',
                border: `1px solid ${FPT.orangeLight}`,
                marginBottom: 16,
                fontSize: 12,
                fontWeight: 600,
                color: FPT.orangeLight,
                letterSpacing: '0.02em',
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: FPT.orange, boxShadow: `0 0 8px ${FPT.orange}` }} />
              {STATUS_LABEL[user?.status] || 'Đang xác thực'}
            </motion.div>

            <Title
              level={1}
              style={{
                margin: 0,
                fontSize: screens.md ? 32 : 24,
                lineHeight: 1.2,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#fff',
              }}
            >
              {getGreeting()}, {getDisplayName(user)} 👋
            </Title>

            <Text
              style={{
                display: 'block',
                maxWidth: 620,
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.85)',
              }}
            >
              {hackathonName
                ? `Bạn đang tham gia giải đấu ${hackathonName}. Theo dõi lịch trình và quản lý đội thi ngay bên dưới.`
                : selectedTeam
                ? `Đội ${selectedTeam.teamName} đang có ${selectedTeam.acceptedMemberCount || 0} thành viên sẵn sàng chinh chiến.`
                : 'Khám phá giải đấu Hackathon FPT University, ghép đội thực chiến và bắt đầu hành trình chinh phục công nghệ.'}
            </Text>
          </div>

          {/* Quick Stats Pills - Mirroring FPT Logo Triad (Blue, Orange, Green) */}
          {screens.lg && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <QuickPill
                label="Tài khoản FPTU"
                value={STATUS_LABEL[user?.status] || 'Chờ duyệt'}
                dot={isApproved ? FPT.green : FPT.amber}
              />
              <QuickPill
                label="Đội thi"
                value={selectedTeam?.teamName || 'Chưa có đội'}
                dot={selectedTeam ? FPT.blueLight : '#94A3B8'}
              />
              {hackathonName && (
                <QuickPill label="Hackathon" value={hackathonName} dot={FPT.orange} />
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* MAIN CONTENT AREA WITH ANIMATE PRESENCE */}
      <AnimatePresence mode="wait">
        {isDashboardLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: 48,
              background: token.colorBgContainer !== '#ffffff' ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
              borderRadius: 24,
              border: `1.5px solid ${token.colorBorderSecondary}`,
              boxShadow: '0 20px 48px rgba(0,0,0,0.06)',
            }}
          >
            <Skeleton active avatar paragraph={{ rows: 10 }} />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
          >
      {/* ─── Tournament Results & Honors Banner ─── */}
      {(activeHackathon?.status === 'PENDING_CONFIRM' || activeHackathon?.status === 'FINISHED') && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{
            background: activeHackathon.status === 'FINISHED'
              ? 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #065f46 100%)'
              : 'linear-gradient(135deg, #00244D 0%, #00529C 50%, #001F3F 100%)',
            borderRadius: 24,
            padding: '24px 32px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            boxShadow: activeHackathon.status === 'FINISHED'
              ? '0 16px 36px -8px rgba(5, 150, 105, 0.3)'
              : '0 16px 36px -8px rgba(0, 82, 156, 0.3)',
            border: `2px solid ${activeHackathon.status === 'FINISHED' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 140, 66, 0.4)'}`,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient light glow */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: 250,
              height: 250,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${activeHackathon.status === 'FINISHED' ? '#34d399' : '#FF8C42'} 0%, transparent 70%)`,
              opacity: 0.3,
              filter: 'blur(35px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 18, zIndex: 1, maxWidth: 760 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                display: 'grid',
                placeItems: 'center',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                flexShrink: 0,
              }}
            >
              <Trophy size={28} style={{ color: activeHackathon.status === 'FINISHED' ? '#34d399' : '#FF8C42' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    background: activeHackathon.status === 'FINISHED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(243, 112, 33, 0.3)',
                    color: activeHackathon.status === 'FINISHED' ? '#6ee7b7' : '#FF8C42',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    border: `1px solid ${activeHackathon.status === 'FINISHED' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(243, 112, 33, 0.5)'}`,
                  }}
                >
                  {activeHackathon.status === 'FINISHED' ? '🎉 GIẢI ĐẤU HOÀN TẤT' : '⏳ CHỜ CÔNG BỐ CHUNG KẾT'}
                </span>
              </div>
              <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 900, fontSize: 18 }}>
                {activeHackathon.status === 'FINISHED'
                  ? 'Bảng Vàng Xếp Hạng & Vinh Danh Chung Cuộc'
                  : 'Chung Kết Đã Khép Lại — Đang Tổng Hợp Kết Quả'}
              </Title>
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 14, display: 'block', marginTop: 4, lineHeight: 1.5 }}>
                {activeHackathon.status === 'FINISHED'
                  ? 'Toàn bộ điểm số và danh hiệu đã được Ban Tổ Chức công bố chính thức. Tra cứu giải thưởng và tải chứng nhận điện tử (PDF) ngay!'
                  : 'Ban Giám Khảo đang thực hiện tổng hợp điểm thi Chung kết. Bạn có thể tra cứu bảng điểm các vòng thi đã qua tại Trung Tâm Kết Quả.'}
              </Text>
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            onClick={() => navigate(`/student/hackathons/${activeHackathon.id}/results`)}
            style={{
              height: 48,
              borderRadius: 14,
              fontWeight: 800,
              fontSize: 15,
              padding: '0 28px',
              background: activeHackathon.status === 'FINISHED'
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #F37021 0%, #FF8C42 100%)',
              border: 'none',
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
              zIndex: 1,
              flexShrink: 0,
            }}
          >
            {activeHackathon.status === 'FINISHED' ? 'Xem Vinh Danh & PDF' : 'Đến Trung Tâm Kết Quả'}
          </Button>
        </motion.div>
      )}

      {/* ─── Sleek Tournament Ribbon & Arena Modal ─── */}
      {isApproved && (
        <HackathonRegistrationPanel
          hasTeam={Boolean(selectedTeam)}
          onRegistrationChange={() => refreshHackathonAndTeam(user)}
        />
      )}

      {/* ─── Bento Grid: Team Command Center & Live Countdown ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: screens.xl ? 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' : '1fr',
          gap: 24,
          alignItems: 'stretch',
        }}
      >
        <TeamOverviewWidget user={user} selectedTeam={selectedTeam} isLoading={isTeamLoading} />
        <LiveCountdownWidget hackathon={activeHackathon} selectedTeam={selectedTeam} />
      </div>

      {/* ─── Tournament Roadmap / Team Journey (if in team) ─── */}
      {selectedTeam && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <TeamJourneyPanel
            teamId={selectedTeam.id}
            teamName={selectedTeam.teamName}
          />
        </motion.div>
      )}

      {/* ─── Interactive Roadmap Timeline ─── */}
      <HackathonTimeline hackathon={activeHackathon} selectedTeam={selectedTeam} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Quick Pill (for hero section) ── */
const QuickPill = ({ label, value, dot }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 16px',
      borderRadius: 14,
      background: 'rgba(255, 255, 255, 0.1)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.18)',
      minWidth: 210,
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: dot,
        boxShadow: `0 0 8px ${dot}`,
        flexShrink: 0,
      }}
    />
    <div style={{ minWidth: 0 }}>
      <Text
        style={{
          display: 'block',
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.7)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </Text>
      <Text
        ellipsis
        strong
        style={{ display: 'block', fontSize: 13, color: '#fff' }}
      >
        {value}
      </Text>
    </div>
  </div>
);

export default StudentDashboardPage;