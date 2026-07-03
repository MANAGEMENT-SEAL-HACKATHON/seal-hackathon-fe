import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Space, Tag, Upload, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { roundService } from '../services/roundService';
import { mapRoundToFE } from '../mappers/roundMapper';

const hasRoundProblem = (round) =>
  Boolean(round?.problem_statement_filename || round?.problem_statement_url);

const FinalReleaseChecklist = ({ roundId, onReadyChange }) => {
  const [round, setRound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState(false);

  const loadRound = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const res = await roundService.getById(roundId);
      setRound(mapRoundToFE(res));
    } catch (error) {
      message.error(error?.message || 'Không tải được thông tin vòng Chung kết');
      setRound(null);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    loadRound();
  }, [loadRound]);

  const isReady = useMemo(() => hasRoundProblem(round), [round]);

  useEffect(() => {
    onReadyChange?.(isReady);
  }, [isReady, onReadyChange]);

  const handleViewPdf = async () => {
    setViewing(true);
    try {
      const blob = await roundService.getProblemStatement(roundId);
      const fileUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        URL.revokeObjectURL(fileUrl);
        message.warning('Trình duyệt chặn popup — hãy cho phép để xem PDF.');
      }
    } catch {
      message.error('Không mở được file đề bài.');
    } finally {
      setViewing(false);
    }
  };

  const handleReplacePdf = async (file) => {
    if (!file) return Upload.LIST_IGNORE;
    setUploading(true);
    try {
      await roundService.uploadProblemStatement(roundId, file);
      message.success('Đã cập nhật đề bài Chung kết.');
      await loadRound();
    } catch (error) {
      message.error(error?.message || 'Không upload được đề bài.');
    } finally {
      setUploading(false);
    }
    return Upload.LIST_IGNORE;
  };

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="Nguyên tắc vàng"
        description={
          <span style={{ fontSize: 13 }}>
            Chỉ phát đề sau khi vòng đã <strong>kích hoạt</strong>. Sau khi bấm «Phát đề», thao tác{' '}
            <strong>one-way</strong> — không đổi file đề Chung kết nữa. Chỉ đội đã vào Chung kết mới tải được đề.
          </span>
        }
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          padding: '12px 0',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <div>
          <strong>{round?.name || 'Vòng Chung kết'}</strong>
          <div style={{ marginTop: 8 }}>
            {!loading && hasRoundProblem(round) ? (
              <Tag color="success" icon={<CheckCircleOutlined />}>
                {round.problem_statement_filename || 'Đã có PDF'}
              </Tag>
            ) : (
              <Tag color="error" icon={<CloseCircleOutlined />}>
                Chưa upload
              </Tag>
            )}
          </div>
        </div>
        <Space wrap>
          {hasRoundProblem(round) && (
            <Button size="small" icon={<EyeOutlined />} loading={viewing} onClick={handleViewPdf}>
              Xem
            </Button>
          )}
          <Upload
            accept="application/pdf,.pdf"
            showUploadList={false}
            beforeUpload={(file) => handleReplacePdf(file)}
          >
            <Button size="small" loading={uploading}>
              {hasRoundProblem(round) ? 'Đổi PDF' : 'Upload PDF'}
            </Button>
          </Upload>
        </Space>
      </div>

      {!loading && !isReady && (
        <Alert
          type="error"
          showIcon
          style={{ marginTop: 12 }}
          message="Chưa có đề bài"
          description="Upload PDF đề Chung kết trước khi phát cho sinh viên."
        />
      )}
    </div>
  );
};

export default FinalReleaseChecklist;
