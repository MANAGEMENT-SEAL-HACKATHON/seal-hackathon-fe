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
import { getEligibleTeamStatusLabel } from '../utils/presentationQueueUtils';
import toast from 'react-hot-toast';

const { Text } = Typography;

interface EligibleTeamItem {
  teamId: number;
  teamName: string;
  gradable: boolean;
  submissionStatus?: string | null;
}

interface PresentationReadinessPanelProps {
  roundId: number | null;
  trackId?: number | null;
  trackName?: string;
  canReviewLate?: boolean;
  isFinalRound?: boolean;
  eligibleTeams?: EligibleTeamItem[];
  participatingCount?: number;
  gradableCount?: number;
  onReviewSuccess?: () => void;
}

const PresentationReadinessPanel: React.FC<PresentationReadinessPanelProps> = ({
  roundId,
  trackId,
  trackName,
  canReviewLate = false,
  isFinalRound = false,
  eligibleTeams = [],
  participatingCount,
  gradableCount: gradableCountProp,
  onReviewSuccess,
}) => {
  const showPanel = canReviewLate || isFinalRound;
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  const { data: submissions = [], isLoading, refetch } = useQuery<RoundSubmissionItem[]>({
    queryKey: ['roundSubmissions', roundId],
    queryFn: () => personBApi.getRoundSubmissions(roundId!),
    enabled: roundId != null && showPanel && !isFinalRound,
  });

  const scopedSubmissions = useMemo(() => {
    if (!trackId) return submissions;
    return submissions.filter((s) => s.track_id === trackId);
  }, [submissions, trackId]);

  const gradableCount = isFinalRound
    ? (gradableCountProp ?? eligibleTeams.filter((t) => t.gradable).length)
    : countGradableSubmissions(scopedSubmissions);
  const totalParticipating = isFinalRound
    ? (participatingCount ?? eligibleTeams.length)
    : scopedSubmissions.length;
  const pendingLate = scopedSubmissions.filter((s) => s.status === 'LATE_PENDING');

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
              ? 'Chỉ đội đã nộp bài đúng hạn (HARD_LOCK) mới vào hàng đợi khi bốc thăm.'
              : (
                <>
                  Chỉ bài <Text strong>đúng hạn / đã duyệt trễ</Text> mới vào hàng đợi khi xáo trộn.
                </>
              )}
          </Text>
        </div>
        {!isFinalRound && (
          <Link to={ROUTES.COORDINATOR_LATE_SUBMISSIONS} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
            Màn duyệt trễ →
          </Link>
        )}
      </div>

      {isLoading && !isFinalRound ? (
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
      ) : isFinalRound ? (
        <>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Tag color="green">Sẵn sàng: {gradableCount}/{totalParticipating}</Tag>
            <Tag color="default">Tổng đội CK: {totalParticipating}</Tag>
            {totalParticipating > gradableCount && (
              <Tag color="orange">Chưa nộp: {totalParticipating - gradableCount}</Tag>
            )}
          </div>

          {gradableCount < totalParticipating && (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: '12px' }}
              message={`${totalParticipating - gradableCount} đội chưa nộp bài Chung kết`}
              description="Chỉ đội đã nộp đúng hạn mới vào hàng đợi khi bốc thăm (HARD_LOCK)."
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eligibleTeams.map((team) => {
              const meta = getEligibleTeamStatusLabel(team);
              return (
                <div
                  key={team.teamId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    border: '1px solid #F3F4F6',
                    borderRadius: '8px',
                    background: team.gradable ? '#F0FDF4' : '#FFFBEB',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: '13px', display: 'block' }}>
                      {team.teamName}
                    </Text>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Đội #{team.teamId}
                    </Text>
                  </div>
                  <Tag color={meta.color}>{meta.label}</Tag>
                  <Tag color={team.gradable ? 'success' : 'default'}>
                    {team.gradable ? '✓ Queue' : '✗ Queue'}
                  </Tag>
                </div>
              );
            })}
          </div>
        </>
      ) : scopedSubmissions.length === 0 ? (
        <Alert
          type="info"
          showIcon
          message={isFinalRound ? 'Chưa có bài nộp Chung kết' : 'Chưa có bài nộp nào trên track này'}
          description={
            isFinalRound
              ? 'Đội đã vào vòng CK nhưng chưa nộp bài sẽ không có trong hàng đợi.'
              : 'Đội chưa nộp sẽ không xuất hiện khi xáo trộn.'
          }
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
              description={
                isFinalRound
                  ? 'Vòng CK không duyệt nộp trễ — yêu cầu đội nộp đúng hạn trước khi bốc thăm.'
                  : 'Duyệt bài nộp trễ (LATE_PENDING) hoặc yêu cầu đội nộp lại trước khi xáo trộn.'
              }
            />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {scopedSubmissions.map((sub) => {
              const meta = getSubmissionStatusMeta(sub.status);
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
                  {isPending && canReviewLate && !isFinalRound && (
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
