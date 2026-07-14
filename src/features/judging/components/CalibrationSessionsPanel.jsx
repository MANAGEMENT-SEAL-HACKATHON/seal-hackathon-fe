// src/features/judging/components/CalibrationSessionsPanel.jsx
import { useEffect, useState } from 'react';
import { Card, List, Spin, Tag, Typography, Button } from 'antd';
import { FundViewOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { calibrationService } from '../services/calibrationService';
import { ROUTES } from '../../../shared/constants/routes';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

const { Text } = Typography;

const CalibrationSessionsPanel = ({
  roundId,
  isFinal,
  assignmentId,
  trackId,
  trackLabel,
  forJudge = true,
}) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!roundId) {
      setSessions([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const loader = forJudge ? calibrationService.listForJudge : calibrationService.listByRound;
    const listTrackId = isFinal ? null : trackId;

    loader(roundId, listTrackId)
      .then((data) => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        setSessions(items);
      })
      .catch((error) => {
        if (!cancelled) {
          setSessions([]);
          setLoadError(
            resolveUserError(error, { fallback: 'Không thể tải phiên Calibration.' }),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roundId, trackId, isFinal, forJudge]);

  if (!roundId) return null;

  const titleSuffix =
    trackLabel ||
    sessions.find((s) => s.trackName || s.track_name)?.trackName ||
    sessions.find((s) => s.trackName || s.track_name)?.track_name;

  return (
    <Card
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FundViewOutlined style={{ color: '#6366f1' }} />
          {titleSuffix ? `Phiên Calibration — ${titleSuffix}` : 'Phiên Calibration'}
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
          {loadError ? loadError : 'Chưa có phiên Calibration cho vòng thi này.'}
        </Text>
      ) : (
        <List
          size="small"
          dataSource={sessions}
          renderItem={(session) => {
            const status = String(session.status || session.sessionStatus || 'OPEN').toUpperCase();
            const isOpen = status === 'OPEN' || status === 'ACTIVE';
            const sessionTrack =
              session.trackName || session.track_name || trackLabel;
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
                                String(assignmentId || 'calibration'),
                              ),
                              {
                                state: {
                                  roundId,
                                  trackId: trackId ?? session.trackId ?? session.track_id,
                                  isFinal: Boolean(isFinal),
                                  isCalibration: true,
                                  calibrationSessionId: session.id,
                                  sampleSubmissionId:
                                    session.sampleSubmissionId || session.sample_submission_id,
                                },
                              },
                            )
                          }
                        >
                          Chấm Calibration
                        </Button>,
                      ]
                    : []
                }
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: 12 }}>
                  <Text>
                    Bài mẫu #{session.sampleSubmissionId || session.sample_submission_id || session.id}
                    {sessionTrack ? ` · ${sessionTrack}` : ''}
                  </Text>
                  <Tag color={isOpen ? 'success' : 'default'}>{status === 'OPEN' || status === 'ACTIVE' ? 'Đang mở' : 'Đã đóng'}</Tag>
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
