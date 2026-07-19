/**
 * Coordinator visual system — Final-config indigo/slate is the single source of truth.
 */
export const COORDINATOR_THEME = {
  primary: '#818cf8',
  primaryHover: '#a78bfa',
  primaryActive: '#6366f1',
  accent: '#4f46e5',
  border: '#ddd6fe',
  surfaceSoft: '#f5f3ff',
  surfaceSoftAlt: '#eff6ff',
  /** Final-config CTA */
  ctaGradient: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
  /** Soft accent (icons / progress) — aligned with final-config indigo */
  gradient: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
  gradientHover: 'linear-gradient(135deg, #6366f1 0%, #60a5fa 100%)',
  heroGradient: 'linear-gradient(135deg, #f5f7ff 0%, #f4f6fc 50%, #eff2fa 100%)',
  headerGradient: 'linear-gradient(135deg, #f5f7ff 0%, #f4f6fc 50%, #eff2fa 100%)',
  progressGradient: 'linear-gradient(90deg, #4f46e5 0%, #3b82f6 100%)',
  heroBorder: '1px solid rgba(99, 102, 241, 0.12)',
  heroShadow: '0 10px 30px rgba(99, 102, 241, 0.05)',
  radius: 16,
  heroRadius: 20,
  cardShadow: '0 1px 2px rgba(79, 70, 229, 0.06)',
  cardHoverShadow: '0 8px 24px rgba(129, 140, 248, 0.18)',
};

export const pillStyles = (tone = 'info') => {
  const map = {
    info: { background: 'rgba(59, 130, 246, 0.08)', color: '#2563eb' },
    success: { background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' },
    danger: { background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c' },
    warning: { background: 'rgba(245, 158, 11, 0.12)', color: '#d97706' },
    neutral: { background: 'rgba(100, 116, 139, 0.08)', color: '#475569' },
  };
  const c = map[tone] || map.info;
  return {
    ...c,
    fontWeight: 600,
    fontSize: 13,
    borderRadius: 8,
    padding: '6px 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
};

export const whiteButtonStyle = {
  height: 'auto',
  padding: '10px 20px',
  background: '#ffffff',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  borderRadius: 12,
  fontWeight: 600,
  fontSize: 14,
  color: '#1e293b',
  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
};

export const primaryGradientButtonStyle = {
  height: 'auto',
  padding: '10px 22px',
  background: COORDINATOR_THEME.ctaGradient,
  border: 'none',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 14,
  color: '#ffffff',
  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.25)',
};

export const tableCardStyle = {
  borderRadius: 16,
  border: COORDINATOR_THEME.heroBorder,
  boxShadow: COORDINATOR_THEME.cardShadow,
  background: '#ffffff',
};

export const coordinatorStatCardStyle = {
  height: '100%',
  borderRadius: COORDINATOR_THEME.radius,
  border: `1px solid ${COORDINATOR_THEME.border}`,
  boxShadow: COORDINATOR_THEME.cardShadow,
  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
};

export const coordinatorIconBadgeStyle = {
  width: 36,
  height: 36,
  borderRadius: 10,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: COORDINATOR_THEME.surfaceSoft,
  color: COORDINATOR_THEME.accent,
  fontSize: 16,
};

export const coordinatorPageHeaderStyle = {
  background: COORDINATOR_THEME.heroGradient,
  border: COORDINATOR_THEME.heroBorder,
  borderRadius: COORDINATOR_THEME.heroRadius,
  boxShadow: COORDINATOR_THEME.heroShadow,
  padding: '20px 24px',
  marginBottom: 20,
};

export const coordinatorTitleAccentStyle = {
  margin: 0,
  fontWeight: 700,
  color: '#0f172a',
  letterSpacing: '-0.02em',
};
