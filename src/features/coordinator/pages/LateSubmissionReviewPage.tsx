import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Button, Modal, Input, Typography, Spin, Space, Tooltip, Alert } from 'antd';
import { CheckOutlined, CloseOutlined, GithubOutlined, FileTextOutlined, PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { personBApi, LateSubmission } from '../../../api/personB.api';
import { resolvePreliminarySubmissionError } from '../../submissions/constants/preliminarySubmissionErrors';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

const LateSubmissionReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const roundIdParam = searchParams.get('roundId');
  const trackIdParam = searchParams.get('trackId');
  const hackathonIdParam = searchParams.get('hackathonId');

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [openingSlideId, setOpeningSlideId] = useState<string | null>(null);

  const openSlideBlob = async (submissionId: string) => {
    setOpeningSlideId(submissionId);
    try {
      const blobData = (await personBApi.getSubmissionSlide(submissionId)) as unknown as BlobPart;
      const fileUrl = URL.createObjectURL(new Blob([blobData], { type: 'application/pdf' }));
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (err) {
      toast.error(resolvePreliminarySubmissionError(err as Error, 'Không thể mở slide PDF.').message);
    } finally {
      setOpeningSlideId(null);
    }
  };

  const { data: submissions = [], isLoading, error, refetch } = useQuery<LateSubmission[]>({
    queryKey: ['lateSubmissions', roundIdParam],
    queryFn: () => personBApi.getLateSubmissions(roundIdParam || undefined),
    retry: false,
  });

  const filteredSubmissions = useMemo(() => {
    if (!trackIdParam) return submissions;
    const tid = Number(trackIdParam);
    if (!Number.isFinite(tid)) return submissions;
    return submissions.filter((sub) => {
      const subTrack = sub.track_id ?? sub.trackId;
      return subTrack != null && Number(subTrack) === tid;
    });
  }, [submissions, trackIdParam]);

  const approveMutation = useMutation({
    mutationFn: (submissionId: string) =>
      personBApi.reviewLateSubmission(submissionId, { decision: 'APPROVE' }),
    onSuccess: (data: any, submissionId) => {
      const appendFailed = Boolean(data?.queueAppendFailed ?? data?.queue_append_failed);
      if (appendFailed) {
        toast.error(
          'Đã duyệt bài nộp muộn, nhưng chưa đưa được vào hàng đợi thuyết trình. Kiểm tra thông báo / thử lại append.',
          { duration: 8000 },
        );
      } else {
        toast.success('Duyệt bài nộp muộn thành công!');
      }
      queryClient.setQueryData<LateSubmission[]>(['lateSubmissions', roundIdParam], (old) =>
        (old || []).filter((sub) => sub.submission_id !== submissionId),
      );
      queryClient.invalidateQueries({ queryKey: ['navLatePendingCount'] });
    },
    onError: (err: Error) => {
      toast.error(resolvePreliminarySubmissionError(err, 'Không thể phê duyệt.').message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ submissionId, reason }: { submissionId: string; reason: string }) =>
      personBApi.reviewLateSubmission(submissionId, { decision: 'REJECT', note: reason }),
    onSuccess: (_, variables) => {
      toast.success('Từ chối bài nộp muộn thành công!');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedSubmissionId(null);
      queryClient.setQueryData<LateSubmission[]>(['lateSubmissions', roundIdParam], (old) =>
        (old || []).filter((sub) => sub.submission_id !== variables.submissionId),
      );
      queryClient.invalidateQueries({ queryKey: ['navLatePendingCount'] });
    },
    onError: (err: Error) => {
      toast.error(resolvePreliminarySubmissionError(err, 'Không thể từ chối.').message);
    },
  });

  const handleApprove = (submissionId: string) => {
    Modal.confirm({
      title: 'Xác nhận duyệt bài nộp muộn?',
      content: 'Đội sẽ được đưa vào hàng đợi thuyết trình sau khi duyệt.',
      okText: 'Duyệt',
      cancelText: 'Hủy',
      onOk: () => approveMutation.mutateAsync(submissionId),
    });
  };

  const handleOpenRejectModal = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedSubmissionId || !rejectReason.trim()) return;
    rejectMutation.mutate({ submissionId: selectedSubmissionId, reason: rejectReason.trim() });
  };

  const columns = [
    {
      title: 'Tên Đội Thi',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (text: string) => <span className="font-semibold">{text}</span>,
    },
    {
      title: 'Lý do nộp trễ',
      dataIndex: 'late_reason',
      key: 'late_reason',
      render: (text: string) => text || <Text type="secondary" italic>—</Text>,
    },
    {
      title: 'Thời Gian Nộp',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (text: string) => new Date(text).toLocaleString('vi-VN'),
    },
    {
      title: 'Tài Nguyên',
      key: 'resources',
      render: (_: unknown, record: LateSubmission) => (
        <Space>
          {record.repo_url && (
            <Tooltip title="Repository">
              <a href={record.repo_url} target="_blank" rel="noreferrer"><GithubOutlined /></a>
            </Tooltip>
          )}
          {(record.has_slide || record.slide_download_path) ? (
            <Tooltip title="Slide PDF">
              <Button
                type="link"
                size="small"
                icon={<FileTextOutlined />}
                loading={openingSlideId === record.submission_id}
                onClick={() => openSlideBlob(record.submission_id)}
                className="!px-0"
              />
            </Tooltip>
          ) : record.slide_url ? (
            <Tooltip title="Slide">
              <a href={record.slide_url} target="_blank" rel="noreferrer"><FileTextOutlined /></a>
            </Tooltip>
          ) : null}
          {record.demo_url && (
            <Tooltip title="Demo"><a href={record.demo_url} target="_blank" rel="noreferrer"><PlayCircleOutlined /></a></Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Hành Động',
      key: 'actions',
      render: (_: unknown, record: LateSubmission) => (
        <Space>
          <Button type="primary" icon={<CheckOutlined />} size="small" onClick={() => handleApprove(record.submission_id)}
            loading={approveMutation.isPending && approveMutation.variables === record.submission_id}>
            Duyệt
          </Button>
          <Button danger icon={<CloseOutlined />} size="small" onClick={() => handleOpenRejectModal(record.submission_id)}>
            Từ Chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <Title level={2} className="!m-0">Duyệt bài nộp muộn</Title>
        <Text type="secondary" className="block mt-1">
          {hackathonIdParam ? `Hackathon #${hackathonIdParam}` : ''}
          {roundIdParam ? `${hackathonIdParam ? ' · ' : ''}Vòng #${roundIdParam}` : ''}
          {trackIdParam ? `${roundIdParam || hackathonIdParam ? ' · ' : ''}Bảng #${trackIdParam}` : ''}
          {roundIdParam || trackIdParam || hackathonIdParam ? ' — ' : ''}
          Xem xét và phê duyệt hoặc từ chối các bài nộp sau hạn chót.
        </Text>
      </div>

      {!roundIdParam && (
        <Alert
          type="info"
          showIcon
          message="Đang xem theo vòng thi đang hoạt động"
          description="Trang được mở không kèm ngữ cảnh vòng thi (roundId). Hệ thống tự tra vòng đang hoạt động — nếu danh sách trống, hãy mở từ nút «Màn duyệt trễ» trong trang điều phối hàng đợi để lọc đúng vòng / bảng đấu."
        />
      )}

      {isLoading ? (
        <div className="flex flex-col items-center py-20"><Spin size="large" /></div>
      ) : error ? (
        <Card>
          <Alert
            type="error"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Lỗi tải danh sách"
            description={resolvePreliminarySubmissionError(error as Error, 'Không thể lấy bài nộp muộn.').message}
            action={<Button onClick={() => refetch()}>Thử lại</Button>}
          />
        </Card>
      ) : (
        <Card>
          <Table
            columns={columns}
            dataSource={filteredSubmissions}
            rowKey="submission_id"
            locale={{
              emptyText:
                trackIdParam && submissions.length > 0
                  ? `Không có bài nộp muộn chờ duyệt cho Bảng #${trackIdParam}.`
                  : 'Không có bài nộp muộn đang chờ duyệt.',
            }}
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
          />
        </Card>
      )}

      <Modal
        title="Từ chối bài nộp muộn"
        open={isRejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => { setIsRejectModalOpen(false); setRejectReason(''); }}
        okText="Từ chối"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
      >
        <Input.TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Lý do từ chối (bắt buộc)"
          rows={4}
        />
      </Modal>
    </div>
  );
};

export default LateSubmissionReviewPage;
