import { Button, Grid, theme } from 'antd';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Code2,
  Gauge,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  UsersRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../app/AppContext';
import { absoluteApiUrl, showcaseService } from '../../features/showcase/services/showcase.service';
import { ROUTES } from '../../shared/constants/routes';

const { useBreakpoint } = Grid;

const HERO_IMAGE =
  'https://daihoc.fpt.edu.vn/wp-content/uploads/2022/08/dai-hoc-fpt-tp-hcm-1.jpeg';

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

const highlights = [
  { value: '01', label: 'Thông tin sự kiện' },
  { value: '02', label: 'Tài khoản & vai trò' },
  { value: '03', label: 'Quản trị cuộc thi' },
];

const featureCards = [
  {
    icon: UsersRound,
    title: 'Cổng tham gia',
    text: 'Giúp người tham gia nắm thông tin sự kiện, đăng ký tài khoản và theo dõi hoạt động liên quan.',
  },
  {
    icon: ClipboardCheck,
    title: 'Không gian quản trị',
    text: 'Hỗ trợ ban tổ chức cấu hình, kiểm duyệt và vận hành các phần quan trọng của cuộc thi.',
  },
  {
    icon: Trophy,
    title: 'Theo dõi kết quả',
    text: 'Tập trung dữ liệu thi đấu, đánh giá và kết quả để hệ thống dễ tra cứu, minh bạch hơn.',
  },
];

const journeyItems = [
  'Sự kiện',
  'Người tham gia',
  'Đội thi',
  'Vòng thi',
  'Kết quả',
];

