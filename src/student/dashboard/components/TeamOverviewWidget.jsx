import { useNavigate } from 'react-router-dom';
import { Avatar, Button, Progress, Skeleton, Tag, Tooltip, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { ArrowRight, LockKeyhole, UserRoundCheck, UsersRound } from 'lucide-react';
import { ROUTES } from '../../../shared/constants/routes';

const { Text, Title } = Typography;

const TeamOverviewWidget = ({ user, selectedTeam, isLoading }) => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isApproved = user?.status === 'APPROVED';
  const acceptedCount = selectedTeam?.acceptedMemberCount || 0;
  const capacityPercent = Math.min((acceptedCount / 5) * 100, 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
      style={{
        minHeight: 310,
        borderRadius: 8,
        padding: 22,
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
      }}
    >
      <Header
        icon={<UsersRound size={21} />}
        color="#1677ff"
        title="Đội thi hiện tại"
        action={
          <Button type="primary" onClick={() => navigate(ROUTES.STUDENT_TEAM)} style={{ borderRadius: 8, fontWeight: 700 }}>
            Mở trang đội <ArrowRight size={15} />
          </Button>
        }
      />

      {!isApproved ? (
        <LockedState token={token} />
      ) : isLoading ? (
        <Skeleton active paragraph={{ rows: 5 }} />
      ) : selectedTeam ? (
        <div style={{ display: 'grid', gap: 18 }}>
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
              <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
                {selectedTeam.teamName}
              </Title>
              <Text type="secondary">{selectedTeam.hackathonName || `Hackathon #${selectedTeam.hackathonId}`}</Text>
            </div>
            <Tag color={selectedTeam.statusColor || 'blue'} style={{ borderRadius: 8, padding: '4px 10px', fontWeight: 700 }}>
              {selectedTeam.statusLabel || selectedTeam.status}
            </Tag>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
            }}
          >
            <Metric label="Thành viên" value={selectedTeam.memberCapacityLabel || `${acceptedCount}/5`} />
            <Metric label="Leader" value={selectedTeam.leaderName || 'Chưa rõ'} />
            <Metric label="Khóa đội" value={selectedTeam.isLocked ? 'Đã khóa' : 'Đang mở'} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text strong>Độ sẵn sàng đội</Text>
              <Text type="secondary">{acceptedCount}/5</Text>
            </div>
            <Progress
              percent={capacityPercent}
              showInfo={false}
              strokeColor={selectedTeam.isMemberCountReady ? '#13c2c2' : '#faad14'}
              trailColor={token.colorFillSecondary}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Avatar.Group max={{ count: 5 }} size="large">
              {(selectedTeam.acceptedMembers || selectedTeam.members || []).slice(0, 5).map((member) => (
                <Tooltip title={`${member.fullName} · ${member.roleLabel || member.roleInTeam || 'Thành viên'}`} key={member.userId}>
                  <Avatar style={{ backgroundColor: member.roleInTeam === 'LEADER' ? '#1677ff' : '#13c2c2' }}>
                    {member.fullName?.charAt(0)?.toUpperCase() || 'S'}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
            <Text type="secondary">
              {selectedTeam.pendingInviteCount > 0
                ? `${selectedTeam.pendingInviteCount} lời mời đang chờ`
                : 'Không có lời mời đang chờ'}
            </Text>
          </div>
        </div>
      ) : (
        <EmptyTeam token={token} navigate={navigate} />
      )}
    </motion.section>
  );
};

const Header = ({ icon, color, title, action }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', marginBottom: 20 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color,
          background: `${color}14`,
        }}
      >
        {icon}
      </span>
      <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
        {title}
      </Title>
    </div>
    {action}
  </div>
);

const Metric = ({ label, value }) => (
  <div style={{ padding: 14, borderRadius: 8, background: 'rgba(148, 163, 184, 0.09)' }}>
    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
      {label}
    </Text>
    <Text strong ellipsis style={{ display: 'block', marginTop: 3 }}>
      {value}
    </Text>
  </div>
);

const LockedState = ({ token }) => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: 210, textAlign: 'center' }}>
    <div>
      <LockKeyhole size={42} color={token.colorTextQuaternary} />
      <Text style={{ display: 'block', marginTop: 12, color: token.colorTextSecondary }}>
        Tài khoản cần được phê duyệt trước khi thao tác với đội thi.
      </Text>
    </div>
  </div>
);

const EmptyTeam = ({ token, navigate }) => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: 220, textAlign: 'center' }}>
    <div style={{ maxWidth: 360 }}>
      <UserRoundCheck size={42} color="#13c2c2" />
      <Title level={4} style={{ margin: '12px 0 6px' }}>
        Bạn chưa ở trong đội nào
      </Title>
      <Text style={{ color: token.colorTextSecondary }}>
        Tạo đội mới hoặc kiểm tra lời mời để bắt đầu luồng tham gia Hackathon.
      </Text>
      <div style={{ marginTop: 18 }}>
        <Button type="primary" onClick={() => navigate(ROUTES.STUDENT_TEAM)} style={{ borderRadius: 8, fontWeight: 700 }}>
          Đi tới trang đội
        </Button>
      </div>
    </div>
  </div>
);

export default TeamOverviewWidget;
