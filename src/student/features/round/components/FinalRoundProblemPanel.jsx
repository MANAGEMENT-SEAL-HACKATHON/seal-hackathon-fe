import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Spin, Typography, message } from 'antd';
import { FilePdfOutlined, DownloadOutlined } from '@ant-design/icons';
import { studentRoundService } from '../services/studentRound.service';

const { Title, Text } = Typography;

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
      <Card style={{ borderRadius: 16, textAlign: 'center', padding: '24px 0' }}>
        <Spin tip="Đang kiểm tra đề Chung kết..." />
      </Card>
    );
  }

  if (notEligible) {
    return null;
  }

  if (notActive) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #ffe58f', background: '#fffbe6' }}>
        <Title level={5} style={{ marginTop: 0, color: '#ad6800' }}>
          Đề bài Chung kết
        </Title>
        <Text style={{ color: '#ad6800' }}>
          Vòng Chung kết chưa kích hoạt — đề sẽ được phát sau khi Coordinator mở vòng.
        </Text>
      </Card>
    );
  }

  if (waitingRelease) {
    return (
      <Card style={{ borderRadius: 16, border: '1px solid #ffe58f', background: '#fffbe6' }}>
        <Title level={5} style={{ marginTop: 0, color: '#ad6800' }}>
          Đề bài Chung kết
        </Title>
        <Text style={{ color: '#ad6800' }}>
          Vòng Chung kết đã mở. Coordinator sẽ phát đề chung — vui lòng chờ thông báo.
        </Text>
      </Card>
    );
  }

  if (!problem?.released) {
    return null;
  }

  return (
    <Card
      style={{ borderRadius: 16, border: '1px solid #d3adf7', background: '#f9f0ff' }}
      styles={{ body: { padding: 24 } }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilePdfOutlined style={{ color: '#722ed1' }} />
            Đề bài Chung kết
          </Title>
          <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
            {roundName}
          </Text>
          {problem.problemFilename && (
            <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              File: {problem.problemFilename}
            </Text>
          )}
        </div>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          loading={downloading}
          onClick={handleDownload}
          style={{ borderRadius: 10, fontWeight: 600, background: '#722ed1' }}
        >
          Xem / Tải đề
        </Button>
      </div>
      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16, borderRadius: 8 }}
        message="Đề chung toàn vòng"
        description="Tất cả đội vào Chung kết nhận cùng một đề bài."
      />
    </Card>
  );
};

export default FinalRoundProblemPanel;
