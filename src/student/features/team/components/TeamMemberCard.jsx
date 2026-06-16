/**
 * Component: TeamMemberCard
 * Chức năng: Card hiển thị thông tin của một thành viên trong đội (Avatar, Vai trò, Trạng thái) và các nút hành động (Xóa, Hủy mời).
 */
import { Button, Space, Tag, Typography, theme, Avatar, Tooltip } from 'antd';
import { DeleteOutlined, CrownOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const TeamMemberCard = ({ member, teamId, canCancelInvite, loading, onCancelInvite }) => {
  const { token } = theme.useToken();
  const isLeader = member.role === 'LEADER';
  const isPending = member.status === 'PENDING';
  
  const cardStyle = {
    position: 'relative',
    padding: 16,
    borderRadius: 16,
    border: isPending ? `2px dashed ${token.colorBorder}` : `1px solid ${isLeader ? '#faad14' : token.colorBorderSecondary}`,
    background: isPending ? token.colorFillQuaternary : token.colorBgContainer,
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  const getStatusIcon = () => {
    switch(member.status) {
      case 'ACCEPTED': return <CheckCircleOutlined />;
      case 'PENDING': return <ClockCircleOutlined />;
      case 'REJECTED': return <CloseCircleOutlined />;
      default: return null;
    }
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={(event) => {
        event.currentTarget.style.transform = 'translateY(-4px)';
        event.currentTarget.style.boxShadow = isLeader ? '0 12px 24px rgba(250, 173, 20, 0.15)' : '0 12px 24px rgba(0, 0, 0, 0.06)';
        if (!isPending) event.currentTarget.style.borderColor = isLeader ? '#faad14' : token.colorPrimary;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.transform = 'translateY(0)';
        event.currentTarget.style.boxShadow = 'none';
        event.currentTarget.style.borderColor = isPending ? token.colorBorder : (isLeader ? '#faad14' : token.colorBorderSecondary);
      }}
    >
      {/* Crown Icon for Leader */}
      {isLeader && (
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '4px 12px', background: 'linear-gradient(135deg, #faad14, #d48806)', color: '#fff', borderBottomLeftRadius: 16, fontSize: 12, fontWeight: 700, boxShadow: '-2px 2px 8px rgba(250,173,20,0.2)' }}>
          <CrownOutlined style={{ marginRight: 4 }} /> LEADER
        </div>
      )}

      <Space align="center" size={16} style={{ width: '100%' }}>
        <Avatar
          size={52}
          style={{
            background: isLeader ? 'linear-gradient(135deg, #faad14, #d48806)' : token.colorPrimaryBg,
            color: isLeader ? '#fff' : token.colorPrimary,
            fontWeight: 800,
            fontSize: 18,
            border: isLeader ? 'none' : `1px solid ${token.colorPrimaryBorder}`
          }}
        >
          {getInitials(member.fullName || member.email)}
        </Avatar>
        
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text strong style={{ display: 'block', fontSize: 15, color: isLeader ? '#d48806' : token.colorText }}>
            {member.fullName || 'Thành viên'}
          </Text>
          <Text type="secondary" style={{ display: 'block', wordBreak: 'break-all', fontSize: 13, marginBottom: 8 }}>
            {member.email}
          </Text>
          
          <Space wrap size={6}>
            {!isLeader && (
              <Tag color={member.roleColor} style={{ margin: 0, border: 0, borderRadius: 6, fontWeight: 600 }}>
                {member.roleLabel}
              </Tag>
            )}
            <Tag icon={getStatusIcon()} color={member.statusColor} style={{ margin: 0, border: 0, borderRadius: 6, fontWeight: 600 }}>
              {member.statusLabel}
            </Tag>
          </Space>
        </div>
      </Space>

      {/* Action Footer for Pending Invitations */}
      {isPending && canCancelInvite && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px dashed ${token.colorBorder}` }}>
          <Button
            danger
            type="primary"
            ghost
            size="small"
            icon={<DeleteOutlined />}
            loading={loading}
            onClick={() => onCancelInvite(teamId, member.userId)}
            style={{ width: '100%', borderRadius: 6, fontWeight: 600 }}
          >
            Hủy lời mời
          </Button>
        </div>
      )}
    </div>
  );
};

export default TeamMemberCard;

