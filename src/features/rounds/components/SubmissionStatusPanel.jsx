// src/features/rounds/components/SubmissionStatusPanel.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Card,
  Typography,
  Progress,
  List,
  Tag,
  Space,
  Button,
  Tooltip,
  Empty,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { StopCircle } from 'lucide-react';
import { personBApi } from '../../../api/personB.api';
import { teamService } from '../../teams/services/teamService';
import { buildSubmissionRoster } from '../utils/submissionRoster';
import {
  getSubmissionStatusMeta,
  countSubmissionBuckets,
} from '../../presentation/utils/presentationSubmissionUtils';
import {
  canCloseEarly,
  getCloseEarlyTooltip,
  getClosedEarlyAt,
  getProblemReleasedAt,
  getSubmissionDeadline,
  isSubmissionClosed,
} from '../utils/roundLifecycleGates';
import { useScoringProgressSocket } from '../../../shared/hooks/useScoringProgressSocket';

const { Text } = Typography;

const formatSubmittedAt = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
};

/**
 * Panel «Tình trạng nộp bài» — luôn hiển thị trên tab Vòng thi khi vòng active,
 * để Coord biết đội nào đã / chưa nộp và ra quyết định đóng sớm ngay tại chỗ.
 *
 * - Nhãn trạng thái BẮT BUỘC dùng getSubmissionStatusMeta (không tự chế tag).
 * - Realtime WS-first (useScoringProgressSocket); poll 30s chỉ là fallback khi WS rớt.
 * - CTA Kết thúc sớm gọi onRequestCloseEarly → mở đúng modal hiện có.
 */
