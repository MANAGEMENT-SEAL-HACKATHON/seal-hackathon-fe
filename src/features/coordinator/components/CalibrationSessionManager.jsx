import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, List, Select, Space, Spin, Tag, Typography } from 'antd';
import { calibrationService } from '../../judging/services/calibrationService';
import axiosClient from '../../../shared/api/axiosClient';
import toast from 'react-hot-toast';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

const { Title, Text } = Typography;
const parseList = (res) => (Array.isArray(res) ? res : res?.items || res?.data || []);

const submissionTrackId = (sub) =>
  sub?.trackId ?? sub?.track_id ?? sub?.track?.id ?? null;

/**
 * Shared calibration CRUD for prelim (GĐ3, per-track) and final (GĐ5, trackId omitted).
 */
const CalibrationSessionManager = ({
  roundId,
  trackId = null,
  roundLabel = 'vòng thi',
  enabled = true,
}) => {
  const [sessions, setSessions] = useState([]);
  const [sampleSubmissions, setSampleSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    if (!roundId || !enabled) return;
    setLoading(true);
    try {
      const [sessionData, submissionRes] = await Promise.all([
        calibrationService.listByRound(roundId, trackId),
        axiosClient.get('/api/v1/submissions', { params: { roundId } }).catch(() => []),
      ]);
      setSessions(parseList(sessionData));
      let samples = parseList(submissionRes);
      if (trackId != null) {
        samples = samples.filter((sub) => String(submissionTrackId(sub)) === String(trackId));
      }
      setSampleSubmissions(samples);
    } catch {
      setSessions([]);
      setSampleSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roundId, trackId, enabled]);

  const handleCreate = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        roundId,
        sampleSubmissionId: values.sampleSubmissionId,
        targetScore: values.targetScore,
        instructions: values.instructions,
      };
      if (trackId != null) {
        payload.trackId = trackId;
      }
      await calibrationService.create(payload);
      toast.success('Đã tạo phiên Calibration.');
      form.resetFields();
      await loadData();
    } catch (err) {
      toast.error(resolveUserError(err, { fallback: 'Không thể tạo phiên Calibration.' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async (sessionId) => {
    try {
      await calibrationService.update(sessionId, { status: 'CLOSED' });
      toast.success('Đã đóng phiên Calibration.');
      await loadData();
    } catch (err) {
      toast.error(resolveUserError(err, { fallback: 'Không thể đóng phiên.' }));
    }
  };

  if (!enabled || !roundId) return null;

  return (
    <Card size="small" title={`Phiên Calibration — ${roundLabel}`} style={{ marginTop: 16 }}>
      {loading ? (
        <Spin />
      ) : (
        <>
          <Form form={form} layout="vertical" onFinish={handleCreate}>
            <Form.Item name="sampleSubmissionId" label="Bài nộp mẫu" rules={[{ required: true }]}>
              <Select
                placeholder="Chọn submission mẫu"
                options={sampleSubmissions.map((sub) => ({
                  value: sub.id ?? sub.submissionId,
                  label: `#${sub.id ?? sub.submissionId} — ${sub.teamName || sub.team_name || 'Đội'}`,
                }))}
              />
            </Form.Item>
            <Form.Item name="targetScore" label="Điểm mục tiêu" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} />
            </Form.Item>
            <Form.Item name="instructions" label="Hướng dẫn">
              <Input.TextArea rows={2} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting}>
              Tạo phiên
            </Button>
          </Form>
          <Title level={5} style={{ marginTop: 16 }}>Phiên hiện có</Title>
          {sessions.length === 0 ? (
            <Text type="secondary">Chưa có phiên calibration.</Text>
          ) : (
            <List
              size="small"
              dataSource={sessions}
              renderItem={(session) => {
                const status = String(session.status || 'OPEN').toUpperCase();
                const isOpen = status === 'OPEN' || status === 'ACTIVE';
                const trackLabel = session.trackName || session.track_name;
                return (
                  <List.Item
                    actions={isOpen ? [<Button key="c" size="small" onClick={() => handleClose(session.id)}>Đóng</Button>] : []}
                  >
                    <Space>
                      <Text>Mẫu #{session.sampleSubmissionId || session.sample_submission_id}</Text>
                      {trackLabel ? <Tag>{trackLabel}</Tag> : null}
                      <Tag color={isOpen ? 'success' : 'default'}>{status}</Tag>
                    </Space>
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}
    </Card>
  );
};

export default CalibrationSessionManager;
