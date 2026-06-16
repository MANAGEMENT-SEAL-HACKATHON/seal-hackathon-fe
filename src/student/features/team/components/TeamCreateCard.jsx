/**
 * Component: TeamCreateCard
 * Chức năng: Card giao diện chứa Form cho phép sinh viên tự thành lập một đội thi mới.
 */
import { Button, Card, Form, Input, Typography, theme, Divider, Modal } from 'antd';
import { PlusOutlined, RocketOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const TeamCreateCard = ({ hackathonId, hasTeams, onCreateTeam, loading }) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  const handleFinish = async (values) => {
    if (!hackathonId) return; // Bỏ qua nếu chưa load xong ID của Hackathon

    if (hasTeams) {
      Modal.warning({
        title: 'Không thể tạo đội mới',
        content: 'Bạn hiện đang tham gia một đội thi khác. Vui lòng rời đội hiện tại nếu muốn tự thành lập một đội mới.',
        okText: 'Đã hiểu'
      });
      return;
    }
    const success = await onCreateTeam({
      hackathonId: hackathonId,
      teamName: values.teamName?.trim(),
    });
    if (success) form.resetFields(['teamName']);
  };

  return (
    <Card
      hoverable
      style={{
        height: '100%',
        borderRadius: 24,
        border: `1px solid ${token.colorBorderSecondary}`,
        transition: 'all 0.3s ease',
      }}
      styles={{ body: { padding: 32, display: 'flex', flexDirection: 'column', height: '100%' } }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ 
          width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f5222d, #fa541c)', color: '#fff', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 24,
          boxShadow: '0 12px 24px rgba(245,34,45,0.25)'
        }}>
          <RocketOutlined />
        </div>
        <Title level={4} style={{ textAlign: 'left', marginTop: 0 }}>Thành lập đội thi</Title>
        <Text type="secondary" style={{ display: 'block', textAlign: 'left', marginBottom: 24 }}>
          Khởi tạo một đội mới và trở thành Trưởng nhóm. Bạn có toàn quyền quản lý thành viên.
        </Text>
      </div>

      <Divider style={{ margin: '0 0 24px 0' }} />

      <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
        <Form.Item name="teamName" rules={[{ required: true, message: 'Nhập tên đội.' }, { min: 3, message: 'Ít nhất 3 ký tự.' }]} style={{ marginBottom: 24 }}>
          <Input placeholder="Tên đội thi..." maxLength={50} size="large" style={{ borderRadius: 12 }} />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          icon={<PlusOutlined />}
          loading={loading}
          block
          size="large"
          style={{ height: 48, borderRadius: 12, fontWeight: 800, background: 'linear-gradient(90deg, #f5222d, #fa541c)', border: 0, boxShadow: '0 8px 20px rgba(245,34,45,0.3)' }}
        >
          Tạo Đội
        </Button>
      </Form>
    </Card>
  );
};

export default TeamCreateCard;