const SubmissionStatusPanel = ({ round, hackathonId, onRequestCloseEarly, trackId = null }) => {
  const roundId = round?.id;
  const isFinal = Boolean(round?.is_final ?? round?.isFinal);
  const filterTrackId = trackId != null && trackId !== '' ? Number(trackId) : null;
  const latePolicy =
    round?.late_submission_policy ??
    round?.lateSubmissionPolicy ??
    (isFinal ? 'HARD_LOCK' : 'ALLOW_LATE_PENDING');

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const windowClosed = useMemo(() => isSubmissionClosed(round), [round]);
  const statusOpts = useMemo(
    () => ({ latePolicy, windowClosed, isFinal }),
    [latePolicy, windowClosed, isFinal],
  );

  const load = useCallback(async () => {
    if (!roundId || !hackathonId) return;
    setLoading(true);
    try {
      // TeamStatus enum = ACTIVE/PENDING/… — KHÔNG có ADVANCED (đó là participationStatus).
      // Gọi ?status=ADVANCED → 400 và làm trống roster CK.
      const [subsRes, teamsRes] = await Promise.all([
        personBApi.getRoundSubmissions(roundId),
        teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
      ]);
      const submissions = Array.isArray(subsRes) ? subsRes : [];
      let teams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || [];
      // CK: ưu tiên đội đã có bài nộp / tham gia vòng (tránh đếm cả đội bị loại còn ACTIVE)
      if (isFinal && submissions.length > 0) {
        const seen = new Set();
        const fromSubs = submissions
          .filter((s) => {
            const tid = Number(s.team_id ?? s.teamId);
            if (!Number.isFinite(tid) || seen.has(tid)) return false;
            seen.add(tid);
            return true;
          })
          .map((s) => ({
            id: s.team_id ?? s.teamId,
            teamName: s.team_name ?? s.teamName,
            trackId: s.track_id ?? s.trackId,
            trackName: s.track_name ?? s.trackName,
          }));
        if (fromSubs.length > 0) teams = fromSubs;
      }
      let roster = buildSubmissionRoster(teams, submissions);
      if (Number.isFinite(filterTrackId)) {
        roster = roster.filter((r) => Number(r.trackId) === filterTrackId);
      }
      setRows(roster);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [roundId, hackathonId, isFinal, filterTrackId]);

  // AR: reload roster khi mount VÀ khi round mutate (close-early / activate / release) —
  // các mốc này đổi trạng thái nộp bài mà không cần F5.
  const roundMutationSignal = [
    getClosedEarlyAt(round) ?? '',
    getSubmissionDeadline(round) ?? '',
    getProblemReleasedAt(round) ?? '',
  ].join('|');
  useEffect(() => {
    load();
  }, [load, roundMutationSignal]);

  // WS-first: reload khi có push scoring-progress / leaderboard-preview
  const { connected } = useScoringProgressSocket(roundId, load);

  // Fallback poll 30s CHỈ khi WS chưa kết nối và cửa sổ nộp còn mở
  const savedLoad = useRef(load);
  useEffect(() => {
    savedLoad.current = load;
  }, [load]);
  useEffect(() => {
    if (connected || windowClosed || !roundId) return undefined;
    const id = setInterval(() => savedLoad.current?.(), 30_000);
    return () => clearInterval(id);
  }, [connected, windowClosed, roundId]);

  const buckets = useMemo(
    () => countSubmissionBuckets(rows.map((r) => ({ submissionStatus: r.submissionStatus })), statusOpts),
    [rows, statusOpts],
  );
  const total = rows.length;
  const gradable = buckets.gradable;

  const closeEarlyOk = canCloseEarly(round);
  // Đồng bộ Round Management: chỉ hiện Close early SAU khi đã phát đề (tránh tooltip sai lý do).
  const hasReleased = Boolean(getProblemReleasedAt(round));

  return (
    <Card
      size="small"
      style={{ marginBottom: 16, borderRadius: 12 }}
      title={
        <Space>
          <Text strong>Tình trạng nộp bài</Text>
          {connected ? (
            <Tag color="green">Trực tiếp</Tag>
          ) : (
            <Tag color="default">Tự làm mới 30s</Tag>
          )}
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Làm mới">
            <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={load} />
          </Tooltip>
          {onRequestCloseEarly && hasReleased && !windowClosed && (
            <Tooltip title={getCloseEarlyTooltip(round)}>
              <Button
                size="small"
                danger
                icon={<StopCircle size={14} />}
                disabled={!closeEarlyOk}
                data-testid="submission-panel-close-early-btn"
                onClick={() => onRequestCloseEarly(round)}
              >
                Kết thúc thời gian thi sớm
              </Button>
            </Tooltip>
          )}
        </Space>
      }
    >
      <div style={{ marginBottom: 8 }}>
        <Text strong>
          Nộp hợp lệ (chấm được): {gradable}/{total} đội
        </Text>
        <Progress
          percent={total > 0 ? Math.round((gradable / total) * 100) : 0}
          status={total > 0 && gradable < total ? 'active' : 'success'}
          strokeColor="#22c55e"
          style={{ marginTop: 6 }}
        />
        <Space wrap size={[6, 4]} style={{ marginTop: 6 }}>
          {buckets.notSubmittedInWindow > 0 && (
            <Tag color="default">Chưa nộp: {buckets.notSubmittedInWindow}</Tag>
          )}
          {buckets.absentPastDeadline > 0 && (
            <Tag color="default">Hết hạn — không nộp: {buckets.absentPastDeadline}</Tag>
          )}
          {buckets.latePending > 0 && (
            <Tag color="orange">Nộp trễ — chờ duyệt: {buckets.latePending}</Tag>
          )}
          {buckets.rejected > 0 && <Tag color="red">Bị từ chối: {buckets.rejected}</Tag>}
          {buckets.disqualified > 0 && (
            <Tag color="volcano">Loại: {buckets.disqualified}</Tag>
          )}
          {buckets.invariantViolations > 0 && (
            <Tag color="magenta">Không hợp lệ: {buckets.invariantViolations}</Tag>
          )}
        </Space>
      </div>

      <div
        style={{
          maxHeight: 260,
          overflowY: 'auto',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(180px, 1fr) 170px 150px',
            gap: 12,
            padding: '8px 12px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
          }}
        >
          <Text strong>Đội thi</Text>
          <Text strong>Thời gian nộp</Text>
          <Text strong>Trạng thái</Text>
        </div>
        <List
          size="small"
          loading={loading}
          dataSource={rows}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có đội để đối chiếu (kích hoạt vòng + phát đề trước)"
              />
            ),
          }}
          renderItem={(item) => {
            const meta = getSubmissionStatusMeta(item.submissionStatus, statusOpts);
            return (
              <List.Item style={{ padding: '8px 12px' }}>
                <div
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px, 1fr) 170px 150px',
                    gap: 12,
                    alignItems: 'center',
                  }}
                >
                  <span>
                    <Text
                      style={{
                        color: meta.gradable ? undefined : '#b91c1c',
                        fontWeight: meta.gradable ? 400 : 600,
                      }}
                    >
                      {item.name}
                    </Text>
                    {item.trackName && (
                      <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                        {item.trackName}
                      </Text>
                    )}
                  </span>
                  <Text type="secondary">{formatSubmittedAt(item.submittedAt)}</Text>
                  <Tag color={meta.color}>{meta.label}</Tag>
                </div>
              </List.Item>
            );
          }}
        />
      </div>

      {isFinal && (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          Vòng Chung kết khóa cứng thời hạn — nộp sau hạn sẽ bị từ chối.
        </Text>
      )}
    </Card>
  );
};

export default SubmissionStatusPanel;
