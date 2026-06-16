/**
 * Component: TeamOverviewCard
 * Chức năng: Card hiển thị các thông tin tóm tắt chung về đội thi hiện tại (Tên đội, Thời gian tạo, Trạng thái).
 */
import { Card, Progress, Space, Tag, Typography, theme, Avatar, Divider } from 'antd';
import { LockOutlined, UnlockOutlined, TrophyOutlined, TeamOutlined, MailOutlined } from '@ant-design/icons';
import { TEAM_MEMBER_LIMITS } from '../constants/studentTeam.constants';

const { Text, Title } = Typography;

const TeamOverviewCard = ({ team }) => {
  const { token } = theme.useToken();

  if (!team) return null;

  const progressPercent = Math.min(
    100,
    Math.round((team.acceptedMemberCount / TEAM_MEMBER_LIMITS.MAX_ACCEPTED) * 100)
  );

  return (
    <Card
      style={{
        borderRadius: 24,
        overflow: 'hidden',
        border: `1px solid ${token.colorBorderSecondary}`,
        background: token.colorBgContainer,
        boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '32px 24px', textAlign: 'center', background: `linear-gradient(180deg, ${token.colorPrimary}0A 0%, rgba(255,255,255,0) 100%)` }}>
        <Avatar 
          size={72} 
          icon={<TrophyOutlined />} 
          style={{ 
            background: 'linear-gradient(135deg, #1890ff, #13c2c2)', 
            boxShadow: '0 12px 24px rgba(24,144,255,0.2)',
            marginBottom: 16
          }} 
        />
        
        <Title level={3} style={{ margin: 0 }}>{team.teamName}</Title>
        <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 14 }}>{team.hackathonName}</Text>
        
        <Space style={{ marginTop: 16 }}>
          <Tag color={team.statusColor} style={{ borderRadius: 12, padding: '2px 12px', border: 0, fontWeight: 600 }}>
            {team.statusLabel}
          </Tag>
          <Tag
            color={team.isLocked ? 'error' : 'success'}
            icon={team.isLocked ? <LockOutlined /> : <UnlockOutlined />}
            style={{ borderRadius: 12, padding: '2px 12px', border: 0 }}
          >
            {team.isLocked ? 'Khóa' : 'Mở'}
          </Tag>
        </Space>
      </div>

      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ background: token.colorFillAlter, borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Trưởng nhóm
          </Text>
          <Title level={5} style={{ margin: 0 }}>{team.leaderName}</Title>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <TeamOutlined style={{ fontSize: 24, color: token.colorPrimary, marginBottom: 8 }} />
            <Title level={3} style={{ margin: 0 }}>{team.memberCapacityLabel}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Thành viên</Text>
          </div>
          <Divider type="vertical" style={{ height: 60 }} />
          <div style={{ textAlign: 'center', flex: 1 }}>
            <MailOutlined style={{ fontSize: 24, color: token.colorWarning, marginBottom: 8 }} />
            <Title level={3} style={{ margin: 0 }}>{team.pendingInviteCount}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Đang chờ</Text>
          </div>
        </div>

        <div>
          <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text strong>Tiến độ duyệt đội</Text>
            <Text type={team.isMemberCountReady ? 'success' : 'secondary'} style={{ fontSize: 13 }}>
              Cần {TEAM_MEMBER_LIMITS.MIN_ACCEPTED}-{TEAM_MEMBER_LIMITS.MAX_ACCEPTED} người
            </Text>
          </Space>
          <Progress
            percent={progressPercent}
            showInfo={false}
            strokeColor={{ from: '#1890ff', to: '#13c2c2' }}
            trailColor={token.colorFillSecondary}
            strokeWidth={10}
          />
        </div>

        {team.rejectionReason && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 12, color: token.colorError, background: token.colorErrorBg, border: `1px solid ${token.colorErrorBorder}` }}>
            <strong>Lý do từ chối:</strong> {team.rejectionReason}
          </div>
        )}
      </div>
    </Card>
  );
};

export default TeamOverviewCard;

