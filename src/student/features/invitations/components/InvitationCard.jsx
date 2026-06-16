/**
 * Component: InvitationCard
 * Chức năng: Card hiển thị chi tiết một lời mời tham gia đội. Cho phép người dùng Chấp nhận hoặc Từ chối lời mời.
 */
import { Button, Modal, Progress, Space, Tag, Typography, theme, Divider, Avatar } from 'antd';
import { CheckOutlined, CloseOutlined, TeamOutlined, CrownOutlined, UsergroupAddOutlined } from '@ant-design/icons';
import { INVITATION_ACTION } from '../constants/studentInvitation.constants';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;

const InvitationCard = ({ invitation, actionKey, hasTeams, onRespond }) => {
  const { token } = theme.useToken();
  const loading = (action) => actionKey === `${invitation.teamId}-${action}`;
  const progressPercent = Math.min(100, Math.round((invitation.acceptedMemberCount / 5) * 100));
  const isPending = invitation.memberStatus === 'PENDING';

  const confirmAction = (action, title) => {
    if (action === INVITATION_ACTION.ACCEPT && hasTeams) {
      Modal.warning({
        title: 'Không thể chấp nhận',
        content: 'Bạn đã tham gia một đội thi khác. Vui lòng rời đội hiện tại nếu muốn gia nhập đội này.',
        okText: 'Đã hiểu',
      });
      return;
    }
    Modal.confirm({
      title,
      content: `Đội: ${invitation.teamName}`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => onRespond(invitation, action),
    });
  };

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 24px 56px rgba(15, 98, 254, 0.12)' }}
      transition={{ duration: 0.3 }}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 24,
        background: token.colorBgContainer,
        border: `1px solid ${isPending ? '#91caff' : token.colorBorderSecondary}`,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {isPending && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #0f62fe, #13c2c2)' }} />
      )}

      <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Space align="start" size={16} style={{ width: '100%', marginBottom: 20 }}>
          <Avatar
            size={56}
            style={{
              background: isPending ? 'linear-gradient(135deg, #0f62fe, #13c2c2)' : token.colorFillQuaternary,
              color: isPending ? '#fff' : token.colorTextSecondary,
              boxShadow: isPending ? '0 12px 24px rgba(15, 98, 254, 0.25)' : 'none',
              border: isPending ? 'none' : `1px solid ${token.colorBorderSecondary}`
            }}
            icon={<TeamOutlined />}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <Space wrap style={{ marginBottom: 6 }}>
              <Tag color={invitation.memberStatusColor} style={{ margin: 0, borderRadius: 6, fontWeight: 600, border: 0 }}>
                {invitation.memberStatusLabel}
              </Tag>
              {invitation.isLocked && <Tag color="error" style={{ margin: 0, borderRadius: 6, fontWeight: 600, border: 0 }}>Đã khóa</Tag>}
            </Space>
            <Title level={4} style={{ margin: 0, fontSize: 18, color: isPending ? token.colorPrimary : token.colorText }}>
              {invitation.teamName}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>{invitation.hackathonName}</Text>
          </div>
        </Space>

        <div style={{ background: token.colorFillAlter, borderRadius: 16, padding: '16px 20px', border: `1px solid ${token.colorBorderSecondary}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <CrownOutlined style={{ color: '#faad14', fontSize: 18, flexShrink: 0 }} />
            <Text type="secondary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Trưởng nhóm:</Text>
            <Text strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }} title={invitation.leaderName}>
              {invitation.leaderName}
            </Text>
          </div>
          
          <Divider style={{ margin: '0 0 12px 0' }} />
          
          <Space align="center" style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            <Space size={6}>
              <UsergroupAddOutlined style={{ color: token.colorPrimary }} />
              <Text type="secondary">Đã gia nhập</Text>
            </Space>
            <Text strong>{invitation.acceptedMemberCount}/5</Text>
          </Space>
          <Progress percent={progressPercent} showInfo={false} strokeColor={{ from: '#0f62fe', to: '#13c2c2' }} trailColor={token.colorFillSecondary} strokeWidth={6} />
          
          {invitation.pendingInviteCount > 0 && (
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 8, textAlign: 'right' }}>
              + {invitation.pendingInviteCount} lời mời đang chờ
            </Text>
          )}
        </div>
      </div>

      {(invitation.canAccept || invitation.canReject) && (
        <div style={{ padding: '16px 24px', background: token.colorFillQuaternary, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Space wrap style={{ width: '100%', justifyContent: 'flex-end', gap: 12 }}>
            {invitation.canReject && (
              <Button
                type="default"
                danger
                icon={<CloseOutlined />}
                loading={loading(INVITATION_ACTION.REJECT)}
                onClick={() => confirmAction(INVITATION_ACTION.REJECT, 'Từ chối lời mời?')}
                style={{ borderRadius: 8, fontWeight: 600 }}
              >
                Từ chối
              </Button>
            )}
            {invitation.canAccept && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={loading(INVITATION_ACTION.ACCEPT)}
                onClick={() => confirmAction(INVITATION_ACTION.ACCEPT, 'Tham gia đội này?')}
                style={{ borderRadius: 8, fontWeight: 700, background: token.colorPrimary, borderColor: token.colorPrimary, boxShadow: '0 8px 16px rgba(15, 98, 254, 0.2)' }}
              >
                Chấp nhận
              </Button>
            )}
          </Space>
        </div>
      )}
    </motion.div>
  );
};

export default InvitationCard;

