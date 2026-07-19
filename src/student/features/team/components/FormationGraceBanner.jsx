/**
 * Banner khẩn cấp 24h grace — hiển thị cho CẢ leader + member ở đầu trang đội.
 * Countdown động + màu leo thang theo thời gian còn lại.
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Space, Typography } from 'antd';
import { AlertOutlined, ClockCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { message } from 'antd';

const { Text, Title } = Typography;

const formatRemain = (ms) => {
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const urgencyTheme = (remainMs) => {
  const hours = remainMs / 3_600_000;
  if (hours < 6) {
    return {
      level: 'critical',
      background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 45%, #dc2626 100%)',
      border: '2px solid #fca5a5',
      glow: '0 0 24px rgba(239, 68, 68, 0.55)',
      accent: '#FEE2E2',
      pulse: true,
    };
  }
  if (hours < 12) {
    return {
      level: 'urgent',
      background: 'linear-gradient(135deg, #9a3412 0%, #c2410c 50%, #ea580c 100%)',
      border: '2px solid #fdba74',
      glow: '0 0 18px rgba(234, 88, 12, 0.45)',
      accent: '#FFEDD5',
      pulse: true,
    };
  }
  return {
    level: 'warn',
    background: 'linear-gradient(135deg, #92400e 0%, #b45309 45%, #d97706 100%)',
    border: '2px solid #fcd34d',
    glow: '0 8px 24px rgba(217, 119, 6, 0.35)',
    accent: '#FEF3C7',
    pulse: false,
  };
};

const FormationGraceBanner = ({
  team,
  onConfirmFormation,
  actionLoading = false,
  onExpired,
}) => {
  const deadline = team?.formationGraceDeadlineAt;
  const [nowTs, setNowTs] = useState(() => Date.now());

  useEffect(() => {
    if (!team?.isInFormationGracePeriod || !deadline) return undefined;
    const id = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [team?.isInFormationGracePeriod, deadline]);

  const remainMs = useMemo(() => {
    if (!deadline) return 0;
    return dayjs(deadline).valueOf() - nowTs;
  }, [deadline, nowTs]);

  useEffect(() => {
    if (remainMs <= 0 && team?.isInFormationGracePeriod) {
      onExpired?.();
    }
  }, [remainMs, team?.isInFormationGracePeriod, onExpired]);

  if (!team?.isInFormationGracePeriod) return null;

  const expired = remainMs <= 0;
  const theme = urgencyTheme(Math.max(remainMs, 1));
  const countdown = formatRemain(remainMs);
  const isLeader = Boolean(team.isCurrentUserLeader);
  const canConfirm = Boolean(team.canConfirmFormation);
  const leaderName = team.leaderName || team.leader?.fullName || 'trưởng nhóm';
  const deadlineLabel = deadline ? dayjs(deadline).format('DD/MM/YYYY HH:mm') : '—';

  const copyReminder = async () => {
    const text =
      `Nhắc: Hackathon đã kết thúc đăng ký sớm. Đội ${team.teamName || ''} cần xác nhận thành lập trước ${deadlineLabel}, nếu không cả đội sẽ bị loại.`;
    try {
      await navigator.clipboard.writeText(text);
      message.success('Đã copy nội dung nhắc trưởng nhóm');
    } catch {
      message.info(text);
    }
  };

  return (
    <motion.div
      data-testid="formation-grace-banner"
      initial={{ opacity: 0, y: -8 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: theme.pulse && !expired ? [1, 1.01, 1] : 1,
      }}
      transition={
        theme.pulse && !expired
          ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
          : { duration: 0.35 }
      }
      style={{
        borderRadius: 16,
        padding: '18px 20px',
        background: theme.background,
        border: theme.border,
        boxShadow: theme.glow,
        color: '#fff',
      }}
    >
      <Space align="start" size={16} style={{ width: '100%', justifyContent: 'space-between' }} wrap>
        <Space align="start" size={14}>
          <AlertOutlined style={{ fontSize: 28, color: theme.accent, marginTop: 2 }} />
          <div>
            <Title level={4} style={{ margin: 0, color: theme.accent, fontWeight: 800 }}>
              Thời gian suy nghĩ 24 giờ — cần xác nhận gấp
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.95)', display: 'block', marginTop: 6 }}>
              Hackathon đã <strong>kết thúc đăng ký sớm</strong>. Hạn chốt xác nhận:{' '}
              <strong>{deadlineLabel}</strong>.
            </Text>
            <Text style={{ color: '#fff', display: 'block', marginTop: 6, fontWeight: 700 }}>
              Nếu không xác nhận trước hạn, <u>cả đội tự động bị loại và mất suất thi</u>.
            </Text>
            {expired ? (
              <Text style={{ color: theme.accent, display: 'block', marginTop: 10, fontWeight: 700 }}>
                Đã quá hạn — đang chờ hệ thống xử lý. Vui lòng làm mới trang.
              </Text>
            ) : (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <ClockCircleOutlined style={{ fontSize: 20, color: theme.accent }} />
                <Text
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    letterSpacing: 1,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  Còn {countdown}
                </Text>
              </div>
            )}
          </div>
        </Space>

        <Space direction="vertical" size={8} style={{ minWidth: 200 }}>
          {isLeader && canConfirm && !expired ? (
            <Button
              type="primary"
              size="large"
              loading={actionLoading}
              onClick={() => onConfirmFormation?.(team.id)}
              style={{
                background: '#fff',
                color: '#9a3412',
                fontWeight: 800,
                border: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}
            >
              Xác nhận thành lập đội ngay
            </Button>
          ) : null}
          {!isLeader && !expired ? (
            <>
              <Text style={{ color: theme.accent, fontWeight: 700 }}>
                Liên hệ trưởng nhóm <strong>{leaderName}</strong> xác nhận trước hạn.
              </Text>
              <Button
                icon={<CopyOutlined />}
                onClick={copyReminder}
                style={{ fontWeight: 700 }}
              >
                Nhắc trưởng nhóm (copy)
              </Button>
            </>
          ) : null}
          {isLeader && !canConfirm && !expired ? (
            <Text style={{ color: theme.accent }}>
              Hoàn tất roster (đủ thành viên, hết lời mời chờ) rồi mới xác nhận được.
            </Text>
          ) : null}
        </Space>
      </Space>
    </motion.div>
  );
};

export default FormationGraceBanner;
