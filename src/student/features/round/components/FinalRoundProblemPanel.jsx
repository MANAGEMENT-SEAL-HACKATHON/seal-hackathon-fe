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
  const [loading, setLoading] = useState(Boolean(teamId && hackathonId));
  const [roundId, setRoundId] = useState(null);
  const [roundName, setRoundName] = useState('');
  const [problem, setProblem] = useState(null);
  const [waitingRelease, setWaitingRelease] = useState(false);
  const [notEligible, setNotEligible] = useState(false);
  const [notActive, setNotActive] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadProblem = useCallback(async () => {
    if (!teamId || !hackathonId) {
      setLoading(false);
      setNotEligible(false);
      setUnavailable(false);
      setProblem(null);
      return;
    }

    setLoading(true);
    setWaitingRelease(false);
    setNotEligible(false);
    setNotActive(false);
    setUnavailable(false);
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
      if (data && data.available === false) {
        setUnavailable(true);
        setProblem(data);
        return;
      }
      setProblem(data);
    } catch (error) {
      if (error?.status === 403) {
        setNotEligible(true);
      } else if (error?.status === 404 || error?.status === 422) {
        setUnavailable(true);
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
      message.error(error?.message || 'Không tìm thấy đề — liên hệ Coordinator.');
    } finally {
      setDownloading(false);
    }
  };

  const trackLabel = problem?.trackName || problem?.track_name;

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

  if (unavailable) {
    return (
      <Card
        style={{
          borderRadius: 20,
          background: isDark
            ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.12) 0%, rgba(30, 41, 59, 0.9) 100%)'
            : 'linear-gradient(135deg, #FFF1F0 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(248, 113, 113, 0.4)' : '#FFA39E'}`,
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(220, 38, 38, 0.06)',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
          Đề thi Vòng Chung kết
        </Title>
        <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block', marginTop: 8 }}>
          Không tìm thấy đề — liên hệ Coordinator
          {trackLabel ? ` (bảng sơ loại: ${trackLabel})` : ''}.
        </Text>
      </Card>
    );
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
              Vòng Chung kết chưa được kích hoạt — khi mở vòng, đội bạn tiếp tục đề theo bảng sơ loại của mình.
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
                ⏳ CHỜ MỞ ĐỀ
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Đề sẽ mở theo bảng sơ loại của đội bạn sau khi Ban tổ chức kích hoạt vòng Chung kết.
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
                {trackLabel
                  ? `Đề thi Chung kết (Kế thừa từ Track: ${trackLabel})`
                  : 'Đề thi Chung kết'}
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
        description={
          trackLabel
            ? `Đội bạn tiếp tục đề bài bảng «${trackLabel}» từ vòng sơ loại — phát triển dự án, không có đề PDF mới chung cho cả vòng.`
            : 'Mỗi đội Chung kết tiếp tục đề theo bảng sơ loại của mình — không có đề PDF mới chung cho cả vòng.'
        }
      />
    </Card>
  );
};

export default FinalRoundProblemPanel;
