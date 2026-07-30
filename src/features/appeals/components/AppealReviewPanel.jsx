import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Empty,
  Image,
  Input,
  List,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  ReloadOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import AppealCountdownBar from './AppealCountdownBar';
import FinalDelayModal, {
  markFinalDelayPrompted,
  shouldAutoOpenFinalDelay,
} from './FinalDelayModal';
import { appealReviewService } from '../services/appealReview.service';
import { appealWindowService } from '../services/appealWindow.service';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';

const { Text, Paragraph, Title } = Typography;

const STATUS_META = {
  PENDING: { color: 'orange', label: 'Chờ duyệt' },
  UNDER_REVIEW: { color: 'processing', label: 'Đang xét' },
  APPROVED: { color: 'success', label: 'Đã duyệt' },
  REJECTED: { color: 'error', label: 'Từ chối' },
  EXPIRED: { color: 'default', label: 'Hết hạn' },
};

const isHttpUrl = (url) => /^https?:\/\//i.test(String(url || ''));

const AppealReviewPanel = ({ roundId, onCountsChange }) => {
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [appeals, setAppeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [windowStatus, setWindowStatus] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);

  const pendingCount = Number(windowStatus?.pendingCount || 0);
  const underReviewCount = Number(windowStatus?.underReviewCount || 0);
  const openCount = pendingCount + underReviewCount;
  const windowOpen = String(windowStatus?.windowState || '').toUpperCase() === 'OPEN';

  const loadAppeals = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const list = await appealReviewService.listByRound(roundId, statusFilter);
      setAppeals(list);
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, 'Không tải được danh sách khiếu nại.');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [roundId, statusFilter]);

  useEffect(() => {
    loadAppeals();
  }, [loadAppeals]);

  useEffect(() => {
    onCountsChange?.({ pendingCount, underReviewCount });
  }, [pendingCount, underReviewCount, onCountsChange]);

  useEffect(() => {
    if (shouldAutoOpenFinalDelay(roundId, windowStatus)) {
      markFinalDelayPrompted(roundId);
      setDelayOpen(true);
    }
  }, [roundId, windowStatus]);

  const openDetail = async (appeal) => {
    setSelected(appeal);
    setDetailLoading(true);
    try {
      const detail = await appealReviewService.getById(appeal.id);
      setSelected(detail);
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, 'Không tải được chi tiết đơn.');
      message.error(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleClaim = async (id) => {
    setActionLoading(true);
    try {
      await appealReviewService.claim(id);
      message.success('Đã nhận đơn để duyệt.');
      await loadAppeals();
      const detail = await appealReviewService.getById(id);
      setSelected(detail);
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, 'Không thể nhận đơn.');
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      await appealReviewService.review(id, { decision: 'APPROVED' });
      message.success('Đã duyệt khiếu nại.');
      await loadAppeals();
      const detail = await appealReviewService.getById(id);
      setSelected(detail);
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, 'Không thể duyệt đơn.');
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selected?.id) return;
    if (!rejectNote || rejectNote.trim().length < 5) {
      message.warning('Từ chối bắt buộc nhập ghi chú (tối thiểu 5 ký tự).');
      return;
    }
    setActionLoading(true);
    try {
      await appealReviewService.review(selected.id, {
        decision: 'REJECTED',
        note: rejectNote.trim(),
      });
      message.success('Đã từ chối khiếu nại.');
      setRejectOpen(false);
      setRejectNote('');
      await loadAppeals();
      const detail = await appealReviewService.getById(selected.id);
      setSelected(detail);
    } catch (error) {
      const { message: msg } = resolveProgressionError(error, 'Không thể từ chối đơn.');
      message.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseWindow = async () => {
    Modal.confirm({
      title: 'Đóng cửa sổ khiếu nại sớm?',
      content: 'Chỉ đóng khi không còn đơn chờ duyệt / đang xét. Các đơn chưa nộp sẽ hết hạn.',
      okText: 'Đóng cửa sổ',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const status = await appealWindowService.closeEarly(roundId);
          setWindowStatus(status);
          message.success('Đã đóng cửa sổ khiếu nại.');
          await loadAppeals();
        } catch (error) {
          const { message: msg } = resolveProgressionError(error, 'Không thể đóng cửa sổ.');
          message.error(msg);
        }
      },
    });
  };

  const handleRepublish = async () => {
    Modal.confirm({
      title: 'Công bố lại kết quả?',
      content: 'Tăng bản revision và gửi thông báo RESULTS_REVISED. Không reset cửa sổ khiếu nại.',
      okText: 'Công bố lại',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          const status = await appealWindowService.republish(roundId);
          setWindowStatus(status);
          message.success(
            status?.publishRevision
              ? `Đã công bố lại (bản #${status.publishRevision}).`
              : 'Đã công bố lại kết quả.',
          );
        } catch (error) {
          const { message: msg } = resolveProgressionError(error, 'Không thể công bố lại.');
          message.error(msg);
        }
      },
    });
  };

  const hasApproved = appeals.some(
    (a) => String(a.status || '').toUpperCase() === 'APPROVED',
  );

  const evidences = useMemo(() => {
    const list = selected?.evidences;
    if (Array.isArray(list) && list.length) return list;
    if (selected?.evidenceUrl) {
      return [{ url: selected.evidenceUrl, type: 'LINK', caption: 'Minh chứng' }];
    }
    return [];
  }, [selected]);

  const statusOf = (s) => STATUS_META[String(s || '').toUpperCase()] || STATUS_META.PENDING;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <AppealCountdownBar
        roundId={roundId}
        readOnly={false}
        showDelayButton
        onRequestDelay={() => setDelayOpen(true)}
        onStatusChange={setWindowStatus}
      />

      <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Select
            allowClear
            placeholder="Lọc trạng thái"
            style={{ minWidth: 180 }}
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'PENDING', label: 'Chờ duyệt' },
              { value: 'UNDER_REVIEW', label: 'Đang xét' },
              { value: 'APPROVED', label: 'Đã duyệt' },
              { value: 'REJECTED', label: 'Từ chối' },
              { value: 'EXPIRED', label: 'Hết hạn' },
            ]}
          />
          <Button icon={<ReloadOutlined />} onClick={loadAppeals} loading={loading}>
            Làm mới
          </Button>
        </Space>
        <Space wrap>
          <Button
            icon={<StopOutlined />}
            disabled={!windowOpen || openCount > 0}
            onClick={handleCloseWindow}
          >
            Đóng cửa sổ sớm
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            disabled={!hasApproved}
            onClick={handleRepublish}
          >
            Công bố lại
          </Button>
        </Space>
      </Space>

      {openCount > 0 && (
        <Alert
          type="info"
          showIcon
          message={`Còn ${pendingCount} đơn chờ duyệt và ${underReviewCount} đơn đang xét — chưa thể chốt chuyển vòng.`}
        />
      )}

      {!loading && appeals.length === 0 ? (
        <Empty description="Chưa có đơn khiếu nại nào" />
      ) : (
        <List
          loading={loading}
          dataSource={appeals}
          renderItem={(item) => {
            const meta = statusOf(item.status);
            return (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => openDetail(item)}
                  >
                    Chi tiết
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space wrap>
                      <Text strong>{item.teamName || `Đội #${item.teamId}`}</Text>
                      <Tag color={meta.color}>{meta.label}</Tag>
                    </Space>
                  }
                  description={
                    <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                      {item.reason}
                    </Paragraph>
                  }
                />
              </List.Item>
            );
          }}
        />
      )}

      <Modal
        title={selected ? `Đơn #${selected.id} — ${selected.teamName || ''}` : 'Chi tiết khiếu nại'}
        open={Boolean(selected)}
        onCancel={() => setSelected(null)}
        footer={null}
        width={720}
        destroyOnClose
        confirmLoading={detailLoading}
      >
        {selected && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Space wrap>
              <Tag color={statusOf(selected.status).color}>{statusOf(selected.status).label}</Tag>
              <Text type="secondary">
                Gửi lúc{' '}
                {selected.createdAt
                  ? new Date(selected.createdAt).toLocaleString('vi-VN')
                  : '—'}
              </Text>
            </Space>
            <div>
              <Title level={5} style={{ marginTop: 0 }}>
                Lý do
              </Title>
              <Paragraph>{selected.reason}</Paragraph>
            </div>
            <div>
              <Title level={5}>Minh chứng</Title>
              {evidences.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có minh chứng" />
              ) : (
                <Image.PreviewGroup>
                  <Space wrap>
                    {evidences.map((ev, idx) => {
                      const url = ev.url || ev.storageKey;
                      if (String(ev.type || '').toUpperCase() === 'IMAGE' && isHttpUrl(url)) {
                        return (
                          <Image
                            key={ev.id || idx}
                            src={url}
                            width={120}
                            height={120}
                            style={{ objectFit: 'cover', borderRadius: 8 }}
                            alt={ev.caption || `evidence-${idx}`}
                          />
                        );
                      }
                      return (
                        <Tag key={ev.id || idx} color="blue">
                          {ev.type || 'FILE'}: {ev.caption || url || `#${idx + 1}`}
                        </Tag>
                      );
                    })}
                  </Space>
                </Image.PreviewGroup>
              )}
            </div>
            {selected.decisionNote && (
              <Alert type="info" showIcon message="Ghi chú quyết định" description={selected.decisionNote} />
            )}
            <Space wrap>
              {String(selected.status).toUpperCase() === 'PENDING' && (
                <Button
                  type="primary"
                  loading={actionLoading}
                  onClick={() => handleClaim(selected.id)}
                >
                  Nhận đơn
                </Button>
              )}
              {String(selected.status).toUpperCase() === 'UNDER_REVIEW' && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    loading={actionLoading}
                    onClick={() => handleApprove(selected.id)}
                  >
                    Duyệt
                  </Button>
                  <Button
                    danger
                    icon={<CloseCircleOutlined />}
                    loading={actionLoading}
                    onClick={() => {
                      setRejectNote('');
                      setRejectOpen(true);
                    }}
                  >
                    Từ chối
                  </Button>
                </>
              )}
            </Space>
          </Space>
        )}
      </Modal>

      <Modal
        title="Từ chối khiếu nại"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={handleReject}
        okText="Xác nhận từ chối"
        okButtonProps={{ danger: true }}
        confirmLoading={actionLoading}
        destroyOnClose
      >
        <Paragraph type="secondary">Bắt buộc nhập ghi chú khi từ chối.</Paragraph>
        <Input.TextArea
          rows={4}
          value={rejectNote}
          onChange={(e) => setRejectNote(e.target.value)}
          placeholder="Lý do từ chối..."
        />
      </Modal>

      <FinalDelayModal
        open={delayOpen}
        onCancel={() => setDelayOpen(false)}
        roundId={roundId}
        windowStatus={windowStatus}
        onApplied={(data) => {
          setWindowStatus((prev) => ({ ...prev, ...data }));
        }}
      />
    </Space>
  );
};

export const AppealTabLabel = ({ pendingCount = 0 }) => (
  <Badge count={pendingCount} size="small" offset={[8, 0]}>
    <span>Khiếu nại</span>
  </Badge>
);

export default AppealReviewPanel;
