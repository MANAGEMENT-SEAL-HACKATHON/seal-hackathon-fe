import { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Upload, message, Steps, Result, Spin, Tag, Modal, theme, Skeleton, Avatar, Row, Col, Card
} from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserOutlined, IdcardOutlined, BankOutlined, PhoneOutlined,
  UploadOutlined, CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined, MailOutlined, HomeOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import AccountSecurityPanel from '../components/AccountSecurityPanel';
import { ROUTES } from '../../../shared/constants/routes';

const { Option } = Select;

const CHAPTERS = [
  { id: 1, name: 'FPT Hà Nội' },
  { id: 2, name: 'FPT Hồ Chí Minh' },
  { id: 3, name: 'FPT Đà Nẵng' },
  { id: 4, name: 'FPT Cần Thơ' },
];

const ERROR_MESSAGES = {
  STUDENT_CODE_DUPLICATE: 'Mã sinh viên đã được sử dụng bởi tài khoản khác.',
  INVALID_CHAPTER: 'Cơ sở không hợp lệ.',
  INSTITUTION_REQUIRED: 'Vui lòng nhập tên trường / tổ chức.',
  STUDENT_CODE_REQUIRED: 'Vui lòng nhập mã sinh viên.',
};

const resolveUserError = (error) => {
  const code = error?.code || error?.data?.error?.code;
  return ERROR_MESSAGES[code] || error?.message || 'Có lỗi xảy ra. Vui lòng thử lại!';
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getUserInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('userInfo') || '{}');
  } catch {
    return {};
  }
};

