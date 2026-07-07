import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Card, Space, Typography, theme } from "antd";
import { ArrowLeft, RefreshCw, Sparkles, BarChart3 } from "lucide-react";
import PublicScoreboard from "../components/PublicScoreboard";
import { useStudentRoundResults } from "../hooks/useStudentRoundResults";

const { Title, Text } = Typography;

/* OFFICIAL FPT LOGO COLORS & CYBER PALETTE */
const FPT = {
  orange: '#F37021',
  orangeLight: '#FF8C42',
  blue: '#00529C',
  blueDark: '#00244D',
};

const StudentRoundLeaderboardPage = ({ roundId: roundIdProp, source = "public" }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const roundId = roundIdProp || params.roundId || params.id;
  const { scoreboard, isLoading, error, fetchScoreboard } = useStudentRoundResults(roundId, source);
  const notPublished =
    error?.code === "RESULT_NOT_PUBLISHED" ||
    error?.data?.error?.code === "RESULT_NOT_PUBLISHED";

  if (!roundId) {
    return <Alert showIcon type="warning" message="Thiếu roundId" description="Trang kết quả cần roundId để tải scoreboard." />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Back Navigation */}
      <Button 
        type="text" 
        icon={<ArrowLeft size={18} style={{ color: FPT.blue }} />} 
        onClick={() => navigate('/student/results')}
        style={{ marginBottom: 20, padding: '8px 16px', height: 'auto', fontWeight: 700, fontSize: 15, borderRadius: 12, background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }}
      >
        Quay lại Trung tâm Vinh danh
      </Button>

      {/* 1. ESPORTS MISSION CONTROL COVER BANNER */}
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
          <Space direction="vertical" size={12} style={{ maxWidth: 720 }}>
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
                <Sparkles size={14} /> BẢNG ĐIỂM CHI TIẾT VÒNG THI
              </span>
            </div>

            <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 900, fontSize: 32, letterSpacing: '-0.02em', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
              {scoreboard?.roundName || `Kết Quả Vòng Thi #${roundId}`}
            </Title>

            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, lineHeight: 1.6 }}>
              Bảng xếp hạng điểm số trực tiếp, đánh giá tiêu chí và thứ hạng tạm thời từ Hội đồng Ban giám khảo.
            </Text>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                📊 Scoreboard Trực Tuyến
              </span>
              <span style={{ background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#fff', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 6 }}>
                🛡️ Kết quả chính thức
              </span>
            </div>
          </Space>

          <Button
            size="large"
            icon={<RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />}
            onClick={fetchScoreboard}
            style={{
              borderRadius: 14,
              height: 48,
              fontWeight: 700,
              padding: '0 24px',
              background: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#fff',
              zIndex: 2,
            }}
          >
            Làm mới điểm
          </Button>
        </div>
      </div>

      {error && !notPublished && <Alert showIcon type="error" message="Không thể tải kết quả" description={error.message} style={{ marginBottom: 24, borderRadius: 16 }} />}
      {notPublished ? (
        <Card bordered={false} style={{ borderRadius: 24, boxShadow: '0 12px 32px rgba(0,0,0,0.06)', marginTop: 20, padding: '60px 0', background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#fff' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <BarChart3 size={80} strokeWidth={1.5} color="#d1d5db" />
            </div>
            <Title level={3} style={{ color: token.colorTextHeading, fontWeight: 900, margin: '0 0 12px' }}>
              Kết quả đang được Ban giám khảo tổng hợp
            </Title>
            <Text type="secondary" style={{ fontSize: 16, maxWidth: 500, display: 'inline-block', lineHeight: 1.6 }}>
              Scoreboard sẽ được mở công khai ngay sau khi Ban tổ chức chính thức công bố kết quả chấm thi của vòng này. Vui lòng quay lại sau!
            </Text>
          </div>
        </Card>
      ) : (
        <PublicScoreboard scoreboard={scoreboard} isLoading={isLoading} />
      )}
    </div>
  );
};

export default StudentRoundLeaderboardPage;
