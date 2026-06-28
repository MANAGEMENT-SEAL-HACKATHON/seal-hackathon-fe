// src/features/judging/components/CalibrationSessionsPanel.jsx
import { useEffect, useState } from 'react';
import { Card, List, Spin, Tag, Typography, Button } from 'antd';
import { FundViewOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { calibrationService } from '../services/calibrationService';
import { ROUTES } from '../../../shared/constants/routes';

const { Text } = Typography;

const CalibrationSessionsPanel = ({ roundId, isFinal, assignmentId, trackId, forJudge = true }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!roundId || !isFinal) {
      setSessions([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const loader = forJudge ? calibrationService.listForJudge : calibrationService.listByRound;

    loader(roundId)
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        setSessions(items);
      })
      .catch((error) => {
        if (!cancelled) {
          setSessions([]);
          setLoadError(error?.message || 'Không thể tải phiên calibration.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roundId, isFinal]);

  if (!isFinal) return null;

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FundViewOutlined style={{ color: '#6366f1' }} />
          Phiên Calibration (GĐ5)
        </span>
      }
      style={{ borderRadius: 16 }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 16 }}>
          <Spin />
        </div>
      ) : sessions.length === 0 ? (
        <Text type="secondary">
          {loadError
            ? loadError
            : 'Chưa có phiên calibration cho vòng Chung kết.'}
        </Text>
      ) : (
        <List
          size="small"
          dataSource={sessions}
          renderItem={(session) => {
            const status = String(session.status || session.sessionStatus || 'OPEN').toUpperCase();
            const isOpen = status === 'OPEN' || status === 'ACTIVE';
            return (
              <List.Item
                actions={
                  isOpen
                    ? [
                        <Button
                          key="score"
                          type="link"
                          size="small"
                          onClick={() =>
                            navigate(
                              ROUTES.JUDGE_SCORING.replace(
                                ':assignmentId',
                                String(assignmentId || 'calibration')
                              ),
                              {
                                state: {
                                  roundId,
                                  trackId,
                                  isFinal: true,
                                  isCalibration: true,
                                  calibrationSessionId: session.id,
                                  sampleSubmissionId:
                                    session.sampleSubmissionId || session.sample_submission_id,
                                },
                              }
                            )
                          }
                        >
                          Chấm calibration
                        </Button>,
                      ]
                    : []
                }
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                  <Text>
                    Mẫu bài #{session.sampleSubmissionId || session.sample_submission_id || session.id}
                  </Text>
                  <Tag color={isOpen ? 'success' : 'default'}>{status}</Tag>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </Card>
  );
};

export default CalibrationSessionsPanel;