const StudentCardPreview = ({ userId }) => {
  const [cardUrl, setCardUrl] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  useEffect(() => {
    if (!userId) return undefined;
    let active = true;
    const load = async () => {
      setLoadingCard(true);
      try {
        const blob = await userService.getMyStudentCardBlob();
        if (!active || !blob) return;
        setCardUrl(URL.createObjectURL(blob));
      } catch (err) {
        console.error('Failed to load student card from backend:', err);
      } finally {
        if (active) setLoadingCard(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => () => {
    if (cardUrl) URL.revokeObjectURL(cardUrl);
  }, [cardUrl]);

  if (!userId) return null;

  return (
    <div style={{ marginTop: 16, textAlign: 'center' }}>
      {loadingCard && <Spin size="small" />}
      {cardUrl ? (
        <div style={{ display: 'inline-block', position: 'relative', borderRadius: 16, overflow: 'hidden', border: `2px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}`, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <img
            src={cardUrl}
            alt="Ảnh thẻ sinh viên hiện tại"
            style={{
              maxWidth: '100%',
              maxHeight: 220,
              objectFit: 'contain',
              display: 'block',
              background: isDark ? '#0f172a' : '#f8fafc',
            }}
          />
        </div>
      ) : !loadingCard ? (
        <Tag color="warning">Chưa có ảnh thẻ trên máy chủ — vui lòng tải lên.</Tag>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const OnboardingPage = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  const [currentStep, setCurrentStep] = useState(0); // 0 = profile, 1 = student card, 2 = waiting, 3 = approved
  const [userType, setUserType] = useState('INTERNAL');
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [userInfo, setUserInfo] = useState(getUserInfo);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Early redirect for coordinators/admins who don't have profiles
  useEffect(() => {
    const initialUser = getUserInfo();
    if (['COORDINATOR', 'SUPERADMIN'].includes(initialUser.role)) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [navigate]);

  // Sync state on load using real API response to avoid local storage inconsistencies
  useEffect(() => {
    let active = true;
    const fetchFreshStatus = async () => {
      try {
        const freshUser = await userService.getMe();
        if (!active) return;

        if (['COORDINATOR', 'SUPERADMIN'].includes(freshUser.role)) {
          navigate(ROUTES.DASHBOARD, { replace: true });
          return;
        }
        
        const stored = getUserInfo() || {};
        
        if (stored.status && stored.status !== 'APPROVED' && freshUser.status === 'APPROVED') {
          Modal.success({
            title: '🎉 Hồ sơ đã được phê duyệt!',
            content: 'Tài khoản của bạn vừa được cấp quyền chính thức. Vui lòng đăng nhập lại.',
            okText: 'Đăng nhập lại ngay',
            onOk: () => {
              localStorage.clear();
              window.location.href = '/login';
            },
            keyboard: false,
            maskClosable: false,
          });
          return;
        }

        const merged = { ...stored, ...freshUser };
        localStorage.setItem('userInfo', JSON.stringify(merged));
        window.dispatchEvent(new Event('userInfoUpdated'));
        setUserInfo(merged);

        form.setFieldsValue({
          fullName: merged.fullName,
          userType: merged.userType || 'INTERNAL',
          chapterId: merged.chapterId || 1,
          studentCode: merged.studentCode,
          institution: merged.institution,
          phone: merged.phone,
        });
        if (merged.userType) setUserType(merged.userType);

        if (freshUser.status === 'APPROVED') {
          setCurrentStep(3);
        } else {
          const hasCompletedProfile = Boolean(
            freshUser.fullName
            && freshUser.studentCode
            && (freshUser.userType !== 'EXTERNAL' || freshUser.institution)
          );
          const hasUploadedCard = Boolean(freshUser.studentCardImagePath || freshUser.studentCardUrl || freshUser.studentCardUploaded);
          
          setHasCard(hasUploadedCard);

          if (hasCompletedProfile && hasUploadedCard) {
            setCurrentStep(2);
          } else if (hasCompletedProfile) {
            setCurrentStep(1);
          } else {
            setCurrentStep(0);
          }
        }
      } catch (err) {
        console.error('Failed to sync onboarding status:', err);
      } finally {
        if (active) setCheckingStatus(false);
      }
    };

    fetchFreshStatus();
    return () => { active = false; };
  }, [form, navigate]);

  // -------------------------------------------------------------------------
  // Step 1 – Profile
  // -------------------------------------------------------------------------
  const handleProfileSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        fullName: values.fullName,
        userType: values.userType,
        phone: values.phone || undefined,
        studentCode: values.studentCode,
        ...(values.userType === 'INTERNAL'
          ? { chapterId: values.chapterId }
          : { institution: values.institution }),
      };

      await userService.patchMe(payload);

      const updated = { ...getUserInfo(), profileCompleted: true };
      localStorage.setItem('userInfo', JSON.stringify(updated));
      window.dispatchEvent(new Event('userInfoUpdated'));
      setUserInfo(updated);

      message.success('Thông tin hồ sơ đã được cập nhật!');
      setCurrentStep(1);
    } catch (error) {
      message.error(resolveUserError(error));
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Step 2 – Student Card Upload
  // -------------------------------------------------------------------------
  const handleCardUpload = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn ảnh thẻ sinh viên trước khi tải lên!');
      return;
    }

    setCardLoading(true);
    try {
      const file = fileList[0].originFileObj || fileList[0];
      const userId = userInfo?.id || userInfo?.userId;

      if (!userId) {
        throw new Error('Không xác định được ID người dùng!');
      }

      // Upload qua BE (MinIO/storage) — không ký Cloudinary trên client (CLOUD-01/02)
      await userService.uploadStudentCard(file);

      const updated = { ...getUserInfo(), studentCardUploaded: true };
      localStorage.setItem('userInfo', JSON.stringify(updated));
      window.dispatchEvent(new Event('userInfoUpdated'));
      setUserInfo(updated);

      setHasCard(true);
      message.success('Tải lên thẻ sinh viên thành công!');
      setCurrentStep(2);
    } catch (error) {
      console.error('Upload card error:', error);
      message.error(error.message || resolveUserError(error));
    } finally {
      setCardLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userInfo');
    navigate(ROUTES.LOGIN, { replace: true });
  };

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const dynamicInputStyle = {
    backgroundColor: token.colorFillAlter,
    borderColor: token.colorBorder,
    color: token.colorText,
    height: 48,
    borderRadius: 16,
  };

  const renderProfileStep = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleProfileSubmit}
      initialValues={{
        fullName: userInfo.fullName,
        userType: userInfo.userType || 'INTERNAL',
        chapterId: userInfo.chapterId || 1,
        studentCode: userInfo.studentCode,
        institution: userInfo.institution,
        phone: userInfo.phone,
      }}
      requiredMark={false}
    >
      <Form.Item label={<Label token={token}>EMAIL (CHỈ XEM)</Label>}>
        <Input
          value={userInfo?.email || ''}
          readOnly
          prefix={<MailOutlined style={{ color: '#00529C', marginRight: 8 }} />}
          style={dynamicInputStyle}
          className="custom-ob-input"
        />
      </Form.Item>

      <Form.Item
        label={<Label token={token}>HỌ VÀ TÊN</Label>}
        name="fullName"
        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
      >
        <Input
          prefix={<UserOutlined style={{ color: '#00529C', marginRight: 8 }} />}
          placeholder="Nguyễn Văn A"
          style={dynamicInputStyle}
          className="custom-ob-input"
        />
      </Form.Item>

      <Form.Item label={<Label token={token}>ĐỐI TƯỢNG</Label>} name="userType">
        <Select
          onChange={(val) => setUserType(val)}
          className="custom-ob-select"
          style={{ height: 48 }}
        >
          <Option value="INTERNAL">Sinh viên FPT (Nội bộ)</Option>
          <Option value="EXTERNAL">Sinh viên trường khác (Bên ngoài)</Option>
        </Select>
      </Form.Item>

      {userType === 'INTERNAL' && (
        <>
          <Form.Item
            label={<Label token={token}>CƠ SỞ (CHAPTER)</Label>}
            name="chapterId"
            rules={[{ required: true, message: 'Vui lòng chọn cơ sở!' }]}
          >
            <Select className="custom-ob-select" style={{ height: 48 }}>
              {CHAPTERS.map((c) => (
                <Option key={c.id} value={c.id}>{c.name}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label={<Label token={token}>MÃ SINH VIÊN</Label>}
            name="studentCode"
            rules={[{ required: true, message: 'Vui lòng nhập mã sinh viên!' }]}
          >
            <Input
              prefix={<IdcardOutlined style={{ color: '#00529C', marginRight: 8 }} />}
              placeholder="VD: SE123456"
              style={dynamicInputStyle}
              className="custom-ob-input"
            />
          </Form.Item>
        </>
      )}

      {userType === 'EXTERNAL' && (
        <>
          <Form.Item
            label={<Label token={token}>TÊN TRƯỜNG / TỔ CHỨC</Label>}
            name="institution"
            rules={[{ required: true, message: 'Vui lòng nhập tên trường!' }]}
          >
            <Input
              prefix={<BankOutlined style={{ color: '#00529C', marginRight: 8 }} />}
              placeholder="Đại học Bách Khoa..."
              style={dynamicInputStyle}
              className="custom-ob-input"
            />
          </Form.Item>

          <Form.Item
            label={<Label token={token}>MÃ SINH VIÊN</Label>}
            name="studentCode"
            rules={[{ required: true, message: 'Vui lòng nhập mã sinh viên!' }]}
          >
            <Input
              prefix={<IdcardOutlined style={{ color: '#00529C', marginRight: 8 }} />}
              placeholder="VD: 21520001 hoặc mã SV trường bạn"
              style={dynamicInputStyle}
              className="custom-ob-input"
            />
          </Form.Item>
        </>
      )}

      <Form.Item label={<Label token={token}>SỐ ĐIỆN THOẠI (TÙY CHỌN)</Label>} name="phone">
        <Input
          prefix={<PhoneOutlined style={{ color: '#00529C', marginRight: 8 }} />}
          placeholder="0912345678"
          style={dynamicInputStyle}
          className="custom-ob-input"
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 16 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          style={{
            height: 48,
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 800,
            border: 'none',
            background: 'linear-gradient(135deg, #00529C 0%, #003366 100%)',
            color: '#fff',
            boxShadow: '0 8px 20px rgba(0, 82, 156, 0.25)',
          }}
        >
          Lưu hồ sơ & tiếp tục →
        </Button>
      </Form.Item>
    </Form>
  );

  const renderCardStep = () => (
    <div>
      <p style={{ color: token.colorTextSecondary, marginBottom: 16, lineHeight: 1.6 }}>
        Vui lòng tải lên <strong>ảnh thẻ sinh viên</strong> của bạn.
        Ảnh rõ nét, không bị che khuất để Ban Tổ Chức có thể xác thực.
      </p>

      <Upload
        listType="picture-card"
        fileList={fileList}
        beforeUpload={(file) => {
          const isImage = file.type.startsWith('image/');
          if (!isImage) {
            message.error('Chỉ được upload file ảnh (JPG, PNG, ...)!');
            return Upload.LIST_IGNORE;
          }
          const isLt5M = file.size / 1024 / 1024 < 5;
          if (!isLt5M) {
            message.error('Ảnh phải nhỏ hơn 5 MB!');
            return Upload.LIST_IGNORE;
          }
          setFileList([file]);
          return false;
        }}
        onRemove={() => { setFileList([]); setHasCard(false); }}
        maxCount={1}
        style={{ width: '100%' }}
      >
        {fileList.length === 0 && (
          <div>
            <UploadOutlined style={{ fontSize: 24, color: '#00529C' }} />
            <div style={{ marginTop: 8, fontSize: 12, color: token.colorTextSecondary }}>Chọn ảnh</div>
          </div>
        )}
      </Upload>

      {hasCard && fileList.length === 0 && (
        <>
          <StudentCardPreview userId={userInfo?.id || userInfo?.userId} />
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 12px', borderRadius: 12, fontWeight: 700 }}>
              Đã có ảnh thẻ — có thể dùng lại hoặc tải lên ảnh mới
            </Tag>
          </div>
        </>
      )}

      {hasCard && fileList.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Tag color="processing" icon={<CheckCircleOutlined />} style={{ padding: '4px 12px', borderRadius: 12, fontWeight: 700 }}>
            Đã chọn ảnh mới để tải lên
          </Tag>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <Button
          style={{ flex: 1, height: 48, borderRadius: 16, fontWeight: 700 }}
          onClick={() => setCurrentStep(0)}
          disabled={cardLoading}
        >
          ← Quay lại
        </Button>
        {fileList.length > 0 ? (
          <Button
            type="primary"
            style={{
              flex: 2,
              height: 48,
              borderRadius: 16,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #F37021 0%, #FF8C42 100%)',
              border: 'none',
              boxShadow: '0 8px 20px rgba(243, 112, 33, 0.25)',
            }}
            onClick={handleCardUpload}
            loading={cardLoading}
          >
            Tải lên & nộp hồ sơ
          </Button>
        ) : (
          <Button
            type="primary"
            style={{
              flex: 2,
              height: 48,
              borderRadius: 16,
              fontWeight: 800,
              background: 'linear-gradient(135deg, #00529C 0%, #003366 100%)',
              border: 'none',
            }}
            onClick={() => setCurrentStep(2)}
            disabled={!hasCard}
          >
            Nộp hồ sơ (Dùng ảnh cũ)
          </Button>
        )}
      </div>
    </div>
  );

  const renderWaitingStep = () => (
    <Result
      icon={<ClockCircleOutlined style={{ color: '#F37021', fontSize: 64 }} />}
      title={<span style={{ fontWeight: 900, color: token.colorTextHeading, fontSize: 24 }}>Hồ Sơ Đã Được Gửi Xét Duyệt!</span>}
      subTitle={
        <span style={{ color: token.colorTextSecondary, fontSize: 15, display: 'block', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
          Ban Tổ Chức và Coordinator đang kiểm duyệt hồ sơ của bạn. Khi được duyệt, tài khoản sẽ tự động mở khóa toàn bộ quyền tham gia Hackathon.
        </span>
      }
      extra={[
        <Button
          key="dashboard"
          type="primary"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          style={{
            height: 46,
            borderRadius: 14,
            fontWeight: 800,
            padding: '0 28px',
            background: 'linear-gradient(135deg, #00529C 0%, #003366 100%)',
            border: 'none',
            boxShadow: '0 8px 20px rgba(0, 82, 156, 0.25)',
          }}
        >
          Về Trang Chủ
        </Button>,
        <Button key="edit" onClick={() => setCurrentStep(0)} style={{ height: 46, borderRadius: 14, fontWeight: 700, padding: '0 24px' }}>
          Chỉnh sửa thông tin
        </Button>,
      ]}
    />
  );

  const renderApprovedStep = () => {
    const chapterName = CHAPTERS.find(c => c.id === userInfo.chapterId)?.name || 'FPT University';
    const orgName = userInfo.userType === 'INTERNAL' ? 'Sinh viên FPT (Nội bộ)' : (userInfo.institution || 'Sinh viên trường');

    return (
      <div style={{ textAlign: 'left' }}>
        {/* HERO PASSPORT CARD */}
        <Card
          style={{
            borderRadius: 24,
            background: isDark
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)'
              : 'linear-gradient(135deg, #00244D 0%, #00529C 60%, #003366 100%)',
            color: '#fff',
            border: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.2)'}`,
            boxShadow: '0 16px 40px rgba(0, 82, 156, 0.25)',
            marginBottom: 24,
            overflow: 'hidden',
            position: 'relative',
          }}
          styles={{ body: { padding: '28px 32px' } }}
        >
          {/* Decorative glow */}
          <div style={{ position: 'absolute', top: -60, right: -40, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(243, 112, 33, 0.4) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -50, left: '20%', width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <Avatar
                size={76}
                style={{
                  background: 'linear-gradient(135deg, #F37021 0%, #FF8C42 100%)',
                  color: '#fff',
                  fontSize: 32,
                  fontWeight: 900,
                  border: '3px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              >
                {(userInfo.fullName || userInfo.email || 'S').charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Tag color="success" icon={<SafetyCertificateOutlined />} style={{ padding: '3px 12px', borderRadius: 20, fontWeight: 800, fontSize: 12, border: 'none', background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7' }}>
                    TÀI KHOẢN CHÍNH THỨC
                  </Tag>
                  <Tag color="orange" style={{ padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 11, border: 'none', background: 'rgba(243, 112, 33, 0.25)', color: '#fdba74' }}>
                    STUDENT
                  </Tag>
                </div>
                <h2 style={{ margin: 0, color: '#fff', fontSize: 24, fontWeight: 900, letterSpacing: '-0.02em' }}>
                  {userInfo.fullName || 'Sinh Viên FPTU'}
                </h2>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <MailOutlined /> {userInfo.email}
                </span>
              </div>
            </div>

            <Button
              type="primary"
              size="large"
              icon={<TrophyOutlined />}
              onClick={() => navigate(ROUTES.DASHBOARD)}
              style={{
                height: 48,
                borderRadius: 14,
                fontWeight: 800,
                fontSize: 15,
                padding: '0 24px',
                background: 'linear-gradient(135deg, #F37021 0%, #FF8C42 100%)',
                border: 'none',
                boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
              }}
            >
              Vào Không Gian Thi Đấu
            </Button>
          </div>
        </Card>

        {/* IDENTITY DETAILS BENTO GRID */}
        <Row gutter={[20, 20]}>
          <Col xs={24} md={14}>
            <Card
              title={<span style={{ fontWeight: 800, fontSize: 16, color: token.colorTextHeading }}>📌 Thông Tin Hồ Sơ Thi Đấu</span>}
              style={{
                borderRadius: 24,
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.04)',
                height: '100%',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <Row gutter={[16, 20]}>
                <Col span={12}>
                  <div style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    Đơn vị / Trường
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: token.colorTextHeading }}>
                    <HomeOutlined style={{ color: '#00529C', marginRight: 6 }} /> {orgName}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    Cơ sở (Chapter)
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: token.colorTextHeading }}>
                    <BankOutlined style={{ color: '#00529C', marginRight: 6 }} /> {chapterName}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    Mã sinh viên
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: token.colorTextHeading }}>
                    <IdcardOutlined style={{ color: '#00529C', marginRight: 6 }} /> {userInfo.studentCode || '—'}
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ color: token.colorTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                    Số điện thoại
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: token.colorTextHeading }}>
                    <PhoneOutlined style={{ color: '#00529C', marginRight: 6 }} /> {userInfo.phone || 'Chưa cập nhật'}
                  </div>
                </Col>
              </Row>

              <div style={{ marginTop: 24, padding: 14, background: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4', borderRadius: 14, border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.25)' : '#bbf7d0'}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircleOutlined style={{ color: '#10b981', fontSize: 18 }} />
                <span style={{ fontSize: 13, color: isDark ? '#6ee7b7' : '#065f46', fontWeight: 600 }}>
                  Hồ sơ đã được kiểm duyệt hợp lệ. Thông tin định danh được khóa để bảo đảm tính minh bạch trong suốt giải đấu.
                </span>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={10}>
            <Card
              title={<span style={{ fontWeight: 800, fontSize: 16, color: token.colorTextHeading }}>🪪 Thẻ Sinh Viên</span>}
              style={{
                borderRadius: 24,
                background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'}`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.04)',
                height: '100%',
                textAlign: 'center',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <StudentCardPreview userId={userInfo?.id || userInfo?.userId} />
              <div style={{ marginTop: 14 }}>
                <Tag color="success" style={{ fontWeight: 700, borderRadius: 12, padding: '4px 12px' }}>
                  🟢 Đã xác thực bởi Coordinator
                </Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  return (
    <div
      style={{
        padding: '24px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 68px)',
        background: token.colorBgLayout,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: currentStep >= 3 ? 880 : 620,
          backgroundColor: token.colorBgContainer,
          borderRadius: 28,
          padding: currentStep >= 3 ? '36px 32px' : '40px 36px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.06)',
          border: `1px solid ${token.colorBorderSecondary}`,
          position: 'relative',
          overflow: 'hidden',
          transition: 'max-width 0.4s ease',
        }}
      >
        {/* Gradient top bar - Official FPT Triad */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 5,
            background: 'linear-gradient(90deg, #00529C 0%, #F37021 100%)',
          }}
        />

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 900,
              margin: '0 0 6px 0',
              background: 'linear-gradient(90deg, #00529C 0%, #F37021 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            {currentStep >= 3 ? 'Hồ Sơ & Định Danh Sinh Viên' : 'Hoàn Thiện Hồ Sơ'}
          </h1>
          <p style={{ color: token.colorTextSecondary, fontSize: 14, margin: 0, fontWeight: 600 }}>
            {currentStep >= 3
              ? 'Thông tin xác thực và quyền truy cập không gian thi đấu Hackathon'
              : 'Bước xác thực thông tin trước khi tham gia giải đấu Hackathon FPTU'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {checkingStatus ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '24px 0' }}
            >
              <Skeleton active avatar paragraph={{ rows: 8 }} />
            </motion.div>
          ) : (
            <motion.div
              key="profile-content"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
            >
              <Steps
                current={currentStep > 2 ? 2 : currentStep}
                size="small"
                style={{ marginBottom: 32 }}
                items={[
                  { title: 'Thông tin', icon: <UserOutlined /> },
                  { title: 'Thẻ SV', icon: <IdcardOutlined /> },
                  { title: 'Xác thực', icon: currentStep > 2 ? <CheckCircleOutlined /> : <ClockCircleOutlined /> },
                ]}
              />

              {currentStep === 0 && renderProfileStep()}
              {currentStep === 1 && renderCardStep()}
              {currentStep === 2 && renderWaitingStep()}
              {currentStep === 3 && renderApprovedStep()}
              {currentStep >= 3 && <AccountSecurityPanel />}

              {currentStep < 2 && (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button
                    onClick={handleLogout}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: token.colorTextQuaternary, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    Đăng xuất tài khoản
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .custom-ob-input { overflow: hidden !important; }
        .custom-ob-input input::placeholder { color: ${token.colorTextQuaternary} !important; }
        .custom-ob-input input, .custom-ob-input .ant-input-password {
          background-color: transparent !important; color: ${token.colorText} !important; border-radius: 16px !important;
        }
        .custom-ob-input:hover, .custom-ob-input:focus-within {
          border-color: #00529C !important;
          box-shadow: 0 0 0 2px rgba(0, 82, 156, 0.15) !important;
        }
        .custom-ob-select .ant-select-selector {
          background-color: ${token.colorFillAlter} !important; border: 1px solid ${token.colorBorder} !important;
          color: ${token.colorText} !important; height: 48px !important; border-radius: 16px !important;
          align-items: center !important;
        }
        .custom-ob-select:hover .ant-select-selector,
        .custom-ob-select.ant-select-focused .ant-select-selector {
          border-color: #00529C !important;
          box-shadow: 0 0 0 2px rgba(0, 82, 156, 0.15) !important;
        }
        .ant-upload-select { border-radius: 16px !important; }
        .ant-upload-list-item { border-color: ${token.colorBorder} !important; border-radius: 16px !important; }
      `}</style>
    </div>
  );
};

const Label = ({ children, token }) => (
  <span style={{ color: token?.colorTextSecondary || '#4b5563', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px' }}>
    {children}
  </span>
);

export default OnboardingPage;