const systemPillars = [
  { icon: CalendarCheck, label: 'Timeline rõ ràng' },
  { icon: ShieldCheck, label: 'Rule được kiểm soát' },
  { icon: Gauge, label: 'Dashboard theo vai trò' },
  { icon: Code2, label: 'Luồng thi tập trung' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const { darkMode, toggleDarkMode } = useAppContext();
  const isMobile = !screens.md;
  const isTablet = !screens.lg;
  const [teaserArticles, setTeaserArticles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    showcaseService
      .listPublishedArticles()
      .then((list) => {
        if (!cancelled) setTeaserArticles((Array.isArray(list) ? list : []).slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setTeaserArticles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const colors = {
    primary: token.colorPrimary,
    accent: '#00e5ff',
    bg: token.colorBgLayout,
    surface: token.colorBgContainer,
    border: token.colorBorderSecondary,
    text: token.colorText,
    muted: token.colorTextSecondary,
    heroText: '#ffffff',
    heroMuted: 'rgba(255,255,255,0.76)',
    shadow: darkMode ? '0 28px 90px rgba(0,0,0,0.46)' : '0 28px 90px rgba(22,119,255,0.18)',
  };

  const styles = {
    page: {
      minHeight: '100vh',
      overflow: 'hidden',
      background: darkMode
        ? 'radial-gradient(circle at 18% 0%, rgba(22,119,255,0.2), transparent 34%), #141414'
        : 'radial-gradient(circle at 18% 0%, rgba(22,119,255,0.12), transparent 34%), #f5f7fb',
      color: colors.text,
    },
    nav: {
      position: 'fixed',
      zIndex: 20,
      top: 18,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'min(1180px, calc(100% - 32px))',
      height: isMobile ? 62 : 72,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: isMobile ? '0 12px' : '0 18px',
      borderRadius: 18,
      border: `1px solid ${darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.58)'}`,
      background: darkMode ? 'rgba(20,20,20,0.78)' : 'rgba(255,255,255,0.74)',
      backdropFilter: 'blur(22px)',
      WebkitBackdropFilter: 'blur(22px)',
      boxShadow: darkMode ? '0 18px 46px rgba(0,0,0,0.3)' : '0 18px 46px rgba(22,119,255,0.14)',
    },
    brand: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      minWidth: 0,
      border: 0,
      padding: 0,
      background: 'transparent',
      color: colors.text,
    },
    logo: {
      width: 38,
      height: 38,
      borderRadius: 10,
      objectFit: 'cover',
      boxShadow: `0 10px 24px ${darkMode ? 'rgba(0,0,0,0.36)' : 'rgba(22,119,255,0.22)'}`,
    },
    brandText: {
      display: isMobile ? 'none' : 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      lineHeight: 1.05,
    },
    links: {
      display: isTablet ? 'none' : 'flex',
      alignItems: 'center',
      gap: 26,
      fontSize: 14,
      fontWeight: 650,
    },
    navLink: {
      color: colors.muted,
      textDecoration: 'none',
    },
    navActions: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },
    hero: {
      position: 'relative',
      minHeight: isMobile ? 900 : 800,
      padding: isMobile ? '112px 18px 64px' : '150px 42px 86px',
      display: 'grid',
      gridTemplateColumns: isTablet ? '1fr' : 'minmax(0, 1.04fr) minmax(360px, 0.74fr)',
      alignItems: 'center',
      gap: isMobile ? 32 : 48,
      backgroundImage: `url(${HERO_IMAGE})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    },
    heroShade: {
      position: 'absolute',
      inset: 0,
      background: darkMode
        ? 'linear-gradient(115deg, rgba(5,12,24,0.95) 0%, rgba(5,16,32,0.86) 44%, rgba(22,119,255,0.34) 100%)'
        : 'linear-gradient(115deg, rgba(4,18,38,0.9) 0%, rgba(8,42,82,0.74) 48%, rgba(22,119,255,0.22) 100%)',
    },
    gridOverlay: {
      position: 'absolute',
      inset: 0,
      opacity: darkMode ? 0.34 : 0.28,
      backgroundImage:
        'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
      backgroundSize: '44px 44px',
      maskImage: 'linear-gradient(to bottom, transparent, black 14%, black 78%, transparent)',
    },
    glowOne: {
      position: 'absolute',
      width: isMobile ? 260 : 430,
      height: isMobile ? 260 : 430,
      right: isMobile ? -140 : '7%',
      top: isMobile ? 180 : 120,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(0,229,255,0.42), transparent 66%)',
      filter: 'blur(4px)',
    },
    glowTwo: {
      position: 'absolute',
      width: isMobile ? 220 : 360,
      height: isMobile ? 220 : 360,
      left: isMobile ? -120 : '18%',
      bottom: 16,
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(22,119,255,0.46), transparent 68%)',
      filter: 'blur(8px)',
    },
    heroContent: {
      position: 'relative',
      zIndex: 2,
      maxWidth: 800,
      color: colors.heroText,
    },
    eyebrow: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 9,
      padding: '9px 13px',
      marginBottom: 24,
      borderRadius: 999,
      background: 'rgba(255,255,255,0.11)',
      border: '1px solid rgba(255,255,255,0.22)',
      color: 'rgba(255,255,255,0.9)',
      fontSize: 13,
      fontWeight: 700,
      backdropFilter: 'blur(18px)',
    },
    h1: {
      margin: 0,
      maxWidth: 860,
      fontSize: isMobile ? 44 : isTablet ? 62 : 82,
      lineHeight: 0.94,
      letterSpacing: 0,
      fontWeight: 850,
      color: colors.heroText,
      textWrap: 'balance',
    },
    heroLead: {
      maxWidth: 680,
      margin: '24px 0 0',
      color: colors.heroMuted,
      fontSize: isMobile ? 16 : 18,
      lineHeight: 1.72,
    },
    cta: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 34,
    },
    primaryBtn: {
      height: 48,
      borderRadius: 14,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontWeight: 750,
      boxShadow: '0 16px 34px rgba(22,119,255,0.34)',
    },
    glassBtn: {
      height: 48,
      borderRadius: 14,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      color: '#fff',
      fontWeight: 750,
      borderColor: 'rgba(255,255,255,0.3)',
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(14px)',
    },
    stats: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
      gap: 10,
      maxWidth: 650,
      marginTop: 34,
    },
    statItem: {
      padding: '16px 18px',
      borderRadius: 18,
      border: '1px solid rgba(255,255,255,0.16)',
      background: 'rgba(255,255,255,0.09)',
      backdropFilter: 'blur(18px)',
    },
    statValue: {
      display: 'block',
      color: '#fff',
      fontSize: 28,
      lineHeight: 1,
      fontWeight: 850,
    },
    statLabel: {
      display: 'block',
      marginTop: 8,
      color: colors.heroMuted,
      fontSize: 13,
    },
    console: {
      position: 'relative',
      zIndex: 2,
      justifySelf: isTablet ? 'start' : 'end',
      width: 'min(100%, 430px)',
      borderRadius: 24,
      overflow: 'hidden',
      background: darkMode ? 'rgba(16,24,38,0.76)' : 'rgba(255,255,255,0.16)',
      border: '1px solid rgba(255,255,255,0.22)',
      boxShadow: '0 28px 90px rgba(0,0,0,0.28)',
      backdropFilter: 'blur(24px)',
    },
    consoleTop: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '16px 18px',
      borderBottom: '1px solid rgba(255,255,255,0.14)',
      color: 'rgba(255,255,255,0.78)',
      fontSize: 12,
      fontWeight: 750,
      textTransform: 'uppercase',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: '50%',
    },
    consoleBody: {
      padding: 18,
      display: 'grid',
      gap: 12,
    },
    consoleLine: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '14px 15px',
      borderRadius: 16,
      color: 'rgba(255,255,255,0.82)',
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.1)',
      fontWeight: 650,
    },
    section: {
      width: 'min(1180px, calc(100% - 36px))',
      margin: '0 auto',
      padding: isMobile ? '66px 0' : '92px 0',
    },
    split: {
      display: 'grid',
      gridTemplateColumns: isTablet ? '1fr' : '0.8fr 1.2fr',
      gap: isMobile ? 28 : 42,
      alignItems: 'start',
    },
    kicker: {
      display: 'inline-flex',
      marginBottom: 14,
      color: colors.primary,
      fontSize: 13,
      fontWeight: 850,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
    },
    h2: {
      margin: 0,
      color: colors.text,
      fontSize: isMobile ? 34 : 48,
      lineHeight: 1.05,
      letterSpacing: 0,
      fontWeight: 850,
      textWrap: 'balance',
    },
    sectionText: {
      margin: '18px 0 0',
      color: colors.muted,
      fontSize: 16,
      lineHeight: 1.7,
    },
    featureGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
      gap: 16,
    },
    featureCard: {
      minHeight: 250,
      padding: 24,
      borderRadius: 22,
      background: colors.surface,
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
      position: 'relative',
      overflow: 'hidden',
    },
    iconWrap: {
      width: 48,
      height: 48,
      marginBottom: 28,
      borderRadius: 15,
      display: 'grid',
      placeItems: 'center',
      color: colors.primary,
      background: darkMode ? 'rgba(22,119,255,0.16)' : '#e6f4ff',
    },
    cardTitle: {
      margin: 0,
      color: colors.text,
      fontSize: 20,
      fontWeight: 800,
    },
    cardText: {
      margin: '12px 0 0',
      color: colors.muted,
      lineHeight: 1.68,
    },
    pillarGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, minmax(0, 1fr))',
      gap: 12,
      marginTop: 26,
    },
    pillar: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 18,
      background: darkMode ? 'rgba(255,255,255,0.04)' : '#ffffff',
      border: `1px solid ${colors.border}`,
      boxShadow: darkMode ? 'none' : '0 16px 36px rgba(22,119,255,0.08)',
      color: colors.text,
      fontWeight: 750,
    },
    journeyHeader: {
      maxWidth: 830,
      marginBottom: 28,
    },
    rail: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : `repeat(${journeyItems.length}, minmax(120px, 1fr))`,
      gap: 10,
      padding: 12,
      borderRadius: 28,
      background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.74)',
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
    },
    railItem: {
      minHeight: isMobile ? 82 : 138,
      padding: 16,
      borderRadius: 20,
      background: darkMode
        ? 'linear-gradient(180deg, rgba(22,119,255,0.14), rgba(255,255,255,0.04))'
        : 'linear-gradient(180deg, #ffffff, #f3f8ff)',
      border: `1px solid ${colors.border}`,
    },
    railNumber: {
      display: 'inline-flex',
      marginBottom: 20,
      color: colors.primary,
      fontSize: 12,
      fontWeight: 850,
    },
    railText: {
      margin: 0,
      color: colors.text,
      fontWeight: 750,
      lineHeight: 1.35,
    },
    final: {
      width: 'min(1180px, calc(100% - 36px))',
      margin: isMobile ? '0 auto 46px' : '0 auto 72px',
      padding: isMobile ? 26 : 36,
      borderRadius: 28,
      display: 'grid',
      gridTemplateColumns: isTablet ? '1fr' : '1fr auto',
      gap: 24,
      alignItems: 'center',
      background: darkMode
        ? 'linear-gradient(135deg, rgba(22,119,255,0.2), rgba(0,229,255,0.08)), #1f1f1f'
        : 'linear-gradient(135deg, #e6f4ff, rgba(0,229,255,0.18)), #ffffff',
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
    },
    finalActions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      justifyContent: isTablet ? 'flex-start' : 'flex-end',
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.nav}>
        <div style={styles.brand}>
          <img src="/logo.jpg" alt="SEAL Hackathon" style={styles.logo} />
          <span style={styles.brandText}>
            <strong style={{ fontSize: 16 }}>SEAL</strong>
            <small style={{ color: colors.muted, fontWeight: 700 }}>Hackathon System</small>
          </span>
        </div>

        <nav style={styles.links} aria-label="Landing navigation">
          <a style={styles.navLink} href="#overview">Tổng quan</a>
          <a style={styles.navLink} href="#platform">Nền tảng</a>
          <a style={styles.navLink} href="#journey">Hệ thống</a>
          <button
            type="button"
            style={{ ...styles.navLink, border: 0, background: 'transparent', cursor: 'pointer', padding: 0 }}
            onClick={() => navigate(ROUTES.PUBLIC_HALL_OF_FAME)}
          >
            Vinh danh
          </button>
        </nav>

        <div style={styles.navActions}>
          <Button
            type="text"
            icon={darkMode ? <Sun size={18} /> : <Moon size={18} />}
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          />
          <Button onClick={() => navigate(ROUTES.LOGIN)}>Đăng nhập</Button>
          <Button type="primary" onClick={() => navigate(ROUTES.REGISTER)}>Đăng ký</Button>
        </div>
      </header>

      <main>
        <section style={styles.hero}>
          <div style={styles.heroShade} />
          <div style={styles.gridOverlay} />
          <motion.div
            style={styles.glowOne}
            animate={{ scale: [1, 1.12, 1], opacity: [0.74, 1, 0.74] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            style={styles.glowTwo}
            animate={{ scale: [1, 1.18, 1], opacity: [0.58, 0.9, 0.58] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
          />

          <motion.div style={styles.heroContent} initial="hidden" animate="visible" variants={stagger}>
            <motion.div style={styles.eyebrow} variants={fadeUp}>
              <Sparkles size={16} />
              SEAL Hackathon Management System
            </motion.div>

            <motion.h1 style={styles.h1} variants={fadeUp}>
              Cổng thông tin cho hệ thống SEAL Hackathon
            </motion.h1>

            <motion.p style={styles.heroLead} variants={fadeUp}>
              Trang tổng quan giới thiệu mục tiêu, vai trò chính và giá trị cốt lõi của dự án.
              Nội dung được giữ ở mức vừa đủ để người dùng mới hiểu hệ thống trước khi đăng nhập.
            </motion.p>

            <motion.div style={styles.cta} variants={fadeUp}>
              <Button type="primary" size="large" style={styles.primaryBtn} onClick={() => navigate(ROUTES.REGISTER)}>
                Đăng ký <ArrowRight size={18} />
              </Button>
              <Button size="large" style={styles.glassBtn} onClick={() => navigate(ROUTES.LOGIN)}>
                Đăng nhập <ChevronRight size={18} />
              </Button>
            </motion.div>

            <motion.div style={styles.stats} variants={fadeUp}>
              {highlights.map((item) => (
                <motion.div key={item.label} style={styles.statItem} whileHover={{ y: -5, scale: 1.02 }}>
                  <strong style={styles.statValue}>{item.value}</strong>
                  <span style={styles.statLabel}>{item.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            style={styles.console}
            initial={{ opacity: 0, x: 48, rotate: 1 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ duration: 0.82, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -8, rotate: -0.6 }}
          >
            <div style={styles.consoleTop}>
              <span style={{ ...styles.dot, background: '#ff5f57' }} />
              <span style={{ ...styles.dot, background: '#ffbd2e' }} />
              <span style={{ ...styles.dot, background: '#28c840' }} />
              <p style={{ margin: '0 0 0 auto' }}>Platform preview</p>
            </div>
            <div style={styles.consoleBody}>
              {[
                [UsersRound, 'Student portal ready', true],
                [CalendarCheck, 'Event timeline controlled'],
                [Trophy, 'Judging and leaderboard flow'],
              ].map(([Icon, text, active]) => (
                <motion.div
                  key={text}
                  style={{
                    ...styles.consoleLine,
                    background: active ? 'rgba(22,119,255,0.24)' : styles.consoleLine.background,
                  }}
                  whileHover={{ x: 6 }}
                >
                  <Icon size={16} color={active ? colors.accent : 'currentColor'} />
                  {text}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        <section id="overview" style={{ ...styles.section, ...styles.split }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
            <motion.span style={styles.kicker} variants={fadeUp}>Tổng quan</motion.span>
            <motion.h2 style={styles.h2} variants={fadeUp}>
              Một landing page chỉ giữ những thông tin cần thiết nhất.
            </motion.h2>
            <motion.p style={styles.sectionText} variants={fadeUp}>
              Người dùng chỉ cần biết đây là hệ thống quản lý Hackathon, có cổng tham gia,
              khu vực quản trị và các chức năng hỗ trợ theo dõi cuộc thi.
            </motion.p>
          </motion.div>

          <div id="platform" style={styles.featureGrid}>
            {featureCards.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.article
                  key={item.title}
                  style={styles.featureCard}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.55, delay: index * 0.08 }}
                  whileHover={{ y: -10, scale: 1.015 }}
                >
                  <motion.div
                    style={{
                      position: 'absolute',
                      inset: '-1px',
                      background: `linear-gradient(135deg, ${colors.primary}22, transparent 42%, ${colors.accent}18)`,
                      opacity: 0.8,
                    }}
                    animate={{ opacity: [0.45, 0.85, 0.45] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.25 }}
                  />
                  <div style={{ position: 'relative' }}>
                    <div style={styles.iconWrap}>
                      <Icon size={22} />
                    </div>
                    <h3 style={styles.cardTitle}>{item.title}</h3>
                    <p style={styles.cardText}>{item.text}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section style={styles.section}>
          <span style={styles.kicker}>Năng lực hệ thống</span>
          <h2 style={styles.h2}>Được thiết kế để mỗi vai trò nhìn thấy đúng việc cần làm.</h2>
          <div style={styles.pillarGrid}>
            {systemPillars.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  style={styles.pillar}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.45, delay: index * 0.05 }}
                  whileHover={{ y: -6 }}
                >
                  <Icon size={18} color={colors.primary} />
                  {item.label}
                </motion.div>
              );
            })}
          </div>
        </section>

        <section id="journey" style={styles.section}>
          <div style={styles.journeyHeader}>
            <span style={styles.kicker}>Phạm vi tổng quan</span>
            <h2 style={styles.h2}>Các mảng chính của hệ thống, không đi sâu vào chi tiết vận hành.</h2>
          </div>

          <div style={styles.rail}>
            {journeyItems.map((item, index) => (
              <motion.div
                key={item}
                style={styles.railItem}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                whileHover={{ y: -7 }}
              >
                <span style={styles.railNumber}>{String(index + 1).padStart(2, '0')}</span>
                <p style={styles.railText}>{item}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="hall-of-fame" style={styles.section}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={stagger}>
            <motion.span style={styles.kicker} variants={fadeUp}>Vinh danh</motion.span>
            <motion.h2 style={styles.h2} variants={fadeUp}>
              Bảng vàng và câu chuyện quán quân.
            </motion.h2>
            <motion.p style={styles.sectionText} variants={fadeUp}>
              Xem các đội vô địch qua từng mùa và đọc bài viết giới thiệu hành trình của họ.
            </motion.p>
            {teaserArticles.length > 0 ? (
              <motion.div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                  gap: 14,
                  marginTop: 22,
                }}
                variants={fadeUp}
              >
                {teaserArticles.map((article) => (
                  <button
                    key={article.id || article.slug}
                    type="button"
                    onClick={() => navigate(ROUTES.PUBLIC_ARTICLE.replace(':slug', article.slug))}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${colors.border}`,
                      background: colors.surface,
                      borderRadius: 16,
                      padding: 16,
                      cursor: 'pointer',
                      color: colors.text,
                    }}
                  >
                    {article.coverUrl ? (
                      <img
                        src={absoluteApiUrl(article.coverUrl)}
                        alt=""
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 10, marginBottom: 12 }}
                      />
                    ) : null}
                    <strong style={{ display: 'block', marginBottom: 6 }}>{article.title}</strong>
                    <span style={{ color: colors.muted, fontSize: 13 }}>
                      {article.summary || 'Đọc bài viết'}
                    </span>
                  </button>
                ))}
              </motion.div>
            ) : null}
            <motion.div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 20 }} variants={fadeUp}>
              <Button type="primary" size="large" style={styles.primaryBtn} onClick={() => navigate(ROUTES.PUBLIC_HALL_OF_FAME)}>
                Xem bảng vàng <Trophy size={18} />
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section style={styles.final}>
          <div>
            <span style={styles.kicker}>SEAL Hackathon</span>
            <h2 style={{ ...styles.h2, fontSize: isMobile ? 30 : 42 }}>
              Truy cập tài khoản để bắt đầu sử dụng hệ thống.
            </h2>
          </div>
          <div style={styles.finalActions}>
            <Button size="large" onClick={() => navigate(ROUTES.LOGIN)}>Đăng nhập</Button>
            <Button type="primary" size="large" style={styles.primaryBtn} onClick={() => navigate(ROUTES.REGISTER)}>
              Đăng ký <ArrowRight size={18} />
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
