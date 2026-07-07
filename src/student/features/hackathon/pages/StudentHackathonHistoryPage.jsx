  import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Space, Tag, Typography, Skeleton, theme, Input, Segmented, Row, Col, Modal, Avatar } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  History, Trophy, BarChart3, Sparkles, Award, Users, Target, Clock, CheckCircle2, 
  Search, AlertCircle, ShieldCheck, Mail 
} from 'lucide-react';
import { studentTeamService } from '../../team/services/studentTeam.service';
import { studentPortalService } from '../../portal/services/studentPortal.service';
import { ROUTES } from '../../../../shared/constants/routes';

const { Title, Text } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const StudentHackathonHistoryPage = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [teams, setTeams] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('ALL');
  const [selectedRosterTeam, setSelectedRosterTeam] = useState(null);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      studentTeamService.getMyTeams(),
      studentPortalService.getHistory().catch(() => []),
    ])
      .then(([teamData, historyData]) => {
        if (cancelled) return;
        setTeams(teamData.filter((t) => t.status !== 'REJECTED'));
        setHistoryItems(historyData);
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
          setHistoryItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const historyByHackathon = useMemo(() => {
    const map = new Map();
    historyItems.forEach((item) => {
      map.set(item.hackathonId ?? item.hackathon_id, item);
    });
    return map;
  }, [historyItems]);

  const hackathonGroups = useMemo(() => {
    const map = new Map();

    // 1. PRIMARY SOURCE: historyItems (Lấy danh sách các mùa giải từ API Lịch sử làm gốc)
    historyItems.forEach((item) => {
      const hId = item.hackathonId ?? item.hackathon_id ?? item.id;
      const hName = item.hackathonName ?? item.hackathon_name ?? item.name ?? (hId ? `Hackathon #${hId}` : 'Sự kiện Hackathon');
      const key = hId ?? hName;
      if (!map.has(key)) {
        map.set(key, {
          hackathonId: hId,
          hackathonName: hName,
          teams: [],
          historyRow: item,
        });
      } else {
        map.get(key).historyRow = item;
      }
    });

    // 2. ENRICHMENT & FALLBACK: teams (Ghép các đội dự thi tương ứng hoặc bổ sung nếu history chưa kịp đồng bộ)
    teams.forEach((team) => {
      const hId = team.hackathonId;
      const hName = team.hackathonName || (hId ? `Hackathon #${hId}` : 'Sự kiện Hackathon');
      const key = hId ?? hName;
      if (!map.has(key)) {
        map.set(key, {
          hackathonId: hId,
          hackathonName: hName,
          teams: [],
          historyRow: null,
        });
      }
      map.get(key).teams.push(team);
    });

    return Array.from(map.values()).sort((a, b) =>
      String(b.hackathonName || '').localeCompare(String(a.hackathonName || '')),
    );
  }, [historyItems, teams]);

  const finalistCount = useMemo(() => {
    return hackathonGroups.filter((g) => {
      const isTeamAdvanced = g.teams.some((t) => t.isAdvanced);
      const isHistoryAdvanced = g.historyRow?.outcome === 'ADVANCED' || g.historyRow?.outcome === 'WINNER';
      return isTeamAdvanced || isHistoryAdvanced;
    }).length;
  }, [hackathonGroups]);

  const filteredGroups = useMemo(() => {
    return hackathonGroups.filter((group) => {
      // 1. Search term
      const nameMatch = (group.hackathonName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const idMatch = String(group.hackathonId || '').includes(searchTerm);
      if (!nameMatch && !idMatch) return false;

      // 2. Filter tab
      if (filterTab === 'ALL') return true;
      const isAdvanced = group.teams.some((t) => t.isAdvanced) || group.historyRow?.outcome === 'ADVANCED' || group.historyRow?.outcome === 'WINNER';
      const isEliminated = (group.teams.length > 0 && group.teams.every((t) => t.isEliminatedFromFinal)) || group.historyRow?.outcome === 'ELIMINATED';

      if (filterTab === 'FINALIST') return isAdvanced;
      if (filterTab === 'ELIMINATED') return isEliminated && !isAdvanced;
      if (filterTab === 'ACTIVE') return !isAdvanced && !isEliminated;
      return true;
    });
  }, [hackathonGroups, searchTerm, filterTab]);

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 80px)',
        background: isDark
          ? 'radial-gradient(circle at 10% 10%, rgba(0, 82, 156, 0.25) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(243, 112, 33, 0.2) 0%, transparent 60%), #070B12'
          : 'radial-gradient(circle at 10% 10%, rgba(0, 82, 156, 0.15) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(243, 112, 33, 0.15) 0%, transparent 60%), linear-gradient(135deg, #eef2f6 0%, #e2e8f0 50%, #f1f5f9 100%)',
        padding: '40px 32px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative ambient background grid */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: isDark
            ? 'radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px)'
            : 'radial-gradient(rgba(0, 82, 156, 0.09) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* 1. TOP HERO SECTION (Glassmorphic Mission Control Banner) */}
        <div
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)'
              : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            borderRadius: 28,
            padding: '36px 40px',
            boxShadow: isDark
              ? '0 24px 50px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
              : '0 20px 48px -12px rgba(0, 82, 156, 0.18), 0 4px 16px -4px rgba(0,0,0,0.04)',
            border: `2px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.25)'}`,
            marginBottom: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Glowing orb inside hero */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              right: '10%',
              width: 350,
              height: 350,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${FPT.orange} 0%, transparent 70%)`,
              opacity: isDark ? 0.18 : 0.1,
              filter: 'blur(45px)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative', zIndex: 1 }}>
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              style={{
                width: 76,
                height: 76,
                borderRadius: 24,
                background: `linear-gradient(135deg, ${FPT.blue} 0%, #00C6FF 100%)`,
                display: 'grid',
                placeItems: 'center',
                color: '#fff',
                boxShadow: `0 16px 36px -4px rgba(0, 82, 156, 0.6), inset 0 2px 4px rgba(255,255,255,0.4)`,
                border: '2.5px solid rgba(255,255,255,0.4)',
                flexShrink: 0,
              }}
            >
              <History size={38} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }} />
            </motion.div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span
                  style={{
                    background: isDark ? 'rgba(243, 112, 33, 0.25)' : 'rgba(243, 112, 33, 0.15)',
                    color: isDark ? '#FF8C42' : FPT.orange,
                    padding: '6px 16px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 900,
                    letterSpacing: '0.08em',
                    border: `1.5px solid rgba(243, 112, 33, 0.4)`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    textTransform: 'uppercase',
                    boxShadow: '0 4px 12px rgba(243, 112, 33, 0.15)',
                  }}
                >
                  <Sparkles size={14} /> HỒ SƠ & LỊCH SỬ THAM GIA HACKATHON
                </span>
              </div>
              <Title
                level={1}
                style={{
                  margin: 0,
                  fontWeight: 900,
                  color: token.colorTextHeading,
                  fontSize: 34,
                  letterSpacing: '-0.03em',
                  lineHeight: 1.2,
                }}
              >
                Cuộc Thi Đã Tham Gia
              </Title>
              <Text
                style={{
                  color: token.colorTextSecondary,
                  fontSize: 16,
                  fontWeight: 500,
                  display: 'block',
                  marginTop: 6,
                }}
              >
                Tra cứu toàn bộ hành trình, đội hình đồng đội và thành tích tại các mùa giải Hackathon từ trước đến nay.
              </Text>
            </div>
          </div>

          {/* Micro-stat boxes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
            <div
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
                padding: '16px 24px',
                borderRadius: 22,
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0, 82, 156, 0.2)'}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: isDark ? 'rgba(0, 82, 156, 0.35)' : 'rgba(0, 82, 156, 0.12)',
                  color: isDark ? '#60A5FA' : FPT.blue,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Trophy size={24} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Tổng mùa giải
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: token.colorTextHeading, lineHeight: 1.1, marginTop: 2 }}>
                  {hackathonGroups.length} <span style={{ fontSize: 13, fontWeight: 600, color: token.colorTextSecondary }}>sự kiện</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#fff7ed',
                padding: '16px 24px',
                borderRadius: 22,
                border: `1.5px solid ${isDark ? 'rgba(243, 112, 33, 0.4)' : 'rgba(243, 112, 33, 0.3)'}`,
                boxShadow: '0 8px 24px rgba(243, 112, 33, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: isDark ? 'rgba(243, 112, 33, 0.25)' : 'rgba(243, 112, 33, 0.15)',
                  color: isDark ? '#FF8C42' : FPT.orange,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Award size={24} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Lọt Chung kết
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: isDark ? '#FF8C42' : FPT.orange, lineHeight: 1.1, marginTop: 2 }}>
                  {finalistCount} <span style={{ fontSize: 13, fontWeight: 600, color: token.colorTextSecondary }}>lần</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. TOOLBAR & FILTER (Search & Segmented) */}
        <div
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
            borderRadius: 22,
            padding: '18px 28px',
            boxShadow: isDark ? '0 16px 36px rgba(0,0,0,0.4)' : '0 14px 32px -8px rgba(0, 82, 156, 0.12)',
            border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.2)'}`,
            marginBottom: 36,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 18,
            backdropFilter: 'blur(16px)',
          }}
        >
          <div style={{ flex: '1 1 320px', maxWidth: 480 }}>
            <Input
              size="large"
              prefix={<Search size={18} style={{ color: '#94a3b8', marginRight: 8 }} />}
              placeholder="Tìm kiếm theo tên cuộc thi hoặc mã sự kiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
              style={{
                borderRadius: 14,
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f8fafc',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1',
                color: token.colorTextHeading,
                fontWeight: 500,
                height: 48,
              }}
            />
          </div>

          <div>
            <Segmented
              value={filterTab}
              onChange={(val) => setFilterTab(val)}
              size="large"
              style={{
                padding: 5,
                borderRadius: 14,
                background: isDark ? 'rgba(15, 23, 42, 0.8)' : '#f1f5f9',
                fontWeight: 700,
                border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1'}`,
              }}
              options={[
                {
                  label: (
                    <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🌐</span>
                      <span>Tất cả ({hackathonGroups.length})</span>
                    </div>
                  ),
                  value: 'ALL',
                },
                {
                  label: (
                    <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🏆</span>
                      <span>Lọt CK ({finalistCount})</span>
                    </div>
                  ),
                  value: 'FINALIST',
                },
                {
                  label: (
                    <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>⚡</span>
                      <span>Đang thi</span>
                    </div>
                  ),
                  value: 'ACTIVE',
                },
                {
                  label: (
                    <div style={{ padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>🛑</span>
                      <span>Bị loại</span>
                    </div>
                  ),
                  value: 'ELIMINATED',
                },
              ]}
            />
          </div>
        </div>

        {/* 3. MAIN CONTENT AREA WITH ANIMATE PRESENCE */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                padding: 48,
                background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                borderRadius: 28,
                border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
                boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
              }}
            >
              <Skeleton active avatar paragraph={{ rows: 8 }} />
            </motion.div>
          ) : (
            <motion.div
              key="history-content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {filteredGroups.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <Card
                    style={{
                      borderRadius: 28,
                      textAlign: 'center',
                      padding: '64px 24px',
                      background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
                      border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
                      boxShadow: '0 20px 50px -12px rgba(0,0,0,0.08)',
                    }}
                  >
                    <Trophy size={72} style={{ color: '#94a3b8', margin: '0 auto 18px', opacity: 0.4 }} />
                    <Title level={3} style={{ color: token.colorTextHeading, marginBottom: 8, fontWeight: 800 }}>
                      {searchTerm || filterTab !== 'ALL'
                        ? 'Không tìm thấy cuộc thi phù hợp'
                        : 'Bạn chưa tham gia cuộc thi nào'}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 15, maxWidth: 480, display: 'block', margin: '0 auto 24px' }}>
                      {searchTerm || filterTab !== 'ALL'
                        ? 'Vui lòng thử từ khóa khác hoặc chuyển bộ lọc sang trạng thái "Tất cả".'
                        : 'Hãy đăng ký tham gia các kỳ Hackathon sắp tới để bắt đầu hành trình chinh phục thử thách!'}
                    </Text>
                    {(searchTerm || filterTab !== 'ALL') && (
                      <Button
                        type="primary"
                        size="large"
                        onClick={() => {
                          setSearchTerm('');
                          setFilterTab('ALL');
                        }}
                        style={{
                          borderRadius: 12,
                          fontWeight: 700,
                          padding: '0 28px',
                          height: 48,
                          background: FPT.blue,
                        }}
                      >
                        Đặt lại bộ lọc
                      </Button>
                    )}
                  </Card>
                </motion.div>
              ) : (
                <Space direction="vertical" size={28} style={{ width: '100%' }}>
                  {filteredGroups.map((group, index) => {
                    const primary = group.teams[0];
                    const historyRow = group.historyRow || historyByHackathon.get(group.hackathonId);
                    const isAdvanced = group.teams.some((t) => t.isAdvanced) || historyRow?.outcome === 'ADVANCED' || historyRow?.outcome === 'WINNER';
                    const isEliminated = (group.teams.length > 0 && group.teams.every((t) => t.isEliminatedFromFinal)) || historyRow?.outcome === 'ELIMINATED';
                    const hasFinalist = isAdvanced;

                    return (
                      <motion.div
                        key={group.hackathonId ?? group.hackathonName}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.4, delay: index * 0.08 }}
                        whileHover={{ y: -6, transition: { duration: 0.25 } }}
                      >
                        <div
                          style={{
                            background: isDark
                              ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)'
                              : '#FFFFFF',
                            borderRadius: 28,
                            boxShadow: isDark
                              ? '0 24px 60px -12px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15)'
                              : '0 20px 50px -15px rgba(0, 82, 156, 0.18), 0 4px 16px -4px rgba(0,0,0,0.04)',
                            border: `2px solid ${
                              hasFinalist
                                ? (isDark ? 'rgba(243, 112, 33, 0.5)' : 'rgba(243, 112, 33, 0.4)')
                                : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 82, 156, 0.22)')
                            }`,
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {/* 1. COVER BANNER / TOP HEADER STRIP */}
                          <div
                            style={{
                              background: hasFinalist
                                ? 'linear-gradient(135deg, #F37021 0%, #D9531E 50%, #9C3300 100%)'
                                : 'linear-gradient(135deg, #00529C 0%, #003366 50%, #001F3F 100%)',
                              padding: '24px 32px',
                              position: 'relative',
                              overflow: 'hidden',
                              color: '#fff',
                            }}
                          >
                            {/* Decorative background circle inside cover */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '-40%',
                                right: '-5%',
                                width: 220,
                                height: 220,
                                borderRadius: '50%',
                                background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
                                pointerEvents: 'none',
                              }}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                                <div
                                  style={{
                                    width: 58,
                                    height: 58,
                                    borderRadius: 18,
                                    background: 'rgba(255, 255, 255, 0.2)',
                                    backdropFilter: 'blur(10px)',
                                    display: 'grid',
                                    placeItems: 'center',
                                    color: '#fff',
                                    border: '2px solid rgba(255, 255, 255, 0.4)',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {hasFinalist ? <Award size={30} /> : <Trophy size={30} />}
                                </div>

                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                    <h3 style={{ margin: 0, fontWeight: 900, color: '#fff', fontSize: 24, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                      {group.hackathonName}
                                    </h3>
                                    <span
                                      style={{
                                        background: 'rgba(255,255,255,0.25)',
                                        color: '#fff',
                                        padding: '3px 12px',
                                        borderRadius: 8,
                                        fontSize: 12,
                                        fontWeight: 800,
                                        fontFamily: 'monospace',
                                        border: '1px solid rgba(255,255,255,0.4)',
                                      }}
                                    >
                                      #{group.hackathonId || 'N/A'}
                                    </span>
                                  </div>

                                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600, marginTop: 4 }}>
                                    Hồ sơ sự kiện thi đấu chính thức • Ban tổ chức Hackathon
                                  </div>
                                </div>
                              </div>

                              {/* Status Badges inside Top Cover */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {hasFinalist && (
                                  <span
                                    style={{
                                      background: '#ffffff',
                                      color: '#d97706',
                                      padding: '6px 16px',
                                      borderRadius: 12,
                                      fontWeight: 900,
                                      fontSize: 13,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 6,
                                      boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                                    }}
                                  >
                                    🌟 Lọt vào Chung Kết
                                  </span>
                                )}
                                {isEliminated && !hasFinalist && (
                                  <span
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.9)',
                                      color: '#ffffff',
                                      padding: '6px 16px',
                                      borderRadius: 12,
                                      fontWeight: 800,
                                      fontSize: 13,
                                      boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                                    }}
                                  >
                                    🛑 Dừng bước Sơ loại
                                  </span>
                                )}
                                {!hasFinalist && !isEliminated && primary?.participationLabel && (
                                  <Tag style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', fontWeight: 800, borderRadius: 8, padding: '4px 12px', fontSize: 12 }}>
                                    {primary.participationLabel}
                                  </Tag>
                                )}
                                {primary?.statusLabel && (
                                  <Tag color={primary.statusColor} style={{ fontWeight: 800, borderRadius: 8, padding: '4px 12px', fontSize: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                                    {primary.statusLabel}
                                  </Tag>
                                )}
                                {historyRow?.outcome && !hasFinalist && !isEliminated && (
                                  <Tag color="processing" style={{ fontWeight: 800, borderRadius: 8, padding: '4px 12px', fontSize: 12 }}>
                                    {historyRow.outcome}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. CARD BODY */}
                          <div style={{ padding: '28px 32px' }}>
                            {/* Two Elevated Cards for Team & Track Details */}
                            <Row gutter={[20, 20]} align="stretch" style={{ marginBottom: 24 }}>
                              <Col xs={24} md={12}>
                                <div
                                  style={{
                                    background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#f8fafc',
                                    borderRadius: 20,
                                    padding: '20px 24px',
                                    border: `1.5px solid ${isDark ? 'rgba(59, 130, 246, 0.25)' : '#bfdbfe'}`,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    boxShadow: isDark ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.06)',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 14,
                                      background: 'linear-gradient(135deg, #00529C 0%, #00C6FF 100%)',
                                      display: 'grid',
                                      placeItems: 'center',
                                      color: '#fff',
                                      boxShadow: '0 6px 16px rgba(0, 82, 156, 0.3)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Users size={24} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                      Đội dự thi của bạn
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: token.colorTextHeading, marginTop: 2 }}>
                                      {group.teams.length > 0 ? group.teams.map((t) => t.teamName).join(', ') : (historyRow?.teamName || historyRow?.team_name || 'Đăng ký cá nhân / Chưa tạo đội')}
                                    </div>
                                  </div>
                                </div>
                              </Col>

                              <Col xs={24} md={12}>
                                <div
                                  style={{
                                    background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#faf5ff',
                                    borderRadius: 20,
                                    padding: '20px 24px',
                                    border: `1.5px solid ${isDark ? 'rgba(139, 92, 246, 0.25)' : '#e9d5ff'}`,
                                    height: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                    boxShadow: isDark ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.06)',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 48,
                                      height: 48,
                                      borderRadius: 14,
                                      background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                                      display: 'grid',
                                      placeItems: 'center',
                                      color: '#fff',
                                      boxShadow: '0 6px 16px rgba(139, 92, 246, 0.3)',
                                      flexShrink: 0,
                                    }}
                                  >
                                    <Target size={24} />
                                  </div>
                                  <div>
                                    <div style={{ fontSize: 11, color: token.colorTextSecondary, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                      Bảng đấu / Track thi đấu
                                    </div>
                                    <div style={{ fontSize: 18, fontWeight: 900, color: token.colorTextHeading, marginTop: 2 }}>
                                      {group.teams.length > 0 ? group.teams.map((t) => t.trackName || 'Chưa phân bảng').join(', ') : (historyRow?.trackName || historyRow?.track_name || 'Chưa phân bảng')}
                                    </div>
                                  </div>
                                </div>
                              </Col>
                            </Row>

                            {/* Glowing Status Alert Banner */}
                            <div
                              style={{
                                background: hasFinalist
                                  ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4')
                                  : isEliminated
                                  ? (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2')
                                  : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff'),
                                borderRadius: 16,
                                padding: '16px 20px',
                                border: `1px solid ${
                                  hasFinalist
                                    ? (isDark ? 'rgba(22, 163, 74, 0.3)' : '#bbf7d0')
                                    : isEliminated
                                    ? (isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca')
                                    : (isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe')
                                }`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 14,
                                marginBottom: 24,
                              }}
                            >
                              {hasFinalist ? (
                                <>
                                  <CheckCircle2 size={22} style={{ color: '#16a34a', flexShrink: 0 }} />
                                  <Text style={{ color: isDark ? '#86efac' : '#15803d', fontSize: 14, fontWeight: 700 }}>
                                    Chúc mừng! Đội thi đã xuất sắc vượt qua Vòng Sơ loại để góp mặt tại Vòng Chung kết Hackathon.
                                  </Text>
                                </>
                              ) : isEliminated ? (
                                <>
                                  <AlertCircle size={22} style={{ color: '#ef4444', flexShrink: 0 }} />
                                  <Text style={{ color: isDark ? '#fca5a5' : '#b91c1c', fontSize: 14, fontWeight: 700 }}>
                                    Đội đã dừng bước tại Vòng Sơ loại. Bạn vẫn có thể tra cứu bảng điểm đánh giá chi tiết từ Ban giám khảo.
                                  </Text>
                                </>
                              ) : (
                                <>
                                  <Clock size={22} style={{ color: '#3b82f6', flexShrink: 0 }} />
                                  <Text style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontSize: 14, fontWeight: 700 }}>
                                    Cuộc thi đang diễn ra hoặc đang trong quá trình đánh giá, chấm điểm từ Ban tổ chức.
                                  </Text>
                                </>
                              )}
                            </div>

                            {/* Bottom Action Bar */}
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 14,
                                paddingTop: 20,
                                borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#cbd5e1'}`,
                              }}
                            >
                              <Button
                                size="large"
                                onClick={() => {
                                  if (primary && primary.members && primary.members.length > 0) {
                                    setSelectedRosterTeam(primary);
                                    setIsRosterModalOpen(true);
                                  } else {
                                    navigate(ROUTES.STUDENT_TEAM);
                                  }
                                }}
                                style={{
                                  borderRadius: 14,
                                  fontWeight: 700,
                                  padding: '0 24px',
                                  height: 48,
                                  background: isDark ? 'rgba(255, 255, 255, 0.08)' : '#ffffff',
                                  borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : '#94a3b8',
                                  color: token.colorTextHeading,
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                }}
                              >
                                {primary && primary.members && primary.members.length > 0 ? '👥 Xem hồ sơ đội hình' : '👥 Xem chi tiết đội'}
                              </Button>

                              {group.hackathonId && (
                                <Button
                                  size="large"
                                  icon={<Award size={18} style={{ color: '#F37021' }} />}
                                  onClick={() => navigate(`/student/hackathons/${group.hackathonId}/results`)}
                                  style={{
                                    borderRadius: 14,
                                    fontWeight: 800,
                                    padding: '0 24px',
                                    height: 48,
                                    background: isDark ? 'rgba(243, 112, 33, 0.15)' : '#fff7ed',
                                    borderColor: isDark ? 'rgba(243, 112, 33, 0.4)' : '#fdba74',
                                    color: isDark ? '#FF8C42' : '#c2410c',
                                    boxShadow: '0 4px 14px rgba(243, 112, 33, 0.15)',
                                  }}
                                >
                                  Vinh danh Chung cuộc
                                </Button>
                              )}

                              <Button
                                type="primary"
                                size="large"
                                icon={<BarChart3 size={18} />}
                                onClick={() => navigate(ROUTES.STUDENT_RESULTS)}
                                style={{
                                  borderRadius: 14,
                                  fontWeight: 800,
                                  padding: '0 28px',
                                  height: 48,
                                  background: 'linear-gradient(135deg, #00529C 0%, #00C6FF 100%)',
                                  boxShadow: '0 8px 24px -4px rgba(0, 82, 156, 0.5)',
                                }}
                              >
                                Tra cứu điểm vòng
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </Space>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 4. SLEEK & COMPACT HISTORICAL TEAM ROSTER MODAL */}
        <Modal
          open={isRosterModalOpen}
          onCancel={() => {
            setIsRosterModalOpen(false);
            setSelectedRosterTeam(null);
          }}
          footer={[
            <Button
              key="close"
              type="primary"
              size="large"
              onClick={() => {
                setIsRosterModalOpen(false);
                setSelectedRosterTeam(null);
              }}
              style={{
                borderRadius: 10,
                fontWeight: 700,
                padding: '0 28px',
                height: 42,
                background: FPT.blue,
              }}
            >
              Đóng lại
            </Button>,
          ]}
          width={640}
          centered
          title={null}
          styles={{
            content: {
              background: isDark
                ? 'linear-gradient(145deg, rgba(15, 23, 42, 0.98) 0%, rgba(7, 11, 18, 0.99) 100%)'
                : '#FFFFFF',
              borderRadius: 20,
              border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0'}`,
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
              padding: 0,
              overflow: 'hidden',
            },
          }}
        >
          {selectedRosterTeam && (
            <div>
              {/* Compact Header */}
              <div
                style={{
                  background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#f8fafc',
                  padding: '20px 24px',
                  borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: 'linear-gradient(135deg, #00529C 0%, #00C6FF 100%)',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#fff',
                      boxShadow: '0 6px 16px rgba(0, 82, 156, 0.25)',
                      flexShrink: 0,
                    }}
                  >
                    <Users size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: FPT.orange, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles size={13} /> HỒ SƠ ĐỘI HÌNH DỰ THI
                    </div>
                    <Title level={4} style={{ margin: '2px 0 6px', fontWeight: 900, color: token.colorTextHeading }}>
                      {selectedRosterTeam.teamName}
                    </Title>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, color: token.colorTextHeading }}>
                        🏆 {selectedRosterTeam.hackathonName}
                      </span>
                      <span style={{ background: isDark ? 'rgba(243, 112, 33, 0.2)' : '#fff7ed', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: isDark ? '#FF8C42' : '#c2410c' }}>
                        🎯 {selectedRosterTeam.trackName || 'Chưa phân bảng'}
                      </span>
                      <Tag color={selectedRosterTeam.statusColor || 'success'} style={{ fontWeight: 700, borderRadius: 6, margin: 0 }}>
                        {selectedRosterTeam.statusLabel || selectedRosterTeam.status || 'Đã duyệt'}
                      </Tag>
                    </div>
                  </div>
                </div>
              </div>

              {/* Compact Member List */}
              <div style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShieldCheck size={16} style={{ color: FPT.green }} /> Danh sách thành viên ({selectedRosterTeam.members?.length || 0})
                  </div>
                </div>

                <div
                  style={{
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
                  }}
                >
                  {(selectedRosterTeam.members || []).map((member, idx) => {
                    const isLeader = member.roleInTeam === 'LEADER';
                    const isLast = idx === (selectedRosterTeam.members?.length || 0) - 1;
                    return (
                      <div
                        key={member.userId || member.email || idx}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: isLast ? 'none' : `1px solid ${isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9'}`,
                          background: isLeader ? (isDark ? 'rgba(243, 112, 33, 0.08)' : '#fffaf0') : 'transparent',
                          transition: 'background 0.2s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                          <Avatar
                            size={40}
                            style={{
                              background: isLeader ? 'linear-gradient(135deg, #F37021, #FF8C42)' : FPT.blue,
                              fontWeight: 800,
                              flexShrink: 0,
                            }}
                          >
                            {member.fullName ? member.fullName.charAt(0).toUpperCase() : 'U'}
                          </Avatar>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 800, fontSize: 14, color: token.colorTextHeading }}>
                                {member.fullName || 'Thành viên'}
                              </span>
                              {isLeader ? (
                                <Tag color="orange" style={{ margin: 0, fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '0 6px' }}>
                                  👑 Trưởng nhóm
                                </Tag>
                              ) : (
                                <Tag style={{ margin: 0, fontSize: 11, fontWeight: 600, borderRadius: 6, padding: '0 6px', background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', border: 'none', color: token.colorTextSecondary }}>
                                  Thành viên
                                </Tag>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: token.colorTextSecondary, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Mail size={12} style={{ flexShrink: 0 }} />
                              <span>{member.email || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: 16 }}>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: member.isAccepted !== false ? (isDark ? '#86efac' : '#16a34a') : '#f59e0b',
                              background: member.isAccepted !== false ? (isDark ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4') : (isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7'),
                              padding: '4px 10px',
                              borderRadius: 12,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: member.isAccepted !== false ? '#16a34a' : '#f59e0b' }} />
                            {member.isAccepted !== false ? 'Đã tham gia' : 'Chờ duyệt'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default StudentHackathonHistoryPage;
