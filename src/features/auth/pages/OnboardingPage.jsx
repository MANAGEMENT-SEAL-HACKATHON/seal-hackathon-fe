import { useState, useEffect } from 'react';
import {
  Form, Input, Select, Button, Upload, message, Steps, Result, Spin, Tag, Modal
} from 'antd';
import {
  UserOutlined, IdcardOutlined, BankOutlined, PhoneOutlined,
  UploadOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';
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
const OnboardingPage = () => {
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

  // Sync state on load using real API response to avoid local storage inconsistencies
  useEffect(() => {
    let active = true;
    const fetchFreshStatus = async () => {
      try {
        const freshUser = await userService.getMe();
        if (!active) return;
        
        // Sync local storage userInfo with fresh info
        const stored = getUserInfo() || {};
        
        // Detect transition to APPROVED
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

        // Populate form with existing data
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
          // Determine step using fresh database fields
          const hasCompletedProfile = Boolean(freshUser.fullName && (freshUser.studentCode || freshUser.institution));
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
  }, [navigate]);

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
        {fileList.length > 0 ? (
          <Button
            type="primary"
            style={{ flex: 2, ...primaryBtnStyle }}
            onClick={handleCardUpload}
            loading={cardLoading}
          >
            Tải lên & nộp hồ sơ
          </Button>
        ) : (
          <Button
            type="primary"
            style={{ flex: 2, ...primaryBtnStyle }}
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
          Về Trang chủ
        </Button>,
        <Button key="edit" onClick={() => setCurrentStep(0)} style={{ borderRadius: 12 }}>
          Chỉnh sửa hồ sơ
        </Button>,
      ]}
    />
  );

  const renderApprovedStep = () => (
    <div style={{ textAlign: 'left', marginTop: 16 }}>
      <Result
        status="success"
        icon={<CheckCircleOutlined style={{ color: '#13c2c2', fontSize: 48 }} />}
        title="Hồ sơ hợp lệ & Đã duyệt"
        subTitle="Hồ sơ của bạn đã được kiểm duyệt. Các thông tin hiện tại không thể chỉnh sửa để đảm bảo tính minh bạch."
        style={{ padding: '0 0 24px 0' }}
      />
      <div style={{ background: '#f9fafb', padding: 20, borderRadius: 16, border: '1px solid #e5e7eb' }}>
        <p style={{ margin: '0 0 8px', color: '#4b5563' }}><strong>Họ và tên:</strong> {userInfo.fullName}</p>
        <p style={{ margin: '0 0 8px', color: '#4b5563' }}><strong>Email:</strong> {userInfo.email}</p>
        {userInfo.phone && (
          <p style={{ margin: '0 0 8px', color: '#4b5563' }}><strong>Số điện thoại:</strong> {userInfo.phone}</p>
        )}
        <p style={{ margin: '0 0 8px', color: '#4b5563' }}>
          <strong>Tổ chức:</strong> {userInfo.userType === 'INTERNAL' ? 'Sinh viên FPT' : (userInfo.institution || 'Sinh viên trường')}
        </p>
        {userInfo.studentCode && (
          <p style={{ margin: '0 0 8px', color: '#4b5563' }}><strong>Mã sinh viên:</strong> {userInfo.studentCode}</p>
        )}
        
        <div style={{ marginTop: 16 }}>
          <strong style={{ color: '#4b5563', display: 'block', marginBottom: 8 }}>Thẻ sinh viên:</strong>
          {(userInfo.studentCardUrl || userInfo.studentCardImagePath) ? (
            <img 
              src={userInfo.studentCardUrl || userInfo.studentCardImagePath} 
              alt="Thẻ sinh viên" 
              style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #d9d9d9', objectFit: 'contain' }} 
            />
          ) : (
            <span style={{ color: '#9ca3af' }}>Đã tải lên</span>
          )}
        </div>
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button type="primary" onClick={() => navigate(ROUTES.DASHBOARD)} style={{ borderRadius: 12, backgroundColor: '#13c2c2', borderColor: '#13c2c2', height: 44, padding: '0 24px' }}>
          Vào trang chủ thi đấu
        </Button>
      </div>
    </div>
  );

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
          current={currentStep > 2 ? 2 : currentStep}
          size="small"
          style={{ marginBottom: 28 }}
          items={[
            { title: 'Thông tin', icon: <UserOutlined /> },
            { title: 'Thẻ SV', icon: <IdcardOutlined /> },
            { title: 'Trạng thái', icon: currentStep > 2 ? <CheckCircleOutlined /> : <ClockCircleOutlined /> },
          ]}
        />

        {currentStep === 0 && renderProfileStep()}
        {currentStep === 1 && renderCardStep()}
        {currentStep === 2 && renderWaitingStep()}
        {currentStep === 3 && renderApprovedStep()}

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
