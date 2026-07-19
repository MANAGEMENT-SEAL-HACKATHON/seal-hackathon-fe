// src/features/presentation/components/PresentationReadinessPanel.tsx
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Alert, Button, Space, Spin, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { personBApi, RoundSubmissionItem } from '../../../api/personB.api';
import { ROUTES } from '../../../shared/constants/routes';
import {
  countGradableSubmissions,
  getSubmissionStatusMeta,
} from '../utils/presentationSubmissionUtils';
import toast from 'react-hot-toast';

const { Text } = Typography;

interface EligibleTeamItem {
  teamId: number;
  teamName: string;
  gradable: boolean;
  submissionStatus?: string | null;
  submissionId?: number | null;
}

interface PresentationReadinessPanelProps {
  roundId: number | null;
  hackathonId?: number | null;
  trackId?: number | null;
  trackName?: string;
  canReviewLate?: boolean;
  isFinalRound?: boolean;
  latePolicy?: string | null;
  windowClosed?: boolean;
  eligibleTeams?: EligibleTeamItem[];
  participatingCount?: number;
  gradableCount?: number;
  onReviewSuccess?: () => void;
}

const PresentationReadinessPanel: React.FC<PresentationReadinessPanelProps> = ({
  roundId,
  hackathonId,
  trackId,
  trackName,
  canReviewLate = false,
  isFinalRound = false,
  latePolicy = null,
  windowClosed = false,
  eligibleTeams = [],
  participatingCount,
  gradableCount: gradableCountProp,
  onReviewSuccess,
}) => {
  const showPanel = canReviewLate || isFinalRound;
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const statusOpts = {
    latePolicy: latePolicy || (isFinalRound ? 'HARD_LOCK' : 'ALLOW_LATE_PENDING'),
    windowClosed: Boolean(windowClosed || isFinalRound),
    isFinal: Boolean(isFinalRound),
  };

  const { data: submissions = [], isLoading, refetch } = useQuery<RoundSubmissionItem[]>({
    queryKey: ['roundSubmissions', roundId],
    queryFn: () => personBApi.getRoundSubmissions(roundId!),
    enabled: roundId != null && showPanel && !isFinalRound,
  });

  const scopedSubmissions = useMemo(() => {
    if (!trackId) return submissions;
    return submissions.filter((s) => s.track_id === trackId);
  }, [submissions, trackId]);

  const useEligibleRoster = isFinalRound || eligibleTeams.length > 0;

  const gradableCount = useEligibleRoster
    ? (gradableCountProp ?? eligibleTeams.filter((t) => t.gradable).length)
    : countGradableSubmissions(scopedSubmissions);
  const totalParticipating = useEligibleRoster
    ? (participatingCount ?? eligibleTeams.length)
    : scopedSubmissions.length;
  const pendingLate = useEligibleRoster
    ? eligibleTeams.filter((t) => String(t.submissionStatus || '').toUpperCase() === 'LATE_PENDING')
    : scopedSubmissions.filter((s) => s.status === 'LATE_PENDING');

  const submissionIdByTeam = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of scopedSubmissions) {
      const tid = Number(s.team_id);
      if (Number.isFinite(tid) && s.id != null) map.set(tid, s.id);
    }
    return map;
  }, [scopedSubmissions]);

  const rosterBuckets = useMemo(() => {
    const b = {
      onTime: 0,
      notSubmitted: 0,
      lateRejected: 0,
      latePending: 0,
      lateApproved: 0,
      disqualified: 0,
    };
    for (const team of eligibleTeams) {
      const n =
        team.submissionStatus == null || team.submissionStatus === ''
          ? 'NONE'
          : String(team.submissionStatus).toUpperCase();
      if (n === 'SUBMITTED' || n === 'ACCEPTED') b.onTime += 1;
      else if (n === 'LATE_PENDING') b.latePending += 1;
      else if (n === 'LATE_APPROVED') b.lateApproved += 1;
      else if (n === 'REJECTED') b.lateRejected += 1;
      else if (n === 'DISQUALIFIED') b.disqualified += 1;
      else b.notSubmitted += 1;
      // Surface invariant violations for HARD_LOCK + LATE_*
      getSubmissionStatusMeta(team.submissionStatus ?? null, statusOpts);
    }
    return b;
  }, [eligibleTeams, latePolicy, windowClosed, isFinalRound]);

  const approveMutation = useMutation({
    mutationFn: (submissionId: number) =>
      personBApi.reviewLateSubmission(submissionId, { decision: 'APPROVE' }),
    onSuccess: async () => {
      toast.success('Đã duyệt bài nộp trễ — đội sẽ vào hàng đợi khi xáo trộn.');
      await refetch();
      onReviewSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể duyệt bài nộp trễ.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: number; reason: string }) =>
      personBApi.reviewLateSubmission(submissionId, { decision: 'REJECT', note: reason }),
    onSuccess: async () => {
      toast.success('Đã từ chối bài nộp trễ.');
      setRejectingId(null);
      await refetch();
      onReviewSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể từ chối bài nộp trễ.');
    },
  });

  if (!showPanel || !roundId) return null;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        <div>
          <Text strong style={{ fontSize: '14px', display: 'block' }}>
            {isFinalRound
              ? 'Đội tham gia Chung kết'
              : `Tình trạng bài nộp${trackName ? ` — ${trackName}` : ''}`}
          </Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {isFinalRound
              ? 'Vòng Chung kết khóa cứng thời hạn — chỉ đội nộp đúng hạn mới vào hàng đợi khi bốc thăm.'
              : (
                <>
                  Chỉ bài <Text strong>đúng hạn / đã duyệt trễ</Text> mới vào hàng đợi khi xáo trộn.
                </>
              )}
          </Text>
        </div>
        {!isFinalRound && (
          <Link
            to={`${ROUTES.COORDINATOR_LATE_SUBMISSIONS}?roundId=${roundId}${trackId ? `&trackId=${trackId}` : ''}${hackathonId ? `&hackathonId=${hackathonId}` : ''}`}
            style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            Màn duyệt trễ →
          </Link>
        )}
      </div>

      {isLoading && !useEligibleRoster ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Spin size="small" />
        </div>
      ) : isFinalRound && eligibleTeams.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có đội vào vòng Chung kết"
          description="Cần chốt danh sách ADVANCED từ vòng Sơ loại trước."
        />
      ) : useEligibleRoster ? (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Tag color="green">Vào queue: {isFinalRound ? rosterBuckets.onTime : gradableCount}</Tag>
            <Tag color="default">
              {isFinalRound ? `Tổng đội CK: ${totalParticipating}` : `Tổng đội: ${totalParticipating}`}
            </Tag>
            {rosterBuckets.notSubmitted > 0 && (
              <Tag color="default">Chưa nộp: {rosterBuckets.notSubmitted}</Tag>
            )}
            {rosterBuckets.lateRejected > 0 && (
              <Tag color="error">Trễ từ chối: {rosterBuckets.lateRejected}</Tag>
            )}
            {rosterBuckets.latePending > 0 && (
              <Tag color="orange">Trễ chờ duyệt: {rosterBuckets.latePending}</Tag>
            )}
            {rosterBuckets.lateApproved > 0 && (
              <Tag color="purple">Trễ đã duyệt: {rosterBuckets.lateApproved}</Tag>
            )}
          </div>

          {isFinalRound && rosterBuckets.onTime < totalParticipating && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: '12px' }}
              message="Chỉ đội nộp đúng hạn mới vào hàng đợi khi bốc thăm (chung kết khóa cứng thời hạn)"
              description="Đội chưa nộp hoặc bị từ chối sẽ không vào hàng đợi. Bài nộp trễ (kể cả đã duyệt) không tự vào hàng đợi."
            />
          )}

          {!isFinalRound && gradableCount < totalParticipating && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: '12px' }}
              message={`${totalParticipating - gradableCount} đội chưa đủ điều kiện xáo trộn`}
              description="Duyệt bài nộp trễ đang chờ duyệt hoặc yêu cầu đội nộp trước khi xáo trộn."
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eligibleTeams.map((team) => {
              const meta = getSubmissionStatusMeta(team.submissionStatus ?? null, statusOpts);
              const statusUpper = String(team.submissionStatus || '').toUpperCase();
              const isPending = statusUpper === 'LATE_PENDING';
              const submissionId =
                team.submissionId != null
                  ? Number(team.submissionId)
                  : (submissionIdByTeam.get(Number(team.teamId)) ?? null);
              return (
                <div
                  key={team.teamId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                    padding: '10px 12px',
                    border: '1px solid #F3F4F6',
                    borderRadius: '8px',
                    background: team.gradable ? '#F0FDF4' : '#FFFBEB',
                  }}
                >
                  <div style={{ flex: '1 1 120px', minWidth: 0 }}>
                    <Text strong style={{ fontSize: '13px', display: 'block' }}>
                      {team.teamName}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Đội #{team.teamId}
                      {submissionId != null ? ` · #${submissionId}` : ''}
                    </Text>
                  </div>
                  <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
                  <Tag color={team.gradable ? 'success' : 'default'} style={{ margin: 0 }}>
                    {team.gradable ? '✓ Queue' : '✗ Queue'}
                  </Tag>
                  {isPending && canReviewLate && !isFinalRound && submissionId != null && (
                    <Space size={4} wrap>
                      <Button
                        type="primary"
                        size="small"
                        loading={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(submissionId)}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="small"
                        danger
                        loading={rejectMutation.isPending && rejectingId === submissionId}
                        onClick={() => {
                          const reason = window.prompt('Lý do từ chối (bắt buộc):');
                          if (!reason?.trim()) return;
                          setRejectingId(submissionId);
                          rejectMutation.mutate({ submissionId, reason: reason.trim() });
                        }}
                      >
                        Từ chối
                      </Button>
                    </Space>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : scopedSubmissions.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message="Chưa có bài nộp nào trên track này"
          description="Đội chưa nộp sẽ không xuất hiện khi xáo trộn."
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Tag color="green">Vào queue: {gradableCount}</Tag>
            <Tag color="default">Tổng bài: {scopedSubmissions.length}</Tag>
            {pendingLate.length > 0 && (
              <Tag color="orange">Chờ duyệt trễ: {pendingLate.length}</Tag>
            )}
          </div>

          {gradableCount < scopedSubmissions.length && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: '12px' }}
              message={`${scopedSubmissions.length - gradableCount} bài chưa đủ điều kiện xáo trộn`}
              description="Duyệt bài nộp trễ đang chờ duyệt hoặc yêu cầu đội nộp lại trước khi xáo trộn."
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scopedSubmissions.map((sub) => {
              const meta = getSubmissionStatusMeta(sub.status, statusOpts);
              const isPending = sub.status === 'LATE_PENDING';
              return (
                <div
                  key={sub.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: '1px solid #F3F4F6',
                    borderRadius: '8px',
                    background: meta.gradable ? '#F0FDF4' : '#FFFBEB',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: '13px', display: 'block' }}>
                      {sub.team_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      #{sub.id}
                      {sub.track_name ? ` · ${sub.track_name}` : ''}
                    </Text>
                  </div>
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <Tag color={meta.gradable ? 'success' : 'default'}>
                    {meta.gradable ? '✓ Queue' : '✗ Queue'}
                  </Tag>
                  {isPending && canReviewLate && (
                    <Space size={4}>
                      <Button
                        type="primary"
                        size="small"
                        loading={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(sub.id)}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="small"
                        danger
                        loading={rejectMutation.isPending && rejectingId === sub.id}
                        onClick={() => {
                          const reason = window.prompt('Lý do từ chối (bắt buộc):');
                          if (!reason?.trim()) return;
                          setRejectingId(sub.id);
                          rejectMutation.mutate({ submissionId: sub.id, reason: reason.trim() });
                        }}
                      >
                        Từ chối
                      </Button>
                    </Space>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default PresentationReadinessPanel;
