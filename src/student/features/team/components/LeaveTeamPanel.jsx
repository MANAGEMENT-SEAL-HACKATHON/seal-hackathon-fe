/**
 * Component: LeaveTeamPanel
 * Chức năng: Hiển thị giao diện và logic xác nhận cho phép thành viên rời khỏi đội thi hiện tại.
 */
import { Button, Modal, Space, Typography, theme } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';

const { Text } = Typography;

const LeaveTeamPanel = ({ teamId, loading, onLeaveTeam }) => {
  const { token } = theme.useToken();

  const handleLeaveTeam = () => {
    Modal.confirm({
      title: 'Rời đội hiện tại?',
      content: 'Bạn sẽ không còn là thành viên của đội này. Nếu muốn tham gia lại, trưởng nhóm cần gửi lời mời mới.',
      okText: 'Rời đội',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: () => onLeaveTeam(teamId),
    });
  };

  return (
    <div
      style={{
        marginTop: 20,
        padding: 14,
        borderRadius: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        background: token.colorErrorBg,
        border: `1px solid ${token.colorErrorBorder}`,
      }}
    >
      <Space direction="vertical" size={0}>
        <Text strong>Không muốn tiếp tục ở đội này?</Text>
        <Text type="secondary">Bạn có thể rời đội khi đội chưa khóa và bạn không phải trưởng nhóm.</Text>
      </Space>
      <Button danger icon={<LogoutOutlined />} loading={loading} onClick={handleLeaveTeam} style={{ fontWeight: 700 }}>
        Rời đội
      </Button>
    </div>
  );
};

export default LeaveTeamPanel;

