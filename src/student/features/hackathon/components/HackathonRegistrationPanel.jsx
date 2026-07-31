/**
 * HackathonRegistrationPanel
 * Hiển thị danh sách hackathon đang mở để student đăng ký / hủy đăng ký.
 * Thiết kế chuẩn FPTU VIP Tournament Pass & Arena Modal theo màu Logo FPT:
 * 1. Trên Dashboard: Thanh Ribbon nhã nhặn với viền màu Cam FPT (#F37021).
 * 2. Khi click "Khám phá & Đăng ký": Mở ra Modal Trung tâm Giải đấu (Tournament Arena) với giao diện tối ưu TUYỆT ĐỐI cho cả Light Mode và Dark Mode (Cyber Slate / Royal Navy Glassmorphism).
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Empty, Input, Modal, Segmented, Space, Spin, Tag, Typography, message, theme, Grid } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  CheckCircleFilled,
  ExclamationCircleFilled,
  ThunderboltFilled,
  SearchOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Trophy, ArrowRight, CheckCircle2, Sparkles, Calendar, Clock, Users, ChevronDown, Filter, Layers } from 'lucide-react';

import { useStudentHackathonRegistration } from '../hooks/useStudentHackathonRegistration';
import { getStudentHackathonErrorMessage } from '../constants/studentHackathon.constants';
import {
  canStudentRegister,
  formatCountdownLabel,
  formatCountdownParts,
  getRegistrationOpenAt,
  isRegistrationNotYetOpen,
  isRegistrationWindowOpen,
} from '../../../../features/hackathons/utils/hackathonRegistrationRules';

const { Text, Title, Paragraph } = Typography;

/* OFFICIAL FPT LOGO COLORS */
const FPT = {
  blue: '#00529C',       // Chữ F - Cobalt/Royal Blue
  blueDark: '#003366',
  blueLight: '#1E73BE',
  orange: '#F37021',     // Chữ P - FPT Vibrant Orange
  orangeLight: '#FF8C42',
  green: '#46B749',      // Chữ T - FPT Leaf Green
  greenDark: '#2E8B57',
};

const SEASON_LABELS = {
  SPRING: 'Xuân', SUMMER: 'Hạ', FALL: 'Thu', AUTUMN: 'Thu', WINTER: 'Đông',
};

const BENEFITS = [
  '🏆 Giải thưởng tiền mặt & Giấy chứng nhận Đại học FPT',
  '🤝 Ghép đội thực chiến với sinh viên toàn trường',
  '🧑‍🏫 Mentor & Chuyên gia đồng hành hỗ trợ 1-1',
];

const formatDate = (value) => (value ? dayjs(value).format('DD/MM/YYYY') : '—');
const seasonLabel = (season, year) => {
  if (!season && !year) return null;
  return [SEASON_LABELS[season] || season, year].filter(Boolean).join(' ');
};

