import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, Col, Row, Space, Typography, Skeleton, theme, Empty } from "antd";
import { motion } from "framer-motion";
import { 
  Trophy, Award, Sparkles, Clock, CheckCircle2, BarChart3 
} from "lucide-react";
import { studentTeamService } from "../../team/services/studentTeam.service";
import { studentHackathonService } from "../../hackathon/services/studentHackathon.service";
import LifecycleBanner from "../../../../shared/components/LifecycleBanner";

const { Text, Title } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  orange: '#F37021',
  orangeLight: '#FF8C42',
  blue: '#00529C',
  blueDark: '#00244D',
};

const StudentResultsIndexPage = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  
  const [myHackathons, setMyHackathons] = useState([]);
  const [loadingHackathons, setLoadingHackathons] = useState(true);
  const [hackathonStatuses, setHackathonStatuses] = useState({});

  useEffect(() => {
    let cancelled = false;
    const fetchMyHackathons = async () => {
      try {
        const teams = await studentTeamService.getMyTeams();
        
        // Lọc ra các hackathon unique kèm thông tin đội
        const uniqueHackathons = [];
        const map = new Map();
        for (const team of teams) {
          if (!map.has(team.hackathonId)) {
            map.set(team.hackathonId, true);
            uniqueHackathons.push({
              value: team.hackathonId,
              label: team.hackathonName || `Hackathon #${team.hackathonId}`,
              team: team,
              hackathonName: team.hackathonName || `Hackathon #${team.hackathonId}`,
              teamName: team.teamName || 'Đội của bạn',
              trackName: team.trackName || 'Chưa phân bảng',
              isAdvanced: team.isAdvanced,
              isEliminatedFromFinal: team.isEliminatedFromFinal,
              status: team.status || 'ACTIVE'
            });
          }
        }
        if (!cancelled) {
          setMyHackathons(uniqueHackathons);
        }

        // Tải status thực tế từ BE cho từng hackathon
        for (const h of uniqueHackathons) {
          studentHackathonService.getHackathonDetail(h.value).then((detail) => {
            if (!cancelled && detail?.status) {
              setHackathonStatuses((prev) => ({
                ...prev,
                [h.value]: String(detail.status).toUpperCase(),
              }));
            }
          }).catch(() => {});
        }
      } catch (error) {
        console.warn("Lỗi tải danh sách cuộc thi", error);
      } finally {
        if (!cancelled) setLoadingHackathons(false);
      }
    };

    fetchMyHackathons();
    return () => { cancelled = true; };
  }, []);

  const openFinalResults = (customHackathonId) => {
    if (customHackathonId) navigate(`/student/hackathons/${customHackathonId}/results`);
  };

  return (
    <div style={{ width: "100%", maxWidth: 1150, margin: "0 auto", paddingBottom: 60 }}>
      <LifecycleBanner role="STUDENT" hackathonStatus="ONGOING" />
      {/* 1. ESPORTS MISSION CONTROL HERO BANNER */}
      <div
        style={{
          background: 'linear-gradient(135deg, #00244D 0%, #00529C 50%, #001F3F 100%)',
          borderRadius: 28,
          padding: '36px 40px',
          position: 'relative',
          overflow: 'hidden',
          color: '#fff',
          boxShadow: '0 20px 50px rgba(0, 82, 156, 0.25)',
          marginBottom: 32,
          border: '2px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Ambient glowing orb */}
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${FPT.orange} 0%, transparent 70%)`,
            opacity: 0.35,
            filter: 'blur(45px)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24, position: 'relative', zIndex: 1 }}>
          <Space direction="vertical" size={12} style={{ maxWidth: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  background: 'rgba(243, 112, 33, 0.3)',
                  color: '#FF8C42',
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  border: '1px solid rgba(243, 112, 33, 0.5)',
                  boxShadow: '0 4px 12px rgba(243, 112, 33, 0.2)',
                }}
              >
                <Sparkles size={14} /> TRUNG TÂM KẾT QUẢ THI ĐẤU
              </span>
            </div>

            <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              Phòng Truyền Thống & Kết Quả Thi Đấu
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6 }}>
              Nơi tra cứu điểm số các vòng thi đã công bố, bảng xếp hạng chung cuộc và chứng nhận điện tử từ hệ thống Ban Tổ Chức.
            </Text>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🏆 {myHackathons.length} Cuộc thi đã tham gia
              </span>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                📊 Dữ liệu chính thức từ BTC
              </span>
            </div>
          </Space>

          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 32,
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(16px)',
              display: 'grid',
              placeItems: 'center',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.3)',
              flexShrink: 0,
            }}
          >
            <Trophy size={64} style={{ color: FPT.orangeLight, filter: 'drop-shadow(0 4px 12px rgba(243, 112, 33, 0.5))' }} />
          </div>
        </div>
      </div>

      {/* ALERT MESSAGES */}
      <Alert
        showIcon
        type="info"
        message={<span style={{ fontWeight: 800, fontSize: 15 }}>Quy định công bố kết quả thi đấu</span>}
        description="Toàn bộ điểm số và bảng xếp hạng được xác thực trực tiếp từ hệ thống chấm thi của Ban Giám Khảo. Bảng vàng Xếp Hạng Chung Kết sẽ được mở công khai ngay sau khi Ban Tổ Chức hoàn tất chốt sổ điểm thi hoặc chính thức khép lại giải đấu."
        style={{ marginBottom: 24, borderRadius: 16, border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe'}`, background: isDark ? 'rgba(30, 58, 138, 0.2)' : '#eff6ff' }}
      />

      {/* 2. SECTION TITLE */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0, fontWeight: 900, color: token.colorTextHeading, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Trophy size={24} style={{ color: FPT.orange }} /> Cuộc thi của tôi
        </Title>
      </div>

      {/* 3. MAIN CONTENT AREA: PARTICIPATING HACKATHON CARDS */}
      {loadingHackathons ? (
        <div
          style={{
            padding: 40,
            background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#FFFFFF',
            borderRadius: 24,
            border: `1.5px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          }}
        >
          <Skeleton active avatar paragraph={{ rows: 8 }} />
        </div>
      ) : myHackathons.length === 0 ? (
        <Card
          style={{
            borderRadius: 24,
            background: isDark ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc',
            border: `1.5px dashed ${isDark ? 'rgba(255,255,255,0.15)' : '#cbd5e1'}`,
            textAlign: 'center',
            padding: '60px 20px',
          }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space direction="vertical" size={8}>
                <Text style={{ fontSize: 18, fontWeight: 800, color: token.colorTextHeading }}>
                  Bạn chưa tham gia cuộc thi Hackathon nào
                </Text>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  Khi bạn tham gia vào một đội thi đấu, kết quả các vòng thi và vinh danh chung cuộc sẽ hiển thị tại đây.
                </Text>
              </Space>
            }
          />
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {myHackathons.map((item, idx) => {
            const { value: hackId, hackathonName, teamName, trackName, isAdvanced, isEliminatedFromFinal } = item;
            const status = hackathonStatuses[hackId] || item.status || 'ACTIVE';

            let ctaText = "Xem bảng điểm đã công bố";
            let ctaIcon = <BarChart3 size={18} />;
            if (status === 'PENDING_CONFIRM') {
              ctaText = "Xem bảng xếp hạng Chung kết";
              ctaIcon = <Trophy size={18} />;
            } else if (status === 'FINISHED') {
              ctaText = "Xem kết quả & vinh danh";
              ctaIcon = <Award size={18} />;
            }

            return (
              <Col xs={24} md={12} key={hackId || idx}>
                <motion.div
                  whileHover={{ y: -6, scale: 1.01 }}
                  style={{ height: '100%' }}
                >
                  <Card
                    style={{
                      height: '100%',
                      borderRadius: 24,
                      background: isDark ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)' : '#FFFFFF',
                      border: `2px solid ${isAdvanced ? (isDark ? 'rgba(243, 112, 33, 0.5)' : '#F37021') : (isDark ? 'rgba(255, 255, 255, 0.12)' : '#e2e8f0')}`,
                      boxShadow: isAdvanced ? '0 16px 36px -8px rgba(243, 112, 33, 0.2)' : '0 10px 25px -5px rgba(0,0,0,0.05)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    {/* Card Top Strip */}
                    <div
                      style={{
                        background: isAdvanced
                          ? 'linear-gradient(135deg, #F37021 0%, #D9531E 100%)'
                          : 'linear-gradient(135deg, #00529C 0%, #00244D 100%)',
                        padding: '20px 24px',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div
                          style={{
                            width: 48,
                            height: 48,
                            borderRadius: 14,
                            background: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(8px)',
                            display: 'grid',
                            placeItems: 'center',
                            border: '1.5px solid rgba(255,255,255,0.3)',
                            flexShrink: 0,
                          }}
                        >
                          {isAdvanced ? <Award size={26} /> : <Trophy size={26} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            CUỘC THI THAM GIA
                          </div>
                          <Title level={4} style={{ margin: '2px 0 0', fontWeight: 900, color: '#fff', fontSize: 18 }}>
                            {hackathonName}
                          </Title>
                        </div>
                      </div>

                      {isAdvanced ? (
                        <span style={{ background: '#fff', color: '#d97706', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
                          🌟 Top Chung Kết
                        </span>
                      ) : isEliminatedFromFinal ? (
                        <span style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
                          🛑 Dừng bước
                        </span>
                      ) : null}
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 12, color: token.colorTextSecondary, fontWeight: 700, textTransform: 'uppercase' }}>
                              ĐỘI HÌNH DỰ THI
                            </div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: token.colorTextHeading, marginTop: 2 }}>
                              {teamName}
                            </div>
                          </div>
                          <span style={{ background: isDark ? 'rgba(243, 112, 33, 0.2)' : '#fff7ed', color: isDark ? '#FF8C42' : '#c2410c', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800, border: '1px solid rgba(243, 112, 33, 0.4)' }}>
                            🎯 {trackName}
                          </span>
                        </div>

                        {/* Status alert in card */}
                        <div
                          style={{
                            background: status === 'FINISHED' ? (isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4') : (isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff'),
                            padding: '12px 16px',
                            borderRadius: 14,
                            border: `1px solid ${status === 'FINISHED' ? (isDark ? 'rgba(22, 163, 74, 0.3)' : '#bbf7d0') : (isDark ? 'rgba(59, 130, 246, 0.3)' : '#bfdbfe')}`,
                            marginBottom: 24,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                          }}
                        >
                          {status === 'FINISHED' ? (
                            <>
                              <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                              <Text style={{ color: isDark ? '#86efac' : '#15803d', fontSize: 13, fontWeight: 700 }}>
                                Giải đấu đã chính thức kết thúc. Xem ngay tổng kết và vinh danh!
                              </Text>
                            </>
                          ) : status === 'PENDING_CONFIRM' ? (
                            <>
                              <Trophy size={18} style={{ color: '#d97706', flexShrink: 0 }} />
                              <Text style={{ color: isDark ? '#fde047' : '#b45309', fontSize: 13, fontWeight: 700 }}>
                                Chung kết đã khép lại. Xem bảng vàng xếp hạng Chung kết từ Ban giám khảo!
                              </Text>
                            </>
                          ) : (
                            <>
                              <Clock size={18} style={{ color: '#3b82f6', flexShrink: 0 }} />
                              <Text style={{ color: isDark ? '#93c5fd' : '#1d4ed8', fontSize: 13, fontWeight: 700 }}>
                                Tra cứu điểm số, thứ hạng và trạng thái thi đấu qua từng chặng hành trình.
                              </Text>
                            </>
                          )}
                        </div>
                      </div>

                      {/* UNIFIED DYNAMIC ACTION BUTTON */}
                      <Button
                        block
                        size="large"
                        type="primary"
                        onClick={() => openFinalResults(hackId)}
                        style={{
                          borderRadius: 14,
                          height: 52,
                          fontWeight: 800,
                          fontSize: 16,
                          background: status === 'FINISHED' || status === 'PENDING_CONFIRM'
                            ? 'linear-gradient(135deg, #F37021 0%, #FF8C42 100%)'
                            : 'linear-gradient(135deg, #00529C 0%, #0072CE 100%)',
                          border: 'none',
                          boxShadow: status === 'FINISHED' || status === 'PENDING_CONFIRM'
                            ? '0 8px 20px -4px rgba(243, 112, 33, 0.5)'
                            : '0 8px 20px -4px rgba(0, 82, 156, 0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                        }}
                      >
                        {ctaIcon} {ctaText}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default StudentResultsIndexPage;
