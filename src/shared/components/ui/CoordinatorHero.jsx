import { Card, Skeleton, Space, Typography } from 'antd';
import { Grid } from 'antd';
import TechDecoration from './TechDecoration';
import {
  COORDINATOR_THEME,
  coordinatorTitleAccentStyle,
  pillStyles,
} from '../../theme/coordinatorTheme';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

/**
 * Shared coordinator page hero (Final-config look).
 * One primary CTA should live in `actions` (caller responsibility).
 *
 * @typedef {Object} HeroPill
 * @property {string} [key]
 * @property {import('react').ReactNode} [label]
 * @property {string} [tone] - 'info' | 'success' | 'danger' | 'warning' | 'neutral'
 * @property {boolean|string} [dot]
 * @property {import('react').ReactNode} [icon]
 * @property {boolean} [loading]
 */
const CoordinatorHero = (/** @type {any} */ props) => {
  const {
    title,
    subtitle,
    pills = /** @type {HeroPill[]} */ ([]),
    actions,
    decoration = true,
    style,
    onBack,
    backLabel,
    'data-testid': testId,
  } = props || {};
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Card
      bordered={false}
      data-testid={testId || 'coordinator-hero'}
      style={{
        borderRadius: COORDINATOR_THEME.heroRadius,
        background: COORDINATOR_THEME.heroGradient,
        boxShadow: COORDINATOR_THEME.heroShadow,
        border: COORDINATOR_THEME.heroBorder,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
        ...style,
      }}
      styles={{ body: { padding: isMobile ? '20px 16px' : '28px 24px', position: 'relative', zIndex: 1 } }}
    >
      {decoration && !isMobile ? <TechDecoration /> : null}

      <div style={{ position: 'relative', zIndex: 2 }}>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            data-testid="coordinator-hero-back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#475569',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            ← {backLabel || 'Quay lại'}
          </button>
        ) : null}
        {pills.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <Space wrap size={8}>
              {pills.map((p, idx) => {
                if (p.loading) {
                  return (
                    <Skeleton.Button
                      key={p.key || idx}
                      active
                      size="small"
                      style={{ width: 120, height: 28, borderRadius: 8 }}
                    />
                  );
                }
                const tone = p.tone || 'info';
                return (
                  <span key={p.key || idx} style={pillStyles(tone)}>
                    {p.dot != null ? (
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: typeof p.dot === 'string' ? p.dot : (pillStyles(tone).color),
                          display: 'inline-block',
                        }}
                      />
                    ) : null}
                    {p.icon}
                    {p.label}
                  </span>
                );
              })}
            </Space>
          </div>
        )}

        <Title level={2} style={{ ...coordinatorTitleAccentStyle, marginBottom: subtitle ? 8 : 20 }}>
          {title}
        </Title>
        {subtitle ? (
          // Hero surface luôn sáng — cố định màu slate để không mất chữ khi bật dark mode
          <Text style={{ display: 'block', marginBottom: 20, maxWidth: 720, color: '#64748b' }}>
            {subtitle}
          </Text>
        ) : null}

        {actions ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </Card>
  );
};

export default CoordinatorHero;
