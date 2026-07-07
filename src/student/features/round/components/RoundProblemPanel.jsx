import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Spin, Typography, message, Tag, theme } from 'antd';
import { FilePdfOutlined, DownloadOutlined, ClockCircleOutlined, ThunderboltFilled } from '@ant-design/icons';
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

const RoundProblemPanel = ({ team, hackathonId }) => {
  const { token } = theme.useToken();
  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';
  const [loading, setLoading] = useState(true);
  const [roundId, setRoundId] = useState(null);
  const [problem, setProblem] = useState(null);
  const [waitingRelease, setWaitingRelease] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadProblem = useCallback(async () => {
    if (!team?.id || !team?.trackId || team?.status !== 'ACTIVE') {
      setLoading(false);
      setProblem(null);
      return;
    }

    setLoading(true);
    setWaitingRelease(false);
    try {
      const deadline = await studentRoundService.getCurrentDeadline(
        hackathonId || team?.hackathonId,
      );
      const activeRoundId = deadline?.roundId;
      setRoundId(activeRoundId);

      if (!activeRoundId) {
        setProblem(null);
        return;
      }

      if (!deadline?.problemReleased) {
        setWaitingRelease(true);
        setProblem(null);
        return;
      }

      const data = await studentRoundService.getProblem(activeRoundId);
      setProblem(data);
    } catch (error) {
      setProblem(null);
      if (error?.status === 404) {
        setWaitingRelease(true);
      }
    } finally {
      setLoading(false);
    }
  }, [team?.id, team?.trackId, team?.status, team?.hackathonId, hackathonId]);

  useEffect(() => {
    loadProblem();
  }, [loadProblem]);

  const handleDownload = async () => {
    if (!roundId) return;
    setDownloading(true);
    try {
      const blob = await studentRoundService.downloadProblemStatement(roundId);
      openPdfBlob(blob, problem?.problemFilename || 'de-bai.pdf');
    } catch (error) {
      message.error(error?.message || 'Không tải được đề bài.');
    } finally {
      setDownloading(false);
    }
  };

  if (!team?.trackId || team?.status !== 'ACTIVE') {
    return null;
  }

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
        <Spin tip="Đang kiểm tra đề bài Sơ loại..." size="large" />
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
            : 'linear-gradient(135deg, #FFF8F0 0%, #FFFFFF 100%)',
          border: `2px solid ${isDark ? 'rgba(243, 112, 33, 0.4)' : '#FF8C42'}`,
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
              background: `linear-gradient(135deg, ${FPT.orange} 0%, #FF8C42 100%)`,
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
                Đề thi Vòng Sơ loại
              </Title>
              <Tag color="orange" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ⏳ CHỜ PHÁT ĐỀ
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.5, display: 'block' }}>
              Vòng thi đã kích hoạt. Ban tổ chức sẽ phát đề thi chính thức cho bảng đấu{' '}
              <strong style={{ color: FPT.orange, fontWeight: 700 }}>{team.trackName || 'của bạn'}</strong> — vui lòng theo dõi thông báo và quay lại sau!
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
          ? 'linear-gradient(135deg, rgba(0, 82, 156, 0.2) 0%, rgba(30, 41, 59, 0.95) 100%)'
          : 'linear-gradient(135deg, #F0F7FF 0%, #FFFFFF 100%)',
        border: `2px solid ${isDark ? 'rgba(96, 165, 250, 0.4)' : '#1E73BE'}`,
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0, 82, 156, 0.08)',
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
              background: `linear-gradient(135deg, ${FPT.blue} 0%, #1E73BE 100%)`,
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              boxShadow: `0 6px 16px ${FPT.blue}40`,
              flexShrink: 0,
            }}
          >
            <FilePdfOutlined style={{ fontSize: 26 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0, color: token.colorTextHeading, fontWeight: 800 }}>
                Đề thi Vòng Sơ loại
              </Title>
              <Tag color="blue" style={{ borderRadius: 6, fontWeight: 700, fontSize: 11, border: 0, margin: 0 }}>
                ✔ ĐÃ CÔNG BỐ
              </Tag>
            </div>
            <Text style={{ color: token.colorTextSecondary, fontSize: 13, display: 'block' }}>
              Bảng đấu: <strong style={{ color: token.colorTextHeading }}>{team.trackName || '—'}</strong>
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
            background: `linear-gradient(135deg, ${FPT.blue} 0%, #1E73BE 100%)`,
            boxShadow: `0 4px 12px ${FPT.blue}35`,
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
        message="Lưu ý về Đề bài theo Bảng đấu"
        description="Mỗi bảng đấu (Track) có đề bài chuyên biệt — đội bạn chỉ xem được đề thi chính thức của bảng đã được phân công qua hệ thống quay số (Lottery)."
      />
    </Card>
  );
};

export default RoundProblemPanel;
