import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Table, Tag, Button, Modal, Input, Typography, Spin, Space, Tooltip, Switch, Alert } from 'antd';
import { CheckOutlined, CloseOutlined, GithubOutlined, FileTextOutlined, PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { personBApi, LateSubmission } from '../../../api/personB.api';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

const LateSubmissionReviewPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [useMock, setUseMock] = useState(false);

  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Fetch Late Submissions
  const { data: submissions = [], isLoading, error, refetch } = useQuery<LateSubmission[]>({
    queryKey: ['lateSubmissions', useMock],
    queryFn: async () => {
      if (useMock) {
        const { mockLateSubmissions } = await import('../../../api/personB.mock');
        return mockLateSubmissions;
      }
      try {
        return await personBApi.getLateSubmissions();
      } catch (err: any) {
        toast.error(`Lỗi tải bài nộp muộn: ${err?.message || 'Không thể lấy dữ liệu'}`);
        throw err;
      }
    },
    retry: false
  });

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      return await personBApi.approveLateSubmission(submissionId);
    },
    onSuccess: (_, submissionId) => {
      toast.success('Duyệt bài nộp muộn thành công!');
      // Update local cache state by removing the approved row
      queryClient.setQueryData<LateSubmission[]>(['lateSubmissions', useMock], (old) => {
        return (old || []).filter((sub) => sub.submission_id !== submissionId);
      });
    },
    onError: (err: any) => {
      toast.error(`Lỗi phê duyệt: ${err?.message || 'Không thể thực hiện'}`);
    }
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ submissionId, reason }: { submissionId: string; reason: string }) => {
      return await personBApi.rejectLateSubmission(submissionId, { reason });
    },
    onSuccess: (_, variables) => {
      toast.success('Từ chối bài nộp muộn thành công!');
      setIsRejectModalOpen(false);
      setRejectReason('');
      setSelectedSubmissionId(null);
      // Remove row from list
      queryClient.setQueryData<LateSubmission[]>(['lateSubmissions', useMock], (old) => {
        return (old || []).filter((sub) => sub.submission_id !== variables.submissionId);
      });
    },
    onError: (err: any) => {
      toast.error(`Lỗi từ chối: ${err?.message || 'Không thể thực hiện'}`);
    }
  });

  const handleApprove = (submissionId: string) => {
    approveMutation.mutate(submissionId);
  };

  const handleOpenRejectModal = (submissionId: string) => {
    setSelectedSubmissionId(submissionId);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!selectedSubmissionId || !rejectReason.trim()) return;
    rejectMutation.mutate({
      submissionId: selectedSubmissionId,
      reason: rejectReason.trim()
    });
  };

  // Ant Design Table Columns Configuration
  const columns = [
    {
      title: 'Tên Đội Thi',
      dataIndex: 'team_name',
      key: 'team_name',
      render: (text: string) => <span className="font-semibold text-gray-800 dark:text-white">{text}</span>,
    },
    {
      title: 'Thời Gian Nộp',
      dataIndex: 'submitted_at',
      key: 'submitted_at',
      render: (text: string) => (
        <span className="text-gray-600 dark:text-gray-400 text-xs">
          {new Date(text).toLocaleString('vi-VN')}
        </span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: () => (
        <Tag color="warning" className="rounded-full !px-3 font-medium">
          LATE_PENDING
        </Tag>
      ),
    },
    {
      title: 'Tài Nguyên',
      key: 'resources',
      render: (_: any, record: LateSubmission) => (
        <Space size="middle">
          <Tooltip title="Tru cập Repository">
            <a href={record.repo_url} target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-primary">
              <GithubOutlined className="text-lg" />
            </a>
          </Tooltip>
          
          <Tooltip title="Xem Slide">
            <a href={record.slide_url} target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-primary">
              <FileTextOutlined className="text-lg" />
            </a>
          </Tooltip>

          {record.demo_url && (
            <Tooltip title="Xem Demo">
              <a href={record.demo_url} target="_blank" rel="noopener noreferrer" className="text-gray-700 dark:text-gray-300 hover:text-primary">
                <PlayCircleOutlined className="text-lg" />
              </a>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Hành Động',
      key: 'actions',
      render: (_: any, record: LateSubmission) => (
        <Space size="small">
          <Button
            type="primary"
            icon={<CheckOutlined />}
            size="small"
            onClick={() => handleApprove(record.submission_id)}
            loading={approveMutation.isPending && approveMutation.variables === record.submission_id}
            className="!bg-emerald-600 hover:!bg-emerald-700 border-none rounded"
          >
            Duyệt
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            size="small"
            onClick={() => handleOpenRejectModal(record.submission_id)}
            className="rounded"
          >
            Từ Chối
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fadeIn">


      {/* Header */}
      <div>
        <Title level={2} className="!m-0 dark:text-white">
          Duyệt Bài Nộp Muộn
        </Title>
        <Text className="text-gray-500 dark:text-gray-400 block mt-1">
          Xem xét và phê duyệt hoặc từ chối các bài thi được nộp sau thời hạn chót.
        </Text>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Spin size="large" />
          <Text className="text-gray-500">Đang tải danh sách chờ duyệt...</Text>
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/50">
          <div className="text-center py-8 space-y-4">
            <InfoCircleOutlined className="text-4xl text-red-500 mx-auto block" />
            <div className="space-y-1">
              <Title level={4} className="!m-0 text-red-700 dark:text-red-400">Lỗi kết nối máy chủ</Title>
              <Text className="text-red-500 block">{(error as any)?.message || 'Không thể lấy thông tin bài nộp'}</Text>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                TODO: [API MISSING] Late submissions review endpoint `GET /api/submissions?status=LATE_PENDING`
              </p>
            </div>
            <div className="flex justify-center gap-4">
              <Button type="primary" onClick={() => refetch()}>Thử lại</Button>
              <Button onClick={() => setUseMock(true)}>Bật dữ liệu Mock</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="shadow-md rounded-xl border border-gray-200 dark:border-zinc-850 dark:bg-zinc-900 overflow-hidden">
          <Table
            columns={columns}
            dataSource={submissions}
            rowKey="submission_id"
            locale={{
              emptyText: (
                <div className="py-12">
                  <Text strong className="block text-lg mb-1 dark:text-gray-300">Không có bài nộp muộn nào</Text>
                  <Text type="secondary" className="dark:text-gray-500">Tất cả bài thi nộp muộn đã được xử lý hoàn tất!</Text>
                </div>
              ),
            }}
            className="dark:bg-zinc-900"
            pagination={{ pageSize: 10, hideOnSinglePage: true }}
          />
        </Card>
      )}

      {/* Reject Reason Modal */}
      <Modal
        title={
          <span className="text-lg font-bold text-red-600 flex items-center gap-2">
            <CloseOutlined /> Từ chối Bài nộp muộn
          </span>
        }
        open={isRejectModalOpen}
        onOk={handleConfirmReject}
        onCancel={() => {
          setIsRejectModalOpen(false);
          setRejectReason('');
          setSelectedSubmissionId(null);
        }}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ 
          danger: true,
          disabled: !rejectReason.trim() || rejectMutation.isPending,
          loading: rejectMutation.isPending
        }}
        className="dark:bg-zinc-900"
      >
        <div className="py-4 space-y-4">
          <Text className="block text-sm text-gray-600 dark:text-gray-400">
            Vui lòng nhập lý do từ chối bài thi nộp muộn này. Lý do này sẽ được thông báo cho đội thi.
          </Text>
          <div className="space-y-1">
            <span className="text-xs text-red-500 font-bold">* Bắt buộc</span>
            <Input.TextArea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do từ chối (ví dụ: Nộp muộn quá thời gian quy định cho phép...)"
              rows={4}
              maxLength={200}
              showCount
              className="dark:bg-zinc-800 dark:text-white dark:border-zinc-700"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LateSubmissionReviewPage;
