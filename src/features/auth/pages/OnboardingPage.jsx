import { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Upload, message, Steps, Result, Spin, Tag
} from 'antd';
import {
  UserOutlined, IdcardOutlined, BankOutlined, PhoneOutlined,
  UploadOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
import { ROUTES } from '../../../shared/constants/routes';

const { Option } = Select;
const { Step } = Steps;

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

const generateSHA1 = async (string) => {
  const buffer = new TextEncoder().encode(string);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
const OnboardingPage = ({ isProfile = false }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(0); // 0 = profile, 1 = student card, 2 = waiting
  const [userType, setUserType] = useState('INTERNAL');
  const [loading, setLoading] = useState(false);
  const [cardLoading, setCardLoading] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [userInfo, setUserInfo] = useState(getUserInfo);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cardUrl, setCardUrl] = useState(null);

  useEffect(() => {
    let active = true;
    const loadCardImage = async () => {
      if (!userInfo?.id && !userInfo?.userId) return;
      const userId = userInfo.id || userInfo.userId;
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'drrd1a7jd';
      const cloudinaryUrl = `https://res.cloudinary.com/${cloudName}/image/upload/student-cards/student-card-${userId}`;
      const fallbackUrl = `/api/v1/users/${userId}/student-card`;

      // Try Cloudinary first
      try {
        const res = await fetch(cloudinaryUrl, { method: 'HEAD' });
        if (res.ok && active) {
          setCardUrl(cloudinaryUrl);
          return;
        }
      } catch (e) {
        console.warn('Cloudinary HEAD check failed, using fallback', e);
      }

      // Fetch fallback with auth token
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(fallbackUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok && active) {
          const blob = await res.blob();
          const localUrl = URL.createObjectURL(blob);
          setCardUrl(localUrl);
        }
      } catch (err) {
        console.error('Failed to load authenticated student card:', err);
      }
    };

    loadCardImage();
    return () => { active = false; };
  }, [userInfo]);

  // Sync state on load using real API response to avoid local storage inconsistencies
  useEffect(() => {
    let active = true;
    const fetchFreshStatus = async () => {
      try {
        const freshUser = await userService.getMe();
        if (!active) return;

        // Sync local storage userInfo with fresh info
        const stored = getUserInfo() || {};
        const merged = { ...stored, ...freshUser };
        localStorage.setItem('userInfo', JSON.stringify(merged));
        window.dispatchEvent(new Event('userInfoUpdated'));
        setUserInfo(merged);

        const isApproved = freshUser.status === 'APPROVED';
        const hasCompletedProfile = Boolean(freshUser.fullName && freshUser.phone);
        const hasUploadedCard = Boolean(freshUser.studentCardImagePath);

        if (isApproved && !isProfile) {
          navigate(ROUTES.DASHBOARD, { replace: true });
          return;
        }

        if (isApproved || (hasCompletedProfile && hasUploadedCard)) {
          setIsCompleted(true);
        } else if (hasCompletedProfile) {
          setCurrentStep(1);
        } else {
          setCurrentStep(0);
        }
      } catch (err) {
        console.error('Failed to sync onboarding status:', err);
      } finally {
        if (active) setCheckingStatus(false);
      }
    };

    fetchFreshStatus();
    return () => { active = false; };
  }, [navigate, isProfile]);

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
        ...(values.userType === 'INTERNAL'
          ? { studentCode: values.studentCode, chapterId: values.chapterId }
          : { institution: values.institution }),
      };

      await userService.patchMe(payload);

      // Persist progress locally
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

      // 1. Prepare Cloudinary parameters for signed upload
      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
      const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Thiếu cấu hình Cloudinary trong environment!');
      }

      const publicId = `student-cards/student-card-${userId}`;
      const timestamp = Math.round(new Date().getTime() / 1000);

      // Alphabetical ordering: public_id, timestamp
      const signatureString = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
      const signature = await generateSHA1(signatureString);

      // 2. Upload to Cloudinary via Fetch API (direct, bypasses global interceptors)
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('api_key', apiKey);
      cloudinaryFormData.append('timestamp', timestamp);
      cloudinaryFormData.append('public_id', publicId);
      cloudinaryFormData.append('signature', signature);

      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: cloudinaryFormData
      });

      if (!cloudinaryResponse.ok) {
        const errorData = await cloudinaryResponse.json();
        throw new Error(errorData?.error?.message || 'Không thể upload ảnh lên Cloudinary');
      }

      const cloudinaryData = await cloudinaryResponse.json();
      console.log('Uploaded to Cloudinary successfully. URL:', cloudinaryData.secure_url);

      // 3. Register image upload on local backend to set studentCardImagePath
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
  const renderProfileStep = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleProfileSubmit}
      initialValues={{ userType: 'INTERNAL', chapterId: 1 }}
      requiredMark={false}
    >
      {/* Email – read-only */}
      <Form.Item label={<Label>EMAIL (CHỈ XEM)</Label>}>
        <Input
          value={userInfo?.email || ''}
          readOnly
          prefix={<UserOutlined style={iconStyle} />}
          style={inputStyle}
          className="custom-ob-input"
        />
      </Form.Item>

      <Form.Item
        label={<Label>HỌ VÀ TÊN</Label>}
        name="fullName"
        rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
      >
        <Input
          prefix={<UserOutlined style={iconStyle} />}
          placeholder="Nguyễn Văn A"
          style={inputStyle}
          className="custom-ob-input"
        />
      </Form.Item>

      <Form.Item label={<Label>ĐỐI TƯỢNG</Label>} name="userType">
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
            label={<Label>CƠ SỞ (CHAPTER)</Label>}
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
            label={<Label>MÃ SINH VIÊN</Label>}
            name="studentCode"
            rules={[{ required: true, message: 'Vui lòng nhập mã sinh viên!' }]}
          >
            <Input
              prefix={<IdcardOutlined style={iconStyle} />}
              placeholder="VD: SE123456"
              style={inputStyle}
              className="custom-ob-input"
            />
          </Form.Item>
        </>
      )}

      {userType === 'EXTERNAL' && (
        <Form.Item
          label={<Label>TÊN TRƯỜNG / TỔ CHỨC</Label>}
          name="institution"
          rules={[{ required: true, message: 'Vui lòng nhập tên trường!' }]}
        >
          <Input
            prefix={<BankOutlined style={iconStyle} />}
            placeholder="Đại học Bách Khoa..."
            style={inputStyle}
            className="custom-ob-input"
          />
        </Form.Item>
      )}

      <Form.Item label={<Label>SỐ ĐIỆN THOẠI (TÙY CHỌN)</Label>} name="phone">
        <Input
          prefix={<PhoneOutlined style={iconStyle} />}
          placeholder="0912345678"
          style={inputStyle}
          className="custom-ob-input"
        />
      </Form.Item>

      <Form.Item style={{ marginTop: 8 }}>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          block
          style={primaryBtnStyle}
        >
          Lưu hồ sơ & tiếp tục →
        </Button>
      </Form.Item>
    </Form>
  );

  const renderCardStep = () => (
    <div>
      <p style={{ color: '#4b5563', marginBottom: 16, lineHeight: 1.6 }}>
        Vui lòng tải lên <strong>ảnh thẻ sinh viên</strong> của bạn.
        Ảnh rõ nét, không bị che khuất để Coordinator có thể kiểm tra.
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
          return false; // prevent auto-upload
        }}
        onRemove={() => { setFileList([]); setHasCard(false); }}
        maxCount={1}
        style={{ width: '100%' }}
      >
        {fileList.length === 0 && (
          <div>
            <UploadOutlined style={{ fontSize: 24, color: '#0072ff' }} />
            <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280' }}>Chọn ảnh</div>
          </div>
        )}
      </Upload>

      {hasCard && (
        <Tag color="success" style={{ marginTop: 8 }} icon={<CheckCircleOutlined />}>
          Đã upload thành công
        </Tag>
      )}

      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <Button
          style={{ flex: 1 }}
          onClick={() => setCurrentStep(0)}
          disabled={cardLoading}
        >
          ← Quay lại
        </Button>
        <Button
          type="primary"
          style={{ flex: 2, ...primaryBtnStyle }}
          onClick={handleCardUpload}
          loading={cardLoading}
          disabled={fileList.length === 0}
        >
          Tải lên & nộp hồ sơ
        </Button>
      </div>
    </div>
  );

  const renderWaitingStep = () => (
    <Result
      icon={<ClockCircleOutlined style={{ color: '#0072ff', fontSize: 56 }} />}
      title="Hồ sơ đã được gửi!"
      subTitle={
        <span style={{ color: '#4b5563' }}>
          Coordinator đang xem xét hồ sơ của bạn. Khi được duyệt, tài khoản của bạn sẽ
          chuyển sang trạng thái Đã phê duyệt.
        </span>
      }
      extra={[
        <Button key="dashboard" type="primary" onClick={() => navigate(ROUTES.DASHBOARD)} style={{ borderRadius: 12, backgroundColor: '#0072ff', borderColor: '#0072ff' }}>
          Quay lại Trang chủ
        </Button>,
        <Button key="logout" onClick={handleLogout} style={{ borderRadius: 12 }}>
          Đăng xuất
        </Button>,
      ]}
    />
  );

  const renderCompletedProfile = () => {
    const chapterObj = CHAPTERS.find(c => c.id === userInfo.chapterId);
    const chapterName = chapterObj ? chapterObj.name : 'Không rõ';

    const handleViewCard = (e) => {
      e.preventDefault();
      if (cardUrl) {
        window.open(cardUrl, '_blank');
      }
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {userInfo.status === 'APPROVED' ? (
          <div style={{
            background: '#e6f9f0', border: '1px solid #34d399', borderRadius: 16,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12
          }}>
            <CheckCircleOutlined style={{ color: '#10b981', fontSize: 20 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#064e3b', fontSize: 15 }}>Hồ sơ đã phê duyệt</div>
              <div style={{ color: '#047857', fontSize: 13, marginTop: 2 }}>Tài khoản của bạn đã được xác minh thành công. Sẵn sàng tham gia Hackathon!</div>
            </div>
          </div>
        ) : (
          <div style={{
            background: '#eff6ff', border: '1px solid #60a5fa', borderRadius: 16,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12
          }}>
            <ClockCircleOutlined style={{ color: '#3b82f6', fontSize: 20 }} />
            <div>
              <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: 15 }}>Hồ sơ đang chờ duyệt</div>
              <div style={{ color: '#2563eb', fontSize: 13, marginTop: 2 }}>Thông tin và thẻ sinh viên đã được gửi lên hệ thống. Vui lòng chờ Coordinator phê duyệt.</div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {/* Left: Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Họ và tên</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>{userInfo.fullName || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Email</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>{userInfo.email || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Số điện thoại</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>{userInfo.phone || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Đối tượng</div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>
                {userInfo.userType === 'INTERNAL' ? 'Sinh viên FPT (Nội bộ)' : 'Sinh viên trường khác (Bên ngoài)'}
              </div>
            </div>
            {userInfo.userType === 'INTERNAL' ? (
              <>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Mã sinh viên</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>{userInfo.studentCode || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Chapter (Cơ sở)</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>{chapterName}</div>
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Đơn vị / Trường học</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#1f2937' }}>{userInfo.institution || '—'}</div>
              </div>
            )}
          </div>

          {/* Right: Student Card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Thẻ sinh viên đã nộp</div>
            {cardUrl ? (
              <a href={cardUrl} onClick={handleViewCard} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 16, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <img
                  src={cardUrl}
                  alt="Thẻ sinh viên"
                  style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 200, objectFit: 'cover' }}
                />
              </a>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>Chưa có hình ảnh thẻ sinh viên</div>
            )}
          </div>
        </div>
      </div>
    );
  };



  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------
  if (checkingStatus) {
    return (
      <div style={{ ...pageStyle, minHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Spin size="large" />
        <span style={{ color: '#4b5563', fontSize: '14px', fontWeight: 500 }}>
          Đang tải thông tin hồ sơ...
        </span>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div style={pageStyle}>
        <div style={cardContainerStyle}>
          {/* Gradient top bar */}
          <div style={gradientBarStyle} />

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={titleStyle}>Hồ sơ cá nhân</h1>
            <p style={{ color: '#4b5563', fontSize: 14, margin: 0 }}>
              Thông tin tài khoản đã đăng ký thành công
            </p>
          </div>

          {renderCompletedProfile()}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardContainerStyle}>
        {/* Gradient top bar */}
        <div style={gradientBarStyle} />

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={titleStyle}>Hoàn thiện hồ sơ</h1>

          <p style={{ color: '#4b5563', fontSize: 14, margin: 0 }}>
            Bước cuối cùng trước khi tham gia Hackathon
          </p>
        </div>

        <Steps
          current={currentStep}
          size="small"
          style={{ marginBottom: 28 }}
          items={[
            { title: 'Thông tin', icon: <UserOutlined /> },
            { title: 'Thẻ SV', icon: <IdcardOutlined /> },
            { title: 'Chờ duyệt', icon: <ClockCircleOutlined /> },
          ]}
        />

        {currentStep === 0 && renderProfileStep()}
        {currentStep === 1 && renderCardStep()}
        {currentStep === 2 && renderWaitingStep()}

        {currentStep < 2 && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={handleLogout}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', fontSize: 12,
              }}
            >
              Đăng xuất
            </button>
          </div>
        )}
      </div>

      <style>{`
        .custom-ob-input { overflow: hidden !important; }
        .custom-ob-input input::placeholder { color: #9ca3af !important; }
        .custom-ob-input input, .custom-ob-input .ant-input-password {
          background-color: transparent !important; color: #111827 !important; border-radius: 16px !important;
        }
        .custom-ob-input:hover, .custom-ob-input:focus-within {
          border-color: #0072ff !important;
          box-shadow: 0 0 0 2px rgba(0,114,255,0.1) !important;
        }
        .custom-ob-select .ant-select-selector {
          background-color: #f9fafb !important; border: 1px solid #e5e7eb !important;
          color: #111827 !important; height: 48px !important; border-radius: 16px !important;
          align-items: center !important;
        }
        .custom-ob-select:hover .ant-select-selector,
        .custom-ob-select.ant-select-focused .ant-select-selector {
          border-color: #0072ff !important;
          box-shadow: 0 0 0 2px rgba(0,114,255,0.1) !important;
        }
        .ant-upload-select { border-radius: 12px !important; }
      `}</style>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-components & styles
// ---------------------------------------------------------------------------
const Label = ({ children }) => (
  <span style={{ color: '#4b5563', fontSize: 12, fontWeight: 600, letterSpacing: '0.5px' }}>
    {children}
  </span>
);

const pageStyle = {
  padding: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: "'Inter', sans-serif",
};

const cardContainerStyle = {
  width: '100%',
  maxWidth: 600,
  backgroundColor: '#ffffff',
  borderRadius: 24,
  padding: 40,
  boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
  border: '1px solid #e5e7eb',
  position: 'relative',
  overflow: 'hidden',
};

const gradientBarStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0,
  height: 4,
  background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
};

const titleStyle = {
  fontSize: 26,
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const iconStyle = { color: '#0072ff', marginRight: 8 };

const inputStyle = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  color: '#111827',
  height: 48,
  borderRadius: 16,
};

const primaryBtnStyle = {
  height: 48,
  borderRadius: 16,
  fontSize: 15,
  fontWeight: 'bold',
  border: 'none',
  background: 'linear-gradient(90deg, #0072ff, #00e5ff)',
  color: '#fff',
};

export default OnboardingPage;