const HackathonRegistrationPanel = ({ hasTeam = false, onRegistrationChange }) => {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [isArenaOpen, setIsArenaOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [nowTick, setNowTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick((v) => v + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /* Detect Dark Mode accurately from Ant Design token */
  const isDark = useMemo(() => {
    return token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  }, [token.colorBgContainer]);

  const {
    hackathons,
    loading,
    actionLoading,
    registrationBlocked,
    register,
    unregister,
  } = useStudentHackathonRegistration();

  const handleRegister = async (hackathonId, hackathonName) => {
    Modal.confirm({
      title: 'Xác nhận đăng ký tham gia?',
      icon: <ThunderboltFilled style={{ color: FPT.orange }} />,
      content: (
        <>
          Bạn sẽ đăng ký tham gia <strong>{hackathonName}</strong> tại Đại học FPT. Mỗi người chỉ được đăng ký một
          giải tại một thời điểm và không thể đăng ký lại sau khi hủy.
        </>
      ),
      okText: 'Đăng ký ngay',
      cancelText: 'Hủy',
      okButtonProps: { style: { background: FPT.orange, borderColor: FPT.orange, fontWeight: 600 } },
      onOk: async () => {
        const result = await register(hackathonId);
        if (result.success) {
          message.success('Đăng ký tham gia hackathon thành công');
          onRegistrationChange?.();
          return;
        }
        message.error(getStudentHackathonErrorMessage(result.error));
      },
    });
  };

  const handleUnregister = async (hackathonId, hackathonName) => {
    Modal.confirm({
      title: 'Xác nhận hủy đăng ký?',
      icon: <ExclamationCircleFilled style={{ color: '#EF4444' }} />,
      content: (
        <>
          Bạn sẽ hủy đăng ký <strong>{hackathonName}</strong>. Mỗi người chỉ được hủy đăng ký một
          lần và không thể đăng ký lại giải này.
        </>
      ),
      okText: 'Hủy đăng ký',
      okButtonProps: { danger: true, style: { fontWeight: 600 } },
      cancelText: 'Đóng',
      onOk: async () => {
        const result = await unregister(hackathonId);
        if (result.success) {
          message.success('Đã hủy đăng ký hackathon');
          onRegistrationChange?.();
          return;
        }
        message.error(getStudentHackathonErrorMessage(result.error, 'Không thể hủy đăng ký'));
      },
    });
  };

  /* Filter & Count Logic aligned with BE data */
  const openCount = useMemo(() => {
    return hackathons.filter((item) => !item.registered && isRegistrationWindowOpen(item)).length;
  }, [hackathons]);

  const upcomingCount = useMemo(() => {
    return hackathons.filter((item) => isRegistrationNotYetOpen(item)).length;
  }, [hackathons]);

  const regCount = useMemo(() => {
    return hackathons.filter((item) => Boolean(item.registered)).length;
  }, [hackathons]);

  const urgentCount = useMemo(() => {
    return hackathons.filter((item) => {
      if (item.registered || !isRegistrationWindowOpen(item)) return false;
      const end = item.registrationEnd ? dayjs(item.registrationEnd) : null;
      const diff = end ? end.endOf('day').diff(dayjs(), 'day') : null;
      return diff !== null && diff >= 0 && diff <= 7;
    }).length;
  }, [hackathons]);

  const registeredHackathon = useMemo(
    () => hackathons.find((item) => Boolean(item.registered)) || null,
    [hackathons],
  );

  const soonestOpening = useMemo(() => {
    const upcoming = hackathons
      .filter((item) => isRegistrationNotYetOpen(item) && getRegistrationOpenAt(item))
      .sort((a, b) => getRegistrationOpenAt(a) - getRegistrationOpenAt(b));
    return upcoming[0] || null;
  }, [hackathons, nowTick]);

  const soonestOpenCountdown = useMemo(() => {
    if (!soonestOpening) return null;
    return formatCountdownParts(getRegistrationOpenAt(soonestOpening));
  }, [soonestOpening, nowTick]);

  const filteredHackathons = useMemo(() => {
    return hackathons.filter((item) => {
      if (searchText.trim()) {
        const query = searchText.toLowerCase();
        const matchName = item.name?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        if (!matchName && !matchDesc) return false;
      }

      const isRegistered = Boolean(item.registered);
      const regEnd = item.registrationEnd ? dayjs(item.registrationEnd) : null;
      const daysLeft = regEnd ? regEnd.endOf('day').diff(dayjs(), 'day') : null;
      const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

      if (filterTab === 'OPEN') return !isRegistered && isRegistrationWindowOpen(item);
      if (filterTab === 'UPCOMING') return isRegistrationNotYetOpen(item);
      if (filterTab === 'REGISTERED') return isRegistered;
      if (filterTab === 'URGENT') return isUrgent && !isRegistered && isRegistrationWindowOpen(item);

      return true;
    });
  }, [hackathons, searchText, filterTab]);

  if (loading) {
    return (
      <div
        style={{
          padding: '16px 24px',
          borderRadius: 20,
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Spin size="small" />
        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
          Đang kiểm tra giải đấu Hackathon FPTU...
        </Text>
        </div>
    );
  }

  if (!hackathons.length) return null;

  const ribbonSubtitle = registeredHackathon
    ? `${registeredHackathon.name}${seasonLabel(registeredHackathon.season, registeredHackathon.year) ? ` · 🏆 ${seasonLabel(registeredHackathon.season, registeredHackathon.year)}` : ''}`
    : [
        openCount > 0 ? `${openCount} đang mở đăng ký` : null,
        upcomingCount > 0 ? `${upcomingCount} sắp mở` : null,
      ]
        .filter(Boolean)
        .join(' · ') || `${hackathons.length} giải đấu`;

  return (
    <>
      {/* ─── SLEEK FPT BRANDED COMMAND RIBBON (ON DASHBOARD - HIGH CONTRAST IN DARK MODE) ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
        style={{
          borderRadius: 20,
          padding: '16px 24px',
          background: isDark ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)' : token.colorBgContainer,
          border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : token.colorBorderSecondary}`,
          borderLeft: `4px solid ${FPT.orange}`,
          boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.35)' : '0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(243, 112, 33, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Headline & Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              background: `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
              boxShadow: `0 4px 12px ${FPT.orange}35`,
              flexShrink: 0,
            }}
          >
            <Flame size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 15, color: token.colorTextHeading }}>
                Sự Kiện Đang Mở Đăng Ký
              </Text>
              <Tag
                color="orange"
                style={{
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 11,
                  border: isDark ? '1px solid rgba(243, 112, 33, 0.4)' : 0,
                  margin: 0,
                  background: isDark ? 'rgba(243, 112, 33, 0.15)' : undefined,
                }}
              >
                🔥 {hackathons.length} Giải đấu
              </Tag>
              {regCount > 0 && (
                <Tag
                  color="success"
                  style={{
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 11,
                    border: isDark ? '1px solid rgba(70, 183, 73, 0.4)' : 0,
                    margin: 0,
                    background: isDark ? 'rgba(70, 183, 73, 0.15)' : undefined,
                  }}
                >
                  ✔ Đã đăng ký
                </Tag>
              )}
            </div>
            <Text ellipsis style={{ display: 'block', fontSize: 13, color: token.colorTextSecondary, marginTop: 2 }}>
              {ribbonSubtitle}
            </Text>
          </div>
        </div>

        {/* Right: Actions — no quick-register; countdown when upcoming */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {soonestOpening && soonestOpenCountdown && !soonestOpenCountdown.ended && !registeredHackathon && (
            <Tag
              color="processing"
              icon={<ClockCircleOutlined />}
              style={{
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                margin: 0,
                padding: '4px 10px',
                border: isDark ? '1px solid rgba(96, 165, 250, 0.35)' : undefined,
              }}
            >
              {formatCountdownLabel(soonestOpenCountdown)}
              {hackathons.length > 1 ? ` · ${soonestOpening.name}` : ''}
            </Tag>
          )}
          <Button
            size="middle"
            onClick={() => setIsArenaOpen(true)}
            style={{
              borderRadius: 10,
              fontWeight: 700,
              borderColor: isDark ? '#60A5FA' : FPT.blue,
              color: isDark ? '#60A5FA' : FPT.blue,
              background: isDark ? 'rgba(96, 165, 250, 0.08)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            🏆 Khám phá & Đăng ký ({hackathons.length}) <ArrowRight size={14} />
          </Button>
        </div>
      </motion.div>

      {/* ─── VIP TOURNAMENT ARENA MODAL (100% ADAPTIVE TO DARK/LIGHT MODE) ─── */}
      <Modal
        open={isArenaOpen}
        onCancel={() => setIsArenaOpen(false)}
        footer={null}
        width={1120}
        centered
        title={null}
        styles={{
          body: { padding: '20px 24px 24px', overflow: 'hidden' }, // overflow hidden prevents modal window from scrolling!
          content: {
            borderRadius: 24,
            padding: 0,
            overflow: 'hidden',
            boxShadow: isDark 
              ? '0 32px 80px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 82, 156, 0.3)' 
              : '0 32px 80px rgba(0, 82, 156, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1)',
            background: isDark
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.95) 100%)'
              : 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '2px solid rgba(0, 82, 156, 0.08)',
          },
        }}
      >
        {/* 1. COMPACT ROUNDED FPT ROYAL BLUE BANNER */}
        <div
          style={{
            position: 'relative',
            padding: '20px 28px',
            borderRadius: 18,
            background: `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 60%, #002244 100%)`,
            color: '#fff',
            overflow: 'hidden',
            marginBottom: 16,
            boxShadow: '0 10px 24px rgba(0, 82, 156, 0.22)',
          }}
        >
          <div style={{ position: 'absolute', top: -40, right: '10%', width: 200, height: 200, background: `radial-gradient(circle, rgba(243, 112, 33, 0.35) 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -40, left: '5%', width: 160, height: 160, background: `radial-gradient(circle, rgba(70, 183, 73, 0.3) 0%, transparent 70%)`, pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
      style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `linear-gradient(135deg, ${FPT.orange}, ${FPT.orangeLight})`,
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  boxShadow: `0 6px 16px ${FPT.orange}50`,
                }}
              >
                <Trophy size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <Title level={3} style={{ margin: 0, color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>
                    FPT UNIVERSITY HACKATHON ARENA
                  </Title>
                  <Tag color="orange" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 11, border: 0 }}>
                    🔥 {hackathons.length} Giải Đấu Đang Mở
                  </Tag>
                </div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 13, marginTop: 2, display: 'block' }}>
                  Khám phá, lựa chọn và tham gia các giải đấu công nghệ danh giá tại Đại học FPT.
                </Text>
              </div>
            </div>
          </div>
        </div>

        {/* 2. COMPACT BUTTER-SMOOTH SEARCH & SLIDING GRADIENT PILL TABS TOOLBAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 16,
            padding: '12px 16px',
        borderRadius: 16,
            background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
            border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 82, 156, 0.1)'}`,
            boxShadow: isDark ? '0 4px 24px rgba(0, 0, 0, 0.3)' : '0 8px 24px rgba(0, 82, 156, 0.06)',
          }}
        >
          {/* Left: Search Bar */}
          <Input
            prefix={<SearchOutlined style={{ color: token.colorTextQuaternary }} />}
            placeholder="Tìm kiếm giải đấu theo tên hoặc mô tả..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: screens.md ? 320 : '100%',
              height: 40,
              borderRadius: 12,
              background: token.colorBgContainer,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : token.colorBorder}`,
              fontSize: 13,
              fontWeight: 500,
              color: token.colorTextHeading,
            }}
          />

          {/* Right: BUTTER-SMOOTH SLIDING GRADIENT PILL TABS */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
              padding: 5,
              borderRadius: 14,
              background: token.colorBgContainer,
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
              position: 'relative',
            }}
          >
            {[
              {
                id: 'ALL',
                label: 'Tất cả',
                count: hackathons.length,
                icon: <Layers size={14} />,
                gradient: isDark ? `linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)` : `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 100%)`,
                shadow: isDark ? `0 4px 14px rgba(59, 130, 246, 0.35)` : `0 4px 14px rgba(0, 82, 156, 0.35)`,
              },
              {
                id: 'OPEN',
                label: 'Đang mở',
                count: openCount,
                icon: <Sparkles size={14} />,
                gradient: isDark ? `linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)` : `linear-gradient(135deg, ${FPT.blue} 0%, ${FPT.blueLight} 100%)`,
                shadow: isDark ? `0 4px 14px rgba(56, 189, 248, 0.35)` : `0 4px 14px rgba(30, 115, 190, 0.35)`,
              },
              {
                id: 'UPCOMING',
                label: 'Sắp mở',
                count: upcomingCount,
                icon: <Clock size={14} />,
                gradient: isDark ? `linear-gradient(135deg, #6366F1 0%, #A5B4FC 100%)` : `linear-gradient(135deg, #4338CA 0%, #6366F1 100%)`,
                shadow: isDark ? `0 4px 14px rgba(165, 180, 252, 0.35)` : `0 4px 14px rgba(99, 102, 241, 0.35)`,
              },
              {
                id: 'REGISTERED',
                label: 'Đã đăng ký',
                count: regCount,
                icon: <CheckCircle2 size={14} />,
                gradient: isDark ? `linear-gradient(135deg, #059669 0%, #34D399 100%)` : `linear-gradient(135deg, ${FPT.greenDark} 0%, ${FPT.green} 100%)`,
                shadow: isDark ? `0 4px 14px rgba(52, 211, 153, 0.35)` : `0 4px 14px rgba(70, 183, 73, 0.35)`,
              },
              {
                id: 'URGENT',
                label: 'Sắp đóng',
                count: urgentCount,
                icon: <Flame size={14} />,
                gradient: isDark ? `linear-gradient(135deg, #EA580C 0%, #FB923C 100%)` : `linear-gradient(135deg, #D9534F 0%, ${FPT.orange} 100%)`,
                shadow: isDark ? `0 4px 14px rgba(251, 146, 60, 0.4)` : `0 4px 14px rgba(243, 112, 33, 0.4)`,
              },
            ].map((tab) => {
              const active = filterTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id)}
                  style={{
                    position: 'relative',
                    padding: '6px 14px',
                    borderRadius: 10,
                    border: 'none',
                    background: 'transparent',
                    color: active ? '#fff' : token.colorTextSecondary,
                    fontWeight: active ? 800 : 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    zIndex: 1,
                  }}
                >
                  {/* Butter-Smooth Sliding Background (Spring Physics) */}
                  {active && (
                    <motion.div
                      layoutId="activeFilterPill"
                      transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 10,
                        background: tab.gradient,
                        boxShadow: tab.shadow,
                        zIndex: -1,
                      }}
                    />
                  )}
                  <span style={{ display: 'flex', alignItems: 'center', color: active ? '#fff' : token.colorTextQuaternary, transition: 'color 0.2s' }}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                  <span
                    style={{
                      background: active ? 'rgba(255, 255, 255, 0.25)' : (isDark ? 'rgba(255, 255, 255, 0.08)' : token.colorFillQuaternary),
                      color: active ? '#fff' : token.colorTextHeading,
                      padding: '2px 8px',
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 800,
                      transition: 'all 0.2s',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. ROCK-SOLID LOCKED TRAY WITH SLEEK DARK/LIGHT SCROLLBAR */}
        <div
          style={{
            height: '40vh',
            overflowY: 'auto',
            padding: '18px',
            borderRadius: 18,
            background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#F1F5F9', // Slightly darker to make cards pop
            border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0,0,0,0.03)'}`,
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.02)',
            colorScheme: isDark ? 'dark' : 'light', // Ensures scrollbar renders sleek dark mac-style!
            scrollbarWidth: 'thin',
          }}
        >
          {filteredHackathons.length === 0 ? (
            <Empty
              description="Không tìm thấy giải đấu phù hợp với bộ lọc"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{ padding: '40px 0' }}
            />
          ) : (
            <motion.div
              layout
              transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
                gap: 18,
                alignContent: 'start',
              }}
            >
              <AnimatePresence mode="popLayout">
                {filteredHackathons.map((item) => (
                  <HackathonBoothCard
                    key={item.id}
                    item={item}
                    token={token}
                    isDark={isDark}
                    actionLoading={actionLoading}
                    registrationBlocked={registrationBlocked}
                    hasTeam={hasTeam}
                    nowTick={nowTick}
                    onRegister={() => handleRegister(item.id, item.name)}
                    onUnregister={() => handleUnregister(item.id, item.name)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </Modal>
    </>
  );
};

/* ── Individual Expandable Hackathon Booth Card (Cyber Slate Glass in Dark Mode) ── */
const HackathonBoothCard = ({
  item,
  token,
  isDark,
  actionLoading,
  registrationBlocked,
  hasTeam,
  nowTick = 0,
  onRegister,
  onUnregister,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

          const isRegistered = Boolean(item.registered);
          const isSlotFull = registrationBlocked[item.id];
          const isWithdrawn = Boolean(item.registrationWithdrawn);
          const isRegisteredElsewhere = Boolean(item.registeredElsewhere);
          const notYetOpen = isRegistrationNotYetOpen(item);
          const canRegister = canStudentRegister(item, { registrationBlocked });
          const openCountdown = useMemo(
            () => (notYetOpen ? formatCountdownParts(getRegistrationOpenAt(item)) : null),
            [item, notYetOpen, nowTick],
          );

  const regEnd = item.registrationEnd ? dayjs(item.registrationEnd) : null;
  const daysLeft = regEnd ? regEnd.endOf('day').diff(dayjs(), 'day') : null;
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && canRegister;
  const label = seasonLabel(item.season, item.year);

  /* Header Banner Styling adapted for Light vs Dark Mode */
  const headerStyle = useMemo(() => {
    if (isRegistered) {
      return {
        background: isDark
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.22) 0%, rgba(6, 95, 70, 0.35) 100%)'
          : `linear-gradient(135deg, ${FPT.greenDark} 0%, ${FPT.green} 100%)`,
        borderBottom: isDark ? '1px solid rgba(52, 211, 153, 0.3)' : 'none',
        textColor: '#fff',
        badgeBg: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(255, 255, 255, 0.22)',
      };
    }
    if (isUrgent) {
      return {
        background: isDark
          ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.25) 0%, rgba(154, 52, 18, 0.35) 100%)'
          : `linear-gradient(135deg, #A04000 0%, ${FPT.orange} 100%)`,
        borderBottom: isDark ? '1px solid rgba(251, 146, 60, 0.3)' : 'none',
        textColor: '#fff',
        badgeBg: isDark ? 'rgba(251, 146, 60, 0.2)' : 'rgba(255, 255, 255, 0.22)',
      };
    }
    return {
      background: isDark
        ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.22) 0%, rgba(30, 58, 138, 0.35) 100%)'
        : `linear-gradient(135deg, ${FPT.blueDark} 0%, ${FPT.blue} 100%)`,
      borderBottom: isDark ? '1px solid rgba(96, 165, 250, 0.3)' : 'none',
      textColor: '#fff',
      badgeBg: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(255, 255, 255, 0.22)',
    };
  }, [isRegistered, isUrgent, isDark]);

          return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
      style={{
        borderRadius: 18,
        background: isDark ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)' : '#FFFFFF',
        border: `2px solid ${isRegistered ? (isDark ? '#34D399' : FPT.green) : isUrgent ? (isDark ? '#FB923C' : FPT.orange) : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.15)')}`,
        boxShadow: isRegistered
          ? `0 12px 32px ${isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(70, 183, 73, 0.25)'}`
          : isUrgent
          ? `0 12px 32px ${isDark ? 'rgba(251, 146, 60, 0.25)' : 'rgba(243, 112, 33, 0.25)'}`
          : isDark ? '0 12px 32px rgba(0, 0, 0, 0.5)' : '0 12px 32px rgba(0, 82, 156, 0.08), 0 4px 12px rgba(0,0,0,0.03)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Card Top Banner Strip */}
      <div
        style={{
          padding: '14px 18px',
          background: headerStyle.background,
          borderBottom: headerStyle.borderBottom,
          color: headerStyle.textColor,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            {label && (
              <span style={{ background: headerStyle.badgeBg, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: '#fff' }}>
                🏆 {label.toUpperCase()}
              </span>
            )}
            <span style={{ background: headerStyle.badgeBg, padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, color: '#fff' }}>
              {item.status}
            </span>
          </div>
          <Title level={4} style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 17, lineHeight: 1.3 }}>
            {item.name}
          </Title>
        </div>

        <div>
          {isRegistered && (
            <Tag color="success" icon={<CheckCircleFilled />} style={{ borderRadius: 6, fontWeight: 700, padding: '2px 10px', fontSize: 11, border: 0, margin: 0 }}>
              Đã Đăng Ký
            </Tag>
          )}
          {isUrgent && canRegister && (
            <Tag color="volcano" style={{ borderRadius: 6, fontWeight: 700, padding: '2px 10px', fontSize: 11, border: 0, margin: 0 }}>
              ⚡ {daysLeft === 0 ? 'Hạn chót hôm nay!' : `Còn ${daysLeft} ngày`}
            </Tag>
          )}
        </div>
      </div>

      {/* Compact Action & Summary Bar (Always Visible) */}
      <div
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          background: 'transparent',
          borderBottom: isExpanded ? `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : token.colorBorderSecondary}` : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 13, color: token.colorTextSecondary }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={14} color={isDark ? '#FB923C' : FPT.orange} />
            <strong>Đăng ký:</strong> {formatDate(item.registrationStart)} → {formatDate(item.registrationEnd)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {notYetOpen && openCountdown && !openCountdown.ended && (
            <Tag
              color="processing"
              style={{ borderRadius: 6, fontWeight: 700, padding: '2px 10px', fontSize: 11, border: 0, margin: 0 }}
            >
              {formatCountdownLabel(openCountdown)}
            </Tag>
          )}
          {canRegister && (
            <Button
              type="primary"
              size="middle"
              loading={actionLoading}
              onClick={onRegister}
              style={{
                borderRadius: 10,
                fontWeight: 700,
                background: `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
                boxShadow: `0 4px 12px ${FPT.orange}35`,
                border: 0,
              }}
            >
              Đăng ký tham gia
            </Button>
          )}
          {isRegistered && !hasTeam && (
            <Button
              danger
              size="middle"
              loading={actionLoading}
              onClick={onUnregister}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              Hủy
            </Button>
          )}
          <Button
            type="text"
            size="middle"
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              borderRadius: 10,
              fontWeight: 700,
              color: isDark ? '#60A5FA' : FPT.blue,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isExpanded ? (isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(0, 82, 156, 0.1)') : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            <span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
              style={{ display: 'grid', placeItems: 'center' }}
            >
              <ChevronDown size={16} />
            </motion.span>
          </Button>
        </div>
      </div>

      {/* Expanded Details Section (Butter-Smooth Spring Accordion) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.04, 0.62, 0.23, 0.98] }}
            style={{ overflow: 'hidden', background: isDark ? 'rgba(0, 0, 0, 0.25)' : token.colorFillQuaternary }}
          >
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}
            >
              {/* Description */}
              {item.description && (
                <Paragraph type="secondary" style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: token.colorTextSecondary }}>
                  {item.description}
                </Paragraph>
              )}

              {/* 3-Column Specs Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: isDark ? 'rgba(30, 41, 59, 0.5)' : token.colorBgContainer,
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : token.colorBorderSecondary}`,
                }}
              >
                <div>
                  <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                    <Calendar size={13} color={isDark ? '#FB923C' : FPT.orange} /> Đăng Ký
                  </Text>
                  <Text strong style={{ fontSize: 12, color: token.colorTextHeading, display: 'block' }}>
                    {formatDate(item.registrationStart)} → {formatDate(item.registrationEnd)}
                  </Text>
                </div>

                <div>
                  <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                    <Clock size={13} color={isDark ? '#60A5FA' : FPT.blue} /> Thi Đấu
                  </Text>
                  <Text strong style={{ fontSize: 12, color: token.colorTextHeading, display: 'block' }}>
                    {formatDate(item.eventStart)} → {formatDate(item.eventEnd)}
                  </Text>
                </div>

                <div>
                  <Text type="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>
                    <Users size={13} color={isDark ? '#34D399' : FPT.green} /> Giới Hạn
                  </Text>
                  <Text strong style={{ fontSize: 12, color: token.colorTextHeading, display: 'block' }}>
                    {item.maxParticipants ? `Tối đa ${item.maxParticipants} SV` : 'Không giới hạn'}
                  </Text>
                </div>
              </div>

              {/* Benefits Section */}
                {canRegister && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Text strong style={{ fontSize: 13, color: token.colorTextHeading }}>
                    🎁 Quyền lợi & Đặc quyền sinh viên FPTU:
                  </Text>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {BENEFITS.map((benefit) => (
                      <div key={benefit} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: token.colorTextSecondary }}>
                        <CheckCircle2 size={15} color={isDark ? '#FB923C' : FPT.orange} style={{ flexShrink: 0 }} />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Messages */}
              {isSlotFull && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <Text type="danger" style={{ fontSize: 12, fontWeight: 600 }}>
                    ⛔ Giải đấu đã đạt giới hạn tối đa số lượng sinh viên tham gia.
                  </Text>
                </div>
              )}
              {isWithdrawn && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255, 255, 255, 0.04)' : token.colorBgContainer }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ℹ️ Bạn đã hủy đăng ký giải này và không thể đăng ký lại.
                  </Text>
                </div>
              )}
              {isRegisteredElsewhere && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: isDark ? 'rgba(255, 255, 255, 0.04)' : token.colorBgContainer }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ℹ️ Bạn đang tham gia một giải khác. Mỗi sinh viên chỉ được đăng ký một giải tại một thời điểm.
                  </Text>
            </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default HackathonRegistrationPanel;
