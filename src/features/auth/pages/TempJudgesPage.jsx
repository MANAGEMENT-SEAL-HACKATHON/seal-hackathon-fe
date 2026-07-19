import { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, Space, Card,
  Typography, Tooltip, Empty, message, Alert, Popconfirm
} from 'antd';
import {
  UserAddOutlined, BankOutlined,
  SendOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, StopOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import UserInviteAutoComplete, { personnelSecondaryLine } from '../../../shared/components/ui/UserInviteAutoComplete';
import { userService } from '../services/userService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import CoordinatorHero from '../../../shared/components/ui/CoordinatorHero';
import {
  primaryGradientButtonStyle,
  tableCardStyle,
  whiteButtonStyle,
} from '../../../shared/theme/coordinatorTheme';

const { Text } = Typography;
const { Option } = Select;

const GUEST_JUDGE_POLICY =
  'Sau khi sự kiện kết thúc, tài khoản giám khảo khách không bị xóa mà chỉ bị khóa đăng nhập. ' +
  'Hệ thống chưa hỗ trợ tái mời cùng email qua giao diện — dùng email khác hoặc nhờ quản trị hệ thống.';

const TempJudgesPage = () => {
  const [hackathons, setHackathons] = useState([]);
  const [judges, setJudges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();

  const fetchTempJudges = async (pageOverride = page, sizeOverride = pageSize) => {
    setLoading(true);
    try {
      const data = await userService.getTempJudges({ page: pageOverride, size: sizeOverride });
      let list = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (data?.items && Array.isArray(data.items)) {
        list = data.items;
      } else if (data?.content && Array.isArray(data.content)) {
        list = data.content;
      }
      setJudges(list);
      setTotal(Number(data?.totalElements ?? list.length) || 0);
    } catch (error) {
      message.error('Không thể lấy danh sách giám khảo khách mời.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHackathons = async () => {
    try {
      const res = await hackathonService.search({ size: 100 });
      const dataArray = res?.items || res?.content || res;
      setHackathons(Array.isArray(dataArray) ? dataArray : []);
    } catch {
      // non-blocking
    }
  };

  useEffect(() => {
    fetchTempJudges(page, pageSize);
  }, [page, pageSize]);

  useEffect(() => {
    fetchHackathons();
  }, []);

  const handleCreate = async (values) => {
    setLoading(true);
    try {
      const res = await userService.createTempJudge(values);
      // BE trả tokenSent=false khi gửi email thất bại — không được báo thành công khống.
      const tokenSent =
        res?.invitation?.tokenSent ??
        res?.user?.invitation?.tokenSent ??
        true;
      if (tokenSent === false) {
        message.warning(
          'Đã tạo tài khoản giám khảo nhưng email mời CHƯA gửi được. Dùng nút «Gửi lại» hoặc liên hệ giám khảo thủ công.',
        );
      } else {
        message.success('Đã mời giám khảo khách mời thành công!');
      }
      setIsModalOpen(false);
      form.resetFields();
      fetchTempJudges();
    } catch (error) {
      const code = error?.code || error?.data?.error?.code;
      if (code === 'DUPLICATE_PENDING_INVITATION') {
        message.error('Đã tồn tại lời mời đang chờ xử lý cho email này.');
      } else if (code === 'INVITATION_HACKATHON_REQUIRED') {
        message.error('Thông tin sự kiện Hackathon là bắt buộc.');
      } else {
        message.error(error?.message || 'Có lỗi xảy ra khi gửi lời mời.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getInvitationId = (record) => record.invitation?.id;

  const handleResend = async (record) => {
    const invitationId = getInvitationId(record);
    if (!invitationId) {
      message.warning('Không tìm thấy mã lời mời. Vui lòng tải lại trang.');
      return;
    }
    try {
      await userService.resendInvitation(invitationId);
      message.success('Đã gửi lại lời mời thành công!');
      fetchTempJudges();
    } catch (error) {
      const code = error?.code || error?.data?.error?.code;
      if (code === 'INVITATION_RESEND_AFTER_KICKOFF_CUTOFF') {
        message.error('Không thể gửi lại lời mời do đã vượt quá giới hạn 48 giờ trước giờ Khai mạc.');
      } else {
        message.error(error?.message || 'Không thể gửi lại lời mời.');
      }
    }
  };

  const handleRevoke = async (record) => {
    const invitationId = getInvitationId(record);
    if (!invitationId) {
      message.warning('Không tìm thấy mã lời mời để thu hồi.');
      return;
    }
    try {
      await userService.revokeInvitation(invitationId);
      message.success('Đã thu hồi lời mời.');
      fetchTempJudges();
    } catch (error) {
      message.error(error?.message || 'Không thể thu hồi lời mời.');
    }
  };

  const isActivated = (record) =>
    record.invitation?.acceptedAt ||
    record.passwordChanged ||
    (record.mustChangePassword === false && record.status === 'APPROVED');

  const isRevoked = (record) => Boolean(record.invitation?.revokedAt);

  const getInvitationStatusTag = (record) => {
    if (isRevoked(record)) {
      return <Tag color="default" icon={<StopOutlined />}>Đã thu hồi</Tag>;
    }
    if (isActivated(record)) {
      return <Tag color="success" icon={<CheckCircleOutlined />}>Đã kích hoạt</Tag>;
    }
    if (record.invitation?.tokenSent === false) {
      return <Tag color="warning" icon={<ExclamationCircleOutlined />}>Email chưa gửi</Tag>;
    }
    const expiresAt = record.invitation?.expiresAt;
    if (expiresAt && dayjs(expiresAt).isBefore(dayjs())) {
      return <Tag color="error" icon={<ExclamationCircleOutlined />}>Đã hết hạn</Tag>;
    }
    if (record.status === 'PENDING' || record.mustChangePassword) {
      return <Tag color="processing" icon={<ClockCircleOutlined />}>Chờ đổi mật khẩu</Tag>;
    }
    return <Tag color="processing" icon={<ClockCircleOutlined />}>Đang chờ</Tag>;
  };

  const columns = [
    {
      title: 'Giám khảo',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text, record) => (
        <div>
          <strong style={{ color: '#111827' }}>{text || record.name}</strong>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>ID: {record.id}</div>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email) => <span style={{ fontFamily: 'monospace' }}>{email}</span>,
    },
    {
      title: 'Đơn vị / Tổ chức',
      dataIndex: 'institution',
      key: 'institution',
      render: (text) => text || <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái lời mời',
      key: 'invitationStatus',
      render: (_, record) => getInvitationStatusTag(record),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => {
        if (isActivated(record) || isRevoked(record)) {
          return <Text type="secondary">{isRevoked(record) ? 'Đã thu hồi' : 'Đã kích hoạt'}</Text>;
        }
        const invitationId = getInvitationId(record);
        if (!invitationId) return <Text type="secondary">—</Text>;
        return (
          <Space>
            <Button type="default" icon={<SendOutlined />} onClick={() => handleResend(record)}>
              Gửi lại
            </Button>
            <Popconfirm
              title="Thu hồi lời mời?"
              description="Chỉ áp dụng khi giám khảo chưa đổi mật khẩu / chưa kích hoạt."
              onConfirm={() => handleRevoke(record)}
              okText="Thu hồi"
              cancelText="Hủy"
            >
              <Button danger icon={<StopOutlined />}>Thu hồi</Button>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <div className="coord-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <CoordinatorHero
        data-testid="temp-judges-hero"
        title="Quản lý giám khảo khách mời"
        subtitle="Tạo và quản lý lời mời cho chuyên gia chấm thi ngoài hệ thống."
        actions={
          <>
            <Button
              onClick={fetchTempJudges}
              style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              Tải lại
            </Button>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              style={{ ...primaryGradientButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => setIsModalOpen(true)}
            >
              Mời giám khảo mới
            </Button>
          </>
        }
      />

      <Card
        style={tableCardStyle}
        extra={
          <Tooltip title={GUEST_JUDGE_POLICY}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#4f46e5',
                cursor: 'help',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <InfoCircleOutlined />
              Chính sách vòng đời
            </span>
          </Tooltip>
        }
      >
        <Table
          columns={columns}
          dataSource={judges}
          rowKey={(record) => record.id || record.email}
          loading={loading}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (nextPage, nextSize) => {
              setPage(nextPage - 1);
              setPageSize(nextSize);
            },
          }}
          locale={{ emptyText: <Empty description="Chưa có giám khảo khách mời nào" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>

      <Modal
        title="Mời giám khảo khách tham gia Hackathon"
        open={isModalOpen}
        onCancel={() => { setIsModalOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Gửi lời mời"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="fullName" label="Họ và tên giám khảo" rules={[{ required: true, message: 'Vui lòng nhập họ và tên!' }]}>
            <Input prefix={<UserAddOutlined />} placeholder="VD: TS. Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="email" label="Địa chỉ email" rules={[{ required: true, message: 'Chọn hoặc nhập email.' }]}>
            <UserInviteAutoComplete
              placeholder="Tìm theo email hoặc tên..."
              searchFn={userService.searchCoordinatorInviteCandidates}
              getSecondaryLine={personnelSecondaryLine}
              onUserSelect={(user) => {
                form.setFieldsValue({
                  fullName: user.fullName || user.full_name,
                  email: user.email,
                  institution: user.institution || form.getFieldValue('institution'),
                });
              }}
            />
          </Form.Item>
          <Form.Item name="institution" label="Đơn vị / Tổ chức" rules={[{ required: true, message: 'Vui lòng nhập đơn vị!' }]}>
            <Input prefix={<BankOutlined />} placeholder="VD: Đại học Bách Khoa" />
          </Form.Item>
          <Form.Item name="hackathonId" label="Sự kiện Hackathon" rules={[{ required: true, message: 'Vui lòng chọn sự kiện!' }]}>
            <Select placeholder="Chọn sự kiện">
              {hackathons.map((h) => (
                <Option key={h.id} value={h.id}>{h.name || `Sự kiện #${h.id}`}</Option>
              ))}
            </Select>
          </Form.Item>
          <Alert type="info" showIcon message="Lưu ý" description={GUEST_JUDGE_POLICY} />
        </Form>
      </Modal>
    </div>
  );
};

export default TempJudgesPage;
