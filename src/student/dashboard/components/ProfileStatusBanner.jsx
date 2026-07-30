import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Progress, Typography, theme } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Clock3, ShieldCheck, Shirt } from 'lucide-react';
import { kitService } from '../../../features/kits/services/kitService';
import { ROUTES } from '../../../shared/constants/routes';

const { Text } = Typography;

/* OFFICIAL FPT */
const FPT_BLUE = '#00529C';

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
  const [missingShirtSize, setMissingShirtSize] = useState(false);

  useEffect(() => {
    if (user?.status !== 'APPROVED') {
      setMissingShirtSize(false);
      return;
    }
    let cancelled = false;
    kitService.listMyShirtSizes()
      .then((sizes) => {
        if (cancelled) return;
        const regs = sizes || [];
        if (!regs.length) {
          setMissingShirtSize(false);
          return;
        }
        setMissingShirtSize(regs.some((r) => !r.preferredShirtSize));
      })
      .catch(() => {
        if (!cancelled) setMissingShirtSize(false);
      });
    return () => { cancelled = true; };
  }, [user?.status, user?.id]);

  if (user?.status === 'APPROVED') {
    if (!missingShirtSize) return null;
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="shirt-nudge"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr auto',
            gap: 18,
            alignItems: 'center',
            borderRadius: 20,
            padding: '14px 20px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: '#d97706',
            }}
          >
            <Shirt size={20} />
          </div>
          <div>
            <Text strong style={{ display: 'block', fontSize: 14 }}>Chưa khai size áo kit</Text>
            <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
              Cập nhật size áo trong hồ sơ để quầy phát kit nhanh hơn vào ngày khai mạc.
            </Text>
          </div>
          <Button type="default" onClick={() => navigate(ROUTES.PROFILE)}>
            Cập nhật size <ArrowRight size={14} />
          </Button>
        </motion.div>
      </AnimatePresence>
    );
  }

  const isIncomplete = progress < 100;
  const config = isIncomplete
    ? {
        icon: AlertCircle,
        color: '#EF4444',
        bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.02) 100%)',
        border: 'rgba(239, 68, 68, 0.25)',
        title: 'Hồ sơ cần bổ sung thông tin FPTU',
        description: 'Cập nhật đủ thông tin cá nhân và minh chứng sinh viên Đại học FPT để Ban tổ chức có thể duyệt tài khoản của bạn.',
        action: 'Cập nhật hồ sơ',
      }
    : {
        icon: Clock3,
        color: FPT_BLUE,
        bg: 'linear-gradient(135deg, rgba(0, 82, 156, 0.06) 0%, rgba(0, 82, 156, 0.02) 100%)',
        border: 'rgba(0, 82, 156, 0.25)',
        title: 'Hồ sơ đang chờ xét duyệt',
        description: 'Thông tin của bạn đã được ghi nhận. Ban tổ chức FPTU sẽ kiểm tra và phê duyệt trong thời gian sớm nhất.',
        action: 'Xem hồ sơ',
      };

  const Icon = config.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={config.title}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 18,
          alignItems: 'center',
          borderRadius: 20,
          padding: '16px 24px',
          border: `2px solid ${config.border}`,
          background: config.bg,
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 82, 156, 0.05)',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            background: config.color,
            boxShadow: `0 4px 12px ${config.color}35`,
          }}
        >
          <Icon size={22} />
        </div>

        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block', fontSize: 15, fontWeight: 700, color: token.colorTextHeading }}>
            {config.title}
          </Text>
          <Text style={{ display: 'block', color: token.colorTextSecondary, marginTop: 2, fontSize: 13 }}>
            {config.description}
          </Text>
          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={config.color}
            trailColor={token.colorFillSecondary}
            size="small"
            style={{ marginTop: 8, maxWidth: 360 }}
          />
          <Text style={{ display: 'block', fontSize: 11, color: config.color, fontWeight: 600, marginTop: 2 }}>
            {progress}% hoàn tất thông tin
          </Text>
        </div>

        <Button
          type="primary"
          icon={<ShieldCheck size={16} />}
          onClick={() => navigate('/profile')}
          style={{
            borderRadius: 10,
            background: config.color,
            borderColor: config.color,
            fontWeight: 700,
            height: 40,
            padding: '0 18px',
            boxShadow: `0 4px 12px ${config.color}30`,
          }}
        >
          {config.action} <ArrowRight size={14} />
        </Button>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProfileStatusBanner;
