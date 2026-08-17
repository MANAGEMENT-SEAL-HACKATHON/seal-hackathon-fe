import { useEffect, useState } from 'react';
import { Card, Empty, Spin, Typography, Tag, theme } from 'antd';
import { Trophy, Award, Flame, CheckCircle2, Clock, XCircle, Compass, MapPin, Rocket, Layers } from 'lucide-react';
import { teamService } from '../services/teamService';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  blueLight: '#1E73BE',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const getStatusBadge = (status) => {
  const norm = String(status || '').toUpperCase();
  if (norm.includes('COMPLETED') || norm.includes('FINISHED')) {
    return {
      color: 'default',
      icon: <CheckCircle2 size={14} />,
      label: '✅ ĐÃ KẾT THÚC',
      bg: 'linear-gradient(135deg, rgba(100, 116, 139, 0.12) 0%, rgba(71, 85, 105, 0.08) 100%)',
      border: '#64748B',
    };
  }
  if (norm.includes('ADVANCED') || norm.includes('FINAL')) {
    return {
      color: 'gold',
      icon: <Trophy size={14} />,
      label: '🏆 VÀO CHUNG KẾT',
      bg: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 165, 0, 0.1) 100%)',
      border: '#FFD700',
    };
  }
  if (norm.includes('ELIMINATED') || norm.includes('OUT')) {
    return {
      color: 'error',
      icon: <XCircle size={14} />,
      label: '🔴 ĐÃ DỪNG BƯỚC',
      bg: 'linear-gradient(135deg, rgba(255, 77, 79, 0.12) 0%, rgba(207, 19, 34, 0.08) 100%)',
      border: '#FF4D4F',
    };
  }
  if (norm.includes('ACTIVE') || norm.includes('PARTICIPATING')) {
    return {
      color: 'success',
      icon: <CheckCircle2 size={14} />,
      label: '🟢 ĐANG THI ĐẤU',
      bg: 'linear-gradient(135deg, rgba(70, 183, 73, 0.15) 0%, rgba(46, 139, 87, 0.1) 100%)',
      border: FPT.green,
    };
  }
  if (norm.includes('UPCOMING') || norm.includes('PENDING')) {
    return {
      color: 'processing',
      icon: <Clock size={14} />,
      label: '⏳ SẮP DIỄN RA',
      bg: 'linear-gradient(135deg, rgba(0, 82, 156, 0.12) 0%, rgba(30, 115, 190, 0.08) 100%)',
      border: FPT.blueLight,
    };
  }
  return {
    color: 'processing',
    icon: <Clock size={14} />,
    label: `⏳ ${status || 'CHỜ THI ĐẤU'}`,
    bg: 'linear-gradient(135deg, rgba(0, 82, 156, 0.12) 0%, rgba(30, 115, 190, 0.08) 100%)',
    border: FPT.blueLight,
  };
};

const TeamJourneyPanel = ({ teamId, teamName }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [journey, setJourney] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) return undefined;
    let cancelled = false;
    setLoading(true);
    teamService
      .getJourney(teamId)
      .then((res) => {
        if (!cancelled) setJourney(res);
      })
      .catch(() => {
        if (!cancelled) setJourney(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!teamId) return null;

  const steps = journey?.steps || [];

  return (
    <Card
      style={{
        borderRadius: 24,
        background: isDark
          ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)'
          : '#FFFFFF',
        border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 82, 156, 0.12)'}`,
        boxShadow: isDark ? '0 16px 40px rgba(0, 0, 0, 0.5)' : '0 12px 32px rgba(0, 82, 156, 0.06)',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: '28px 32px' } }}
    >
      {/* ── Header Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 82, 156, 0.1)'}`,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${FPT.blue} 0%, #1E73BE 100%)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 6px 16px ${FPT.blue}40`,
              flexShrink: 0,
            }}
          >
            <Compass size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 900 }}>
                Hành Trình Đội Thi{teamName ? `: ${teamName}` : ''}
              </Title>
              <Tag color="cyan" style={{ borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                🗺️ TOURNAMENT ROADMAP
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 13, display: 'block' }}>
              Theo dõi tiến độ, bảng đấu chuyên biệt và trạng thái cạnh tranh qua từng vòng thi của Hackathon.
            </Text>
          </div>
        </div>

        <div style={{ background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F8FAFC', padding: '8px 16px', borderRadius: 12, border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#E2E8F0'}` }}>
          <Text style={{ fontSize: 11, fontWeight: 700, color: token.colorTextSecondary, display: 'block' }}>TỔNG SỐ VÒNG THI</Text>
          <Text style={{ fontSize: 18, fontWeight: 900, color: token.colorTextHeading }}>{steps.length} chặng</Text>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 12, fontWeight: 500 }}>
            Đang đồng bộ hành trình đội thi...
          </Text>
        </div>
      ) : steps.length === 0 ? (
        <Empty description="Chưa có dữ liệu hành trình thi đấu cho đội này." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steps.map((step, idx) => {
            const roundTitle = step.roundName ?? step.round_name ?? `Vòng ${step.roundId}`;
            const trackName = step.trackName ?? step.track_name ?? '—';
            const statusBadge = getStatusBadge(
              step.displayStatus ?? step.display_status ?? step.participationStatus ?? step.participation_status,
            );

            return (
              <div
                key={step.roundId || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  padding: '20px 24px',
                  borderRadius: 16,
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#F8FAFC',
                  border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 82, 156, 0.08)'}`,
                  borderLeft: `5px solid ${statusBadge.border}`,
                  transition: 'all 0.25s ease',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#FFFFFF',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                      display: 'grid',
                      placeItems: 'center',
                      color: token.colorTextHeading,
                      fontWeight: 800,
                      fontSize: 16,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Title level={5} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800, fontSize: 16 }}>
                        {roundTitle}
                      </Title>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Tag
                        color="orange"
                        style={{
                          margin: 0,
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 12,
                          padding: '2px 10px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Layers size={13} /> Track: {trackName}
                      </Tag>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Tag
                    color={statusBadge.color}
                    style={{
                      margin: 0,
                      borderRadius: 8,
                      fontWeight: 800,
                      fontSize: 13,
                      padding: '6px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      border: 0,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                    }}
                  >
                    {statusBadge.icon} {statusBadge.label}
                  </Tag>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default TeamJourneyPanel;
