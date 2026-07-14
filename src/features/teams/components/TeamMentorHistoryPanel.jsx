import { useEffect, useState } from 'react';
import { Spin, Typography, theme, Row, Col, Avatar } from 'antd';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap, Clock, Award, ShieldCheck } from 'lucide-react';
import { peopleService } from '../../people/services/peopleService';

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS */
const FPT = {
  orange: '#F37021',
  blue: '#00529C',
};

const unwrapItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const initialsFromName = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const getFormattedMentorInfo = (mentor) => {
  const rawName = mentor?.mentorName ?? mentor?.mentor_name ?? mentor?.fullName ?? mentor?.full_name ?? 'Mentor Ẩn danh';
  const code =
    mentor?.mentorCode ||
    mentor?.mentor_code ||
    mentor?.code ||
    mentor?.userCode ||
    mentor?.user_code ||
    mentor?.staffCode ||
    mentor?.staff_code ||
    mentor?.email?.split('@')[0]?.toUpperCase() ||
    'N/A';

  let formattedName = rawName;
  if (!/^(Thầy|Cô|ThS|TS|PGS|GS|Thạc\s*sĩ|Tiến\s*sĩ|Mr\.|Ms\.|Mrs\.)\s+/i.test(rawName)) {
    const prefix = mentor?.academicTitle || mentor?.academic_title || mentor?.salutation || mentor?.degree || mentor?.prefix || mentor?.title || mentor?.jobTitle;
    if (prefix && typeof prefix === 'string') {
      const trimmed = prefix.trim();
      if (/^(Thầy|Cô|ThS|TS|PGS|GS|Thạc\s*sĩ|Tiến\s*sĩ|Mr\.|Ms\.|Mrs\.)/i.test(trimmed)) {
        formattedName = `${trimmed} ${rawName}`;
      } else if (trimmed.length <= 15 && !trimmed.includes('@') && !trimmed.toLowerCase().includes('mentor')) {
        formattedName = `${trimmed} ${rawName}`;
      }
    }
  }

  return { rawName, formattedName, code };
};

const TeamMentorHistoryPanel = ({ teamId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  useEffect(() => {
    if (!teamId) return undefined;
    let cancelled = false;
    setLoading(true);
    peopleService
      .getTeamMentors(teamId)
      .then((res) => {
        if (!cancelled) setItems(unwrapItems(res));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!teamId) return null;

  return (
    <div
      style={{
        background: isDark
          ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)'
          : '#FFFFFF',
        borderRadius: 28,
        padding: '32px 36px',
        boxShadow: isDark
          ? '0 24px 50px -12px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
          : '0 20px 48px -12px rgba(243, 112, 33, 0.12), 0 8px 24px -8px rgba(0, 0, 0, 0.05), 0 0 0 1.5px rgba(243, 112, 33, 0.18)',
        border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(243, 112, 33, 0.22)'}`,
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      {/* Decorative Aura */}
      <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, background: `radial-gradient(circle, rgba(243, 112, 33, 0.1) 0%, transparent 70%)`, filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, background: `radial-gradient(circle, rgba(0, 82, 156, 0.08) 0%, transparent 70%)`, filter: 'blur(40px)', pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, position: 'relative', zIndex: 1 }}>
        <span style={{
          background: isDark ? 'rgba(243, 112, 33, 0.25)' : 'rgba(243, 112, 33, 0.12)',
          color: isDark ? '#FF8C42' : FPT.orange,
          padding: '4px 12px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.05em',
          border: `1px solid ${isDark ? 'rgba(243, 112, 33, 0.3)' : 'rgba(243, 112, 33, 0.25)'}`,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }}>
          <GraduationCap size={13} /> NGƯỜI HƯỚNG DẪN / MENTOR
        </span>
      </div>

      <Title level={4} style={{ margin: '0 0 24px', fontWeight: 900, color: token.colorTextHeading, fontSize: 22, letterSpacing: '-0.01em', position: 'relative', zIndex: 1 }}>
        Người Dẫn Dắt Đội Thi
      </Title>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center' }}><Spin size="large" /></div>
      ) : items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            border: `2px dashed ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(243, 112, 33, 0.3)'}`,
            borderRadius: 20,
            padding: '40px 24px',
            textAlign: 'center',
            background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(243, 112, 33, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}
        >
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: isDark ? 'rgba(243, 112, 33, 0.2)' : 'rgba(243, 112, 33, 0.1)', display: 'grid', placeItems: 'center', color: isDark ? '#FF8C42' : FPT.orange }}>
            <Sparkles size={28} />
          </div>
          <Text style={{ fontSize: 16, fontWeight: 700, color: token.colorTextHeading }}>Đội của bạn chưa có Người hướng dẫn</Text>
          <Text type="secondary" style={{ fontSize: 14, maxWidth: 400 }}>
            Mentor được phân theo bảng đấu. Sau khi Ban tổ chức gán mentor cho bảng và đội đã bốc thăm có bảng, mentor sẽ hiện tại đây.
          </Text>
        </motion.div>
      ) : (
        <Row gutter={[20, 20]}>
          {items.map((mentor, index) => {
            const { rawName, formattedName, code } = getFormattedMentorInfo(mentor);
            const avatarSrc = mentor?.avatarUrl || mentor?.avatar_url || mentor?.avatar;
            return (
              <Col xs={24} md={12} key={`${mentor.roundId ?? mentor.round_id}-${mentor.mentorId ?? mentor.mentor_id}`}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: isDark ? '0 12px 24px rgba(0,0,0,0.4)' : '0 12px 24px rgba(243, 112, 33, 0.15)' }}
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFF5F0',
                    border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(243, 112, 33, 0.2)'}`,
                    borderRadius: 20,
                    padding: 24,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar 
                      size={64} 
                      src={avatarSrc}
                      style={{ 
                        background: `linear-gradient(135deg, ${FPT.orange} 0%, #FF9800 100%)`,
                        fontWeight: 800,
                        fontSize: 24,
                        boxShadow: '0 4px 12px rgba(243, 112, 33, 0.4)'
                      }}
                    >
                      {initialsFromName(rawName)}
                    </Avatar>
                    <div style={{
                      position: 'absolute',
                      bottom: -4,
                      right: -4,
                      background: FPT.blue,
                      borderRadius: '50%',
                      padding: 4,
                      border: '2px solid #FFF',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#FFF'
                    }}>
                      <ShieldCheck size={14} />
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 18, fontWeight: 900, color: token.colorTextHeading }}>
                        {formattedName}
                      </Text>
                      <span style={{
                        background: isDark ? 'rgba(243, 112, 33, 0.2)' : '#FFE8D6',
                        color: isDark ? '#FF8C42' : FPT.orange,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800
                      }}>
                        {code}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: token.colorTextSecondary, fontSize: 13, marginBottom: 8 }}>
                      <Award size={14} />
                      <Text type="secondary" strong>Phụ trách: {mentor.roundName ?? mentor.round_name ?? '—'}</Text>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: token.colorTextSecondary, fontSize: 13 }}>
                      <Clock size={14} />
                      <Text type="secondary">
                        Phân công: {mentor.assignedAt || mentor.assigned_at ? new Date(mentor.assignedAt || mentor.assigned_at).toLocaleDateString('vi-VN') : '—'}
                      </Text>
                    </div>
                  </div>
                </motion.div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default TeamMentorHistoryPanel;
