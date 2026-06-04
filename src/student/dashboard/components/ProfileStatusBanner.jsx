import { useNavigate } from 'react-router-dom';
import { Button, Progress, Typography, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Clock3, ShieldCheck } from 'lucide-react';

const { Text } = Typography;

const getProfileProgress = (user) => {
  const hasIdentity = Boolean(user?.fullName && (user?.studentCode || user?.institution));
  const hasContact = Boolean(user?.email || user?.phone);
  const hasStudentCard = Boolean(user?.studentCardUrl || user?.studentCardUploaded || user?.studentCardImagePath);
  return (hasIdentity ? 40 : 0) + (hasContact ? 25 : 0) + (hasStudentCard ? 35 : 0);
};

const ProfileStatusBanner = ({ user }) => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const progress = getProfileProgress(user);

  if (user?.status === 'APPROVED') {
    return null;
  }

  const isIncomplete = progress < 100;
  const config = isIncomplete
    ? {
        icon: AlertCircle,
        color: '#ff4d4f',
        title: 'Hồ sơ cần bổ sung',
        description: 'Cập nhật đủ thông tin cá nhân và minh chứng sinh viên để Coordinator có thể duyệt tài khoản.',
        action: 'Cập nhật hồ sơ',
      }
    : {
        icon: Clock3,
        color: '#faad14',
        title: 'Hồ sơ đang chờ duyệt',
        description: 'Thông tin của bạn đã được ghi nhận. Hãy theo dõi trạng thái trước khi tạo hoặc tham gia đội.',
        action: 'Xem hồ sơ',
      };

  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={config.title}
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 16,
          alignItems: 'center',
          borderRadius: 8,
          padding: '16px 18px',
          border: `1px solid ${config.color}33`,
          background: token.colorBgContainer,
          boxShadow: token.boxShadowTertiary,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 8,
            display: 'grid',
            placeItems: 'center',
            color: config.color,
            background: `${config.color}14`,
          }}
        >
          <Icon size={22} />
        </div>

        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block', fontSize: 16 }}>
            {config.title}
          </Text>
          <Text style={{ display: 'block', color: token.colorTextSecondary, marginTop: 3 }}>
            {config.description}
          </Text>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={config.color}
            trailColor={token.colorFillSecondary}
            style={{ marginTop: 8, maxWidth: 420 }}
          />
        </div>

        <Button
          type="primary"
          icon={<ShieldCheck size={16} />}
          onClick={() => navigate('/profile')}
          style={{
            borderRadius: 8,
            background: config.color,
            borderColor: config.color,
            fontWeight: 700,
          }}
        >
          {config.action} <ArrowRight size={15} />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileStatusBanner;
