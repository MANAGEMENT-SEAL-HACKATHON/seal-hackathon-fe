import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Progress, Skeleton, Tag, Tooltip, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { ArrowRight, LockKeyhole, Sparkles, UsersRound } from 'lucide-react';
import { ROUTES } from '../../../shared/constants/routes';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO TRIAD */
const FPT = {
  blue: '#00529C',       // Chữ F - Cobalt/Royal Blue
  blueLight: '#1E73BE',  // Accent Blue
  orange: '#F37021',     // Chữ P - FPT Orange
  orangeLight: '#FF8C42',// Warm Orange
  green: '#46B749',      // Chữ T - FPT Leaf Green
};

const TeamOverviewWidget = ({ user, selectedTeam, isLoading }) => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const isApproved = user?.status === 'APPROVED';
  const acceptedCount = selectedTeam?.acceptedMemberCount || 0;
  const maxMembers = selectedTeam?.maxTeamSize || 5;
  const capacityPercent = Math.min((acceptedCount / maxMembers) * 100, 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      style={{
        minHeight: 300,
        borderRadius: 24,
        padding: 26,
        background: isDark
          ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)'
          : 'linear-gradient(145deg, #F0F9FF 0%, #FFFFFF 50%, #E0F2FE 100%)',
        border: `2px solid ${isDark ? 'rgba(0, 198, 255, 0.3)' : '#bae6fd'}`,
        boxShadow: isDark 
          ? '0 24px 50px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(0, 198, 255, 0.15)' 
          : '0 20px 48px -10px rgba(0, 198, 255, 0.15), 0 8px 24px -6px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative Ambient Lighting */}
      <div style={{ position: 'absolute', top: -60, right: -60, width: 260, height: 260, background: `radial-gradient(circle, rgba(0, 198, 255, 0.25) 0%, transparent 70%)`, filter: 'blur(35px)', pointerEvents: 'none' }} />
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: `linear-gradient(135deg, ${FPT.blue} 0%, ${FPT.blueLight} 100%)`,
              boxShadow: `0 4px 12px rgba(0, 82, 156, 0.25)`,
            }}
          >
            <UsersRound size={20} color="#fff" />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 800, fontSize: 17, color: token.colorTextHeading }}>
              Đội Thi FPTU
            </Title>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>Quản lý đội hình & thành viên</Text>
          </div>
        </div>
        <Button
          type="primary"
          onClick={() => navigate(ROUTES.STUDENT_TEAM)}
          style={{
            borderRadius: 10,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${FPT.blue} 0%, ${FPT.blueLight} 100%)`,
            border: 0,
            boxShadow: `0 4px 12px rgba(0, 82, 156, 0.25)`,
          }}
        >
          Mở trang đội <ArrowRight size={14} />
        </Button>
      </div>

      {/* Content */}
      {!isApproved ? (
        <LockedState token={token} />
      ) : isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : selectedTeam ? (
        <div style={{ display: 'grid', gap: 18, flex: 1 }}>
          {/* Team Name + Status */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <Title level={3} style={{ margin: 0, fontWeight: 800, fontSize: 20, color: token.colorTextHeading }}>
                {selectedTeam.teamName}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {selectedTeam.hackathonName || `Hackathon #${selectedTeam.hackathonId}`}
              </Text>
            </div>
            <Tag
              color={selectedTeam.statusColor || 'blue'}
              style={{ borderRadius: 8, padding: '4px 12px', fontWeight: 700, fontSize: 12, border: 0 }}
            >
              {selectedTeam.statusLabel || selectedTeam.status}
            </Tag>
          </div>

          {/* Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 10,
            }}
          >
            <Metric label="Thành viên" value={selectedTeam.memberCapacityLabel || `${acceptedCount}/${maxMembers}`} color={FPT.blue} />
            <Metric label="Leader" value={selectedTeam.leaderName || 'Chưa rõ'} color={FPT.orange} />
            <Metric label="Track" value={selectedTeam.trackName || 'Chưa bốc thăm'} color="#8B5CF6" />
            <Metric label="Trạng thái" value={selectedTeam.isLocked ? '🔒 Đã khóa' : '🟢 Đang mở'} color={selectedTeam.isLocked ? '#64748B' : FPT.green} />
          </div>

          {/* Progress Bar - Mirroring FPT Triad (Blue -> Orange -> Green) */}
          <div
            style={{
              padding: '14px 18px',
              borderRadius: 14,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong style={{ fontSize: 13, color: token.colorTextHeading }}>Độ sẵn sàng đội</Text>
              <Text style={{ color: FPT.blue, fontWeight: 700, fontSize: 13 }}>{acceptedCount}/{maxMembers} thành viên</Text>
            </div>
            <Progress
              percent={capacityPercent}
              showInfo={false}
              strokeColor={{
                '0%': FPT.blue,
                '50%': FPT.orange,
                '100%': FPT.green,
              }}
              trailColor={token.colorFillSecondary}
              size="small"
            />
          </div>

          {/* Avatars */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Avatar.Group max={{ count: 5 }} size="default">
              {(selectedTeam.acceptedMembers || selectedTeam.members || []).slice(0, 5).map((member) => (
                <Tooltip title={`${member.fullName} · ${member.roleLabel || member.roleInTeam || 'Thành viên'}`} key={member.userId}>
                  <Avatar
                    style={{
                      backgroundColor: member.roleInTeam === 'LEADER'
                        ? FPT.orange
                        : FPT.blue,
                      fontWeight: 700,
                      border: '2px solid #fff',
                    }}
                  >
                    {member.fullName?.charAt(0)?.toUpperCase() || 'S'}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>
              {selectedTeam.pendingInviteCount > 0
                ? `${selectedTeam.pendingInviteCount} lời mời đang chờ`
                : 'Đội hình đã sẵn sàng'}
            </Text>
          </div>
        </div>
      ) : (
        <EmptyTeam token={token} navigate={navigate} />
      )}
    </motion.section>
  );
};

const Metric = ({ label, value }) => {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 12,
        background: token.colorFillQuaternary,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Text type="secondary" style={{ display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>
        {label}
      </Text>
      <Text strong ellipsis style={{ display: 'block', fontSize: 14, color: token.colorTextHeading }}>
        {value}
      </Text>
    </div>
  );
};

const LockedState = ({ token }) => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: 200, textAlign: 'center', flex: 1 }}>
    <div>
      <div style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', background: token.colorFillQuaternary, margin: '0 auto 14px' }}>
        <LockKeyhole size={24} color={token.colorTextQuaternary} />
      </div>
      <Text style={{ display: 'block', color: token.colorTextSecondary, fontSize: 13, fontWeight: 500 }}>
        Tài khoản cần được phê duyệt trước khi thao tác với đội thi.
      </Text>
    </div>
  </div>
);

const EmptyTeam = ({ token, navigate }) => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: 210, textAlign: 'center', flex: 1 }}>
    <div style={{ maxWidth: 360 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(0, 82, 156, 0.1)',
          margin: '0 auto 16px',
          border: `1px solid rgba(0, 82, 156, 0.2)`,
        }}
      >
        <Sparkles size={28} color={FPT.blue} />
      </div>
      <Title level={4} style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 17, color: token.colorTextHeading }}>
        Bạn chưa tham gia đội thi nào
      </Title>
      <Text style={{ color: token.colorTextSecondary, fontSize: 13, lineHeight: 1.6 }}>
        Tạo đội mới hoặc chấp nhận lời mời để bắt đầu hành trình Hackathon tại FPTU.
      </Text>
      <div style={{ marginTop: 18 }}>
        <Button
          type="primary"
          size="middle"
          onClick={() => navigate(ROUTES.STUDENT_TEAM)}
          style={{
            borderRadius: 10,
            fontWeight: 700,
            height: 42,
            padding: '0 24px',
            background: `linear-gradient(135deg, ${FPT.blue} 0%, ${FPT.blueLight} 100%)`,
            border: 0,
            boxShadow: `0 4px 14px rgba(0, 82, 156, 0.35)`,
          }}
        >
          🚀 Đi tới trang Đội Thi
        </Button>
      </div>
    </div>
  </div>
);

export default TeamOverviewWidget;
