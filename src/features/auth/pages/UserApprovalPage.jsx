import { useState, useEffect } from 'react';
import {
  Table, Tag, Button, Modal, Form, Input, Select, Space, Card,
  Typography, Tooltip, Empty, message, Spin
} from 'antd';
import {
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  ExclamationCircleOutlined, SafetyCertificateOutlined,
  UndoOutlined, SearchOutlined
} from '@ant-design/icons';
import { userService } from '../services/userService';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import CoordinatorHero from '../../../shared/components/ui/CoordinatorHero';
import { tableCardStyle, whiteButtonStyle } from '../../../shared/theme/coordinatorTheme';

const { Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const CHAPTERS = {
  1: 'FPT Hà Nội',
  2: 'FPT Hồ Chí Minh',
  3: 'FPT Đà Nẵng',
  4: 'FPT Cần Thơ',
};

const StudentCardImage = ({ userId }) => {
  const [loading, setLoading] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [cloudinaryFailed, setCloudinaryFailed] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'drrd1a7jd';
  const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/student-cards/student-card-${userId}`;

  useEffect(() => {
    let active = true;
    const loadDetail = async () => {
      setLoading(true);
      try {
        const detail = await userService.getUserDetail(userId);
        if (active) {
          const path = detail?.studentCardImagePath;
          setHasCard(Boolean(path));
          if (path?.startsWith('http')) {
            setCloudinaryFailed(false);
          }
        }
      } catch (err) {
        console.error('Failed to load student card path:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDetail();
    return () => { active = false; };
  }, [userId]);

  // Fallback: fetch blob via axios (Bearer) when Cloudinary fails
  useEffect(() => {
    if (!cloudinaryFailed || !hasCard) return undefined;
    let active = true;
    let objectUrl = null;
    const loadBlob = async () => {
      try {
        const blob = await userService.getStudentCardBlob(userId);
        objectUrl = URL.createObjectURL(blob);
        if (active) setBlobUrl(objectUrl);
      } catch (err) {
        console.error('Failed to load student card blob:', err);
        if (active) setBlobUrl(null);
      }
    };
    loadBlob();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cloudinaryFailed, hasCard, userId]);

  useEffect(() => () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  if (loading) return <Spin size="small" />;
  if (!hasCard) return <Text type="secondary">Chưa upload</Text>;

  const displayUrl = cloudinaryFailed ? blobUrl : cloudinaryUrl;
  if (cloudinaryFailed && !blobUrl) return <Spin size="small" />;

  return (
    <a href={displayUrl} target="_blank" rel="noreferrer">
      <img
        src={displayUrl}
        alt="Thẻ sinh viên"
        style={{
          width: '60px',
          height: '40px',
          objectFit: 'cover',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          transition: 'transform 0.2s',
          cursor: 'zoom-in',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1.0)'; }}
        onError={() => {
          if (!cloudinaryFailed) setCloudinaryFailed(true);
        }}
      />
    </a>
  );
};

const UserTypeDetails = ({ userId, initialType, initialInstitution, initialStudentCode }) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState(
    initialStudentCode ? { studentCode: initialStudentCode } : null
  );

  useEffect(() => {
    let active = true;
    const loadDetail = async () => {
      setLoading(true);
      try {
        const detail = await userService.getUserDetail(userId);
        if (active) {
          setDetails({
            studentCode: detail?.studentCode,
            chapterId: detail?.chapterId,
            chapterName: detail?.chapterName,
            institution: detail?.institution,
          });
        }
      } catch (err) {
        console.error('Failed to load student details:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadDetail();
    return () => { active = false; };
  }, [userId, initialType]);

  if (loading && !details) return <Spin size="small" />;

  if (initialType === 'EXTERNAL') {
    return (
      <div>
        <Tag color="blue" style={{ borderRadius: 6 }}>Trường ngoài</Tag>
        <div style={{ marginTop: 4, fontSize: '13px', color: '#4b5563' }}>
          Trường: <strong>{details?.institution || initialInstitution || 'N/A'}</strong>
        </div>
        <div style={{ fontSize: '13px', color: '#4b5563' }}>
          Mã SV: <strong>{details?.studentCode || initialStudentCode || 'N/A'}</strong>
        </div>
      </div>
    );
  }

  if (loading) return <Spin size="small" />;

  const studentCode = details?.studentCode || 'N/A';
  const chapterId = details?.chapterId;
  const chapterName = details?.chapterName || (chapterId ? CHAPTERS[chapterId] : 'Chapter N/A');

  return (
    <div>
      <Tag color="cyan" style={{ borderRadius: 6 }}>Nội bộ (FPT)</Tag>
      <div style={{ marginTop: 4, fontSize: '13px' }}>
        Mã SV: <strong>{studentCode}</strong>
      </div>
      <div style={{ fontSize: '12px', color: '#4b5563' }}>
        Cơ sở: {chapterName}
      </div>
    </div>
  );
};

const extractUserArray = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const commonKeys = ['content', 'users', 'list', 'data', 'items', 'results', 'elements'];
  for (const key of commonKeys) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  for (const key in data) {
    if (Array.isArray(data[key])) {
      return data[key];
    }
  }

  return [];
};

const UserApprovalPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modals state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rejectForm] = Form.useForm();

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideForm] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
        ...(statusFilter === 'ALL' ? {} : { status: statusFilter }),
        ...(searchText.trim() ? { q: searchText.trim() } : {}),
      };
      const data = await userService.getUsers(params);
      const parsedUsers = extractUserArray(data);
      setUsers(parsedUsers);
      setTotal(Number(data?.totalElements ?? parsedUsers.length) || 0);
    } catch (error) {
      console.error('Fetch users error:', error);
      message.error('Không thể lấy danh sách người dùng từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, page, pageSize]);

  const handleApprove = async (userId) => {
    try {
      await userService.updateUserStatus(userId, 'APPROVED');
      message.success('Đã duyệt tài khoản thành công!');
      fetchUsers();
    } catch (error) {
      console.error('Approve user error details:', error);
      message.error(error?.message || error?.data?.message || 'Lỗi khi duyệt tài khoản.');
    }
  };

  const handleRejectSubmit = async (values) => {
    if (!selectedUser) return;
    try {
      await userService.updateUserStatus(selectedUser.userId || selectedUser.id, 'REJECTED', {
        rejectionReason: values.rejectionReason,
      });
      message.success('Đã từ chối tài khoản thành công!');
      setRejectModalOpen(false);
      rejectForm.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Reject user error details:', error);
      message.error(error?.message || error?.data?.message || 'Lỗi khi từ chối tài khoản.');
    }
  };

  const handleOverrideSubmit = async (values) => {
    if (!selectedUser) return;
    try {
      await userService.updateUserStatus(selectedUser.userId || selectedUser.id, 'PENDING', {
        overrideReason: values.overrideReason,
      });
      message.success('Đã khôi phục tài khoản về trạng thái Chờ duyệt!');
      setOverrideModalOpen(false);
      overrideForm.resetFields();
      fetchUsers();
    } catch (error) {
      console.error('Override user error details:', error);
      message.error(error?.message || error?.data?.message || 'Lỗi khi khôi phục tài khoản.');
    }
  };

  const columns = [
    {
      title: 'Họ và tên',
      dataIndex: 'fullName',
      key: 'fullName',
      render: (text, record) => (
        <div>
          <strong style={{ color: '#111827' }}>{text || 'Chưa cập nhật'}</strong>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            ID: {record.userId || record.id}
          </div>
        </div>
      ),
    },
    {
      title: 'Email & Xác minh',
      dataIndex: 'email',
      key: 'email',
      render: (email, record) => {
        const isVerified = !!record.emailVerifiedAt || record.emailVerified;
        return (
          <Space direction="vertical" size={2}>
            <span>{email}</span>
            {isVerified ? (
              <Tag color="success" icon={<SafetyCertificateOutlined />} style={{ borderRadius: 6 }}>
                Đã verify ({record.emailVerifiedAt ? new Date(record.emailVerifiedAt).toLocaleDateString('vi-VN') : 'OAuth'})
              </Tag>
            ) : (
              <Tooltip title="Người dùng chưa nhấp vào link xác nhận email">
                <Tag color="warning" icon={<ExclamationCircleOutlined />} style={{ borderRadius: 6 }}>
                  Chưa verify email
                </Tag>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Loại / Tổ chức',
      dataIndex: 'userType',
      key: 'userType',
      render: (type, record) => (
        <UserTypeDetails
          userId={record.userId || record.id}
          initialType={type}
          initialInstitution={record.institution}
          initialStudentCode={record.studentCode}
        />
      ),
    },
    {
      title: 'Thẻ sinh viên',
      dataIndex: 'studentCardUrl',
      key: 'studentCardUrl',
      render: (_, record) => (
        <StudentCardImage userId={record.userId || record.id} />
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Space direction="vertical" size={4}>
          <StatusBadge status={status} />
          {status === 'REJECTED' && record.rejectionReason && (
            <div style={{ fontSize: '12px', color: '#ef4444', maxWidth: '180px' }}>
              Lý do: <em>{record.rejectionReason}</em>
            </div>
          )}
          {record.overrideReason && (
            <div style={{ fontSize: '12px', color: '#0072ff', maxWidth: '180px' }}>
              Khôi phục: <em>{record.overrideReason}</em>
            </div>
          )}
        </Space>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => {
        const userId = record.userId || record.id;
        if (record.status === 'PENDING') {
          return (
            <Space>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                style={{ backgroundColor: '#10b981', borderColor: '#10b981', borderRadius: '10px' }}
                onClick={() => handleApprove(userId)}
              >
                Duyệt
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                style={{ borderRadius: '10px' }}
                onClick={() => {
                  setSelectedUser(record);
                  setRejectModalOpen(true);
                }}
              >
                Từ chối
              </Button>
            </Space>
          );
        }
        if (record.status === 'REJECTED') {
          return (
            <Button
              icon={<UndoOutlined />}
              style={{ color: '#0072ff', borderColor: '#0072ff', borderRadius: '10px' }}
              onClick={() => {
                setSelectedUser(record);
                setOverrideModalOpen(true);
              }}
            >
              Override (Mở lại)
            </Button>
          );
        }
        return <Text type="secondary">Không có thao tác</Text>;
      },
    },
  ];

  return (
    <div className="coord-page" style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      <CoordinatorHero
        data-testid="user-approval-hero"
        title="Duyệt tài khoản người dùng"
        subtitle="Xem xét hồ sơ sinh viên, thông tin mã số và hình ảnh thẻ để kích hoạt tài khoản."
        actions={
          <>
            <span />
            <Button
              type="default"
              icon={<SyncOutlined spin={loading} />}
              onClick={fetchUsers}
              style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              Tải lại
            </Button>
          </>
        }
      />

      <Card style={tableCardStyle}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Select
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
            style={{ width: '180px', height: '40px' }}
            dropdownStyle={{ borderRadius: '12px' }}
          >
            <Option value="ALL">Tất cả trạng thái</Option>
            <Option value="PENDING">Chờ phê duyệt</Option>
            <Option value="APPROVED">Đã phê duyệt</Option>
            <Option value="REJECTED">Đã từ chối</Option>
          </Select>

          <Input
            placeholder="Tìm theo email, tên, mã SV, trường..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onPressEnter={() => {
              setPage(0);
              fetchUsers();
            }}
            style={{ maxWidth: '320px', height: '40px', borderRadius: '12px' }}
            allowClear
            onClear={() => {
              setSearchText('');
              setPage(0);
            }}
          />
          <Button
            type="default"
            onClick={() => {
              setPage(0);
              fetchUsers();
            }}
            style={{ borderRadius: '12px', height: 40 }}
          >
            Tìm
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey={(record) => record.userId || record.id}
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
          locale={{
            emptyText: <Empty description="Không tìm thấy người dùng nào phù hợp" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          }}
          style={{ overflowX: 'auto' }}
        />
      </Card>

      {/* Reject Modal */}
      <Modal
        title="Từ chối phê duyệt tài khoản"
        open={rejectModalOpen}
        onCancel={() => {
          setRejectModalOpen(false);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, style: { borderRadius: '10px' } }}
        cancelButtonProps={{ style: { borderRadius: '10px' } }}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleRejectSubmit}>
          <div style={{ marginBottom: '16px' }}>
            Bạn đang thực hiện từ chối tài khoản: <strong>{selectedUser?.email}</strong>.
          </div>
          <Form.Item
            name="rejectionReason"
            label="Lý do từ chối (Bắt buộc)"
            rules={[{ required: true, message: 'Vui lòng nhập lý do từ chối!' }]}
          >
            <TextArea rows={4} placeholder="Nhập lý do chi tiết từ chối..." style={{ borderRadius: '12px' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Override Modal */}
      <Modal
        title="Khôi phục trạng thái chờ duyệt"
        open={overrideModalOpen}
        onCancel={() => {
          setOverrideModalOpen(false);
          overrideForm.resetFields();
        }}
        onOk={() => overrideForm.submit()}
        okText="Khôi phục"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#0072ff', borderColor: '#0072ff', borderRadius: '10px' } }}
        cancelButtonProps={{ style: { borderRadius: '10px' } }}
      >
        <Form form={overrideForm} layout="vertical" onFinish={handleOverrideSubmit}>
          <div style={{ marginBottom: '16px' }}>
            Bạn đang chuyển tài khoản <strong>{selectedUser?.email}</strong> từ trạng thái «Đã từ chối» về lại «Chờ phê duyệt».
          </div>
          <Form.Item
            name="overrideReason"
            label="Lý do khôi phục (Bắt buộc)"
            rules={[{ required: true, message: 'Vui lòng nhập lý do khôi phục!' }]}
          >
            <TextArea rows={4} placeholder="Nhập lý do khôi phục tài khoản..." style={{ borderRadius: '12px' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserApprovalPage;
