import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Spin, Typography, message, Tag, theme } from 'antd';
import { FilePdfOutlined, DownloadOutlined, ClockCircleOutlined, TrophyOutlined } from '@ant-design/icons';
import { studentRoundService } from '../services/studentRound.service';

const { Title, Text } = Typography;

/* OFFICIAL FPT LOGO COLORS */
const FPT = {
  blue: '#00529C',
  blueDark: '#003366',
  blueLight: '#1E73BE',
  orange: '#F37021',
  orangeLight: '#FF8C42',
  green: '#46B749',
};

const openPdfBlob = (blob, filename) => {
  const fileUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
  const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    URL.revokeObjectURL(fileUrl);
    message.warning('Trình duyệt chặn popup — hãy cho phép để xem PDF.');
    return;
  }
  setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
};

const FinalRoundProblemPanel = ({ teamId, hackathonId }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [loading, setLoading] = useState(true);
  const [roundId, setRoundId] = useState(null);
  const [roundName, setRoundName] = useState('');
  const [problem, setProblem] = useState(null);
  const [waitingRelease, setWaitingRelease] = useState(false);
  const [notEligible, setNotEligible] = useState(false);
  const [notActive, setNotActive] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadProblem = useCallback(async () => {
    if (!teamId || !hackathonId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setWaitingRelease(false);
    setNotEligible(false);
    setNotActive(false);
    setProblem(null);

    try {
      const finalRound = await studentRoundService.getFinalRound(hackathonId);
      if (!finalRound?.roundId) {
        setNotEligible(true);
        return;
      }

      setRoundId(finalRound.roundId);
      setRoundName(finalRound.name || 'Vòng Chung kết');

      if (!finalRound.isActive) {
        setNotActive(true);
        return;
      }

      if (!finalRound.problemReleased) {
        setWaitingRelease(true);
        return;
      }

      const data = await studentRoundService.getProblem(finalRound.roundId);
      setProblem(data);
    } catch (error) {
      if (error?.status === 403 || error?.status === 404) {
        setNotEligible(true);
      }
    } finally {
      setLoading(false);
    }
  }, [teamId, hackathonId]);

  useEffect(() => {
    loadProblem();
  }, [loadProblem]);

  const handleDownload = async () => {
    if (!roundId) return;
    setDownloading(true);
    try {
      const blob = await studentRoundService.downloadProblemStatement(roundId);
      openPdfBlob(blob, problem?.problemFilename || 'de-bai-chung-ket.pdf');
    } catch (error) {
      message.error(error?.message || 'Không tải được đề bài.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <Card
        style={{
          borderRadius: 20,
          textAlign: 'center',
          padding: '32px 0',
          background: isDark ? 'rgba(30, 41, 59, 0.6)' : '#FFFFFF',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : token.colorBorderSecondary}`,
        }}
      >
        <Spin tip="Đang kiểm tra đề Chung kết..." size="large" />
      </Card>
    );
  }

  if (notEligible) {
    return null;
  }

  if (notActive) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(114, 46, 209, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, #F9F0FF 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(186, 104, 200, 0.4)' : '#D3ADF7'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(243, 112, 33, 0.08)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 6px 16px ${FPT.orange}40`,
              flexShrink: 0,
            }}
          >
            <TrophyOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Đề thi Vòng Chung kết
              </Title>
              <Tag color="orange" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ⏳ CHƯA KÍCH HOẠT VÒNG
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Vòng Chung kết chưa được kích hoạt bởi Ban Tổ Chức — đề thi chung sẽ được công bố ngay sau khi vòng thi bắt đầu!
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (waitingRelease) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(243, 112, 33, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, #FFF7F0 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(243, 112, 33, 0.4)' : '#FFBB96'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(243, 112, 33, 0.08)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 6px 16px ${FPT.orange}40`,
              flexShrink: 0,
            }}
          >
            <ClockCircleOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Đề thi Vòng Chung kết
              </Title>
              <Tag color="orange" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ⏳ CHỜ PHÁT ĐỀ
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Vòng Chung kết đã chính thức mở. Ban tổ chức sẽ phát đề chung cho toàn bộ các đội tiến vào vòng này — vui lòng chờ thông báo!
            </Text>
          </div>
        </div>
      </Card>
    );
  }

  if (!problem?.released) {
    return null;
  }

  return (
    <Card
      style={{
        borderRadius: 20,
        background: isDark
          ? 'linear-gradient(135deg, rgba(243, 112, 33, 0.2) 0%, rgba(30, 41, 59, 0.95) 100%)'
          : 'linear-gradient(135deg, #FFF7F0 0%, #FFFFFF 100%)',
        border: `2px solid ${isDark ? 'rgba(243, 112, 33, 0.4)' : '#FFBB96'}`,
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(243, 112, 33, 0.08)',
        overflow: 'hidden',
      }}
      styles={{ body: { padding: '24px 28px' } }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, minWidth: 0 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 6px 16px ${FPT.orange}40`,
              flexShrink: 0,
            }}
          >
            <FilePdfOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Đề thi Vòng Chung kết
              </Title>
              <Tag color="orange" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ✔ ĐÃ CÔNG BỐ
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 13, display: 'block' }}>
              {roundName}
              {problem.problemFilename && ` · File: ${problem.problemFilename}`}
            </Text>
          </div>
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={handleDownload}
          style={{
            height: 44,
            padding: '0 24px',
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            background: `linear-gradient(135deg, ${FPT.orange} 0%, ${FPT.orangeLight} 100%)`,
            boxShadow: `0 4px 12px ${FPT.orange}35`,
            border: 0,
          }}
        >
          Xem / Tải Đề Bài PDF
        </Button>
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 18, borderRadius: 12, border: isDark ? '1px solid rgba(255,255,255,0.1)' : undefined }}
        message="Lưu ý về Đề bài Chung kết"
        description="Tất cả các đội tuyển lọt vào Vòng Chung kết (Final Round) sẽ nhận cùng một đề bài chuyên sâu từ Ban Tổ Chức."
      />
    </Card>
  );
};

export default FinalRoundProblemPanel;
