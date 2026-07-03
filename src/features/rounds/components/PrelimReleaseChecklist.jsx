import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Modal, Space, Table, Tag, Upload, message } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { trackService } from '../../tracks/services/trackService';
import { mapTrackToFE } from '../../tracks/mappers/trackMapper';

const hasTrackProblem = (track) =>
  Boolean(track?.problem_statement_filename || track?.problem_statement_url);

const isTrackReleased = (track) => Boolean(track?.problem_released_at);

const PrelimReleaseChecklist = ({ roundId, roundProblemReleased, onReadyChange, onTrackReleased }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingTrackId, setUploadingTrackId] = useState(null);
  const [viewingTrackId, setViewingTrackId] = useState(null);
  const [releasingTrackId, setReleasingTrackId] = useState(null);

  const loadTracks = useCallback(async () => {
    if (!roundId) return;
    setLoading(true);
    try {
      const res = await trackService.listByRound(roundId);
      setTracks((Array.isArray(res) ? res : res?.items || []).map(mapTrackToFE));
    } catch (error) {
      message.error(error?.message || 'Không tải được danh sách bảng đấu');
      setTracks([]);
    } finally {
      setLoading(false);
    }
  }, [roundId]);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  const allReady = useMemo(
    () => tracks.length > 0 && tracks.every((t) => hasTrackProblem(t)),
    [tracks],
  );

  const allTracksReleased = useMemo(
    () => tracks.length > 0 && tracks.every((t) => isTrackReleased(t) || roundProblemReleased),
    [tracks, roundProblemReleased],
  );

  useEffect(() => {
    onReadyChange?.(allReady);
  }, [allReady, onReadyChange]);

  const handleViewPdf = async (trackId) => {
    setViewingTrackId(trackId);
    try {
      const blob = await trackService.getProblemStatement(trackId);
      const fileUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const opened = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        URL.revokeObjectURL(fileUrl);
        message.warning('Trình duyệt chặn popup — hãy cho phép để xem PDF.');
      }
    } catch {
      message.error('Không mở được file đề bài.');
    } finally {
      setViewingTrackId(null);
    }
  };

  const handleReplacePdf = async (trackId, file) => {
    if (!file) return Upload.LIST_IGNORE;
    setUploadingTrackId(trackId);
    try {
      await trackService.uploadProblemStatement(trackId, file);
      message.success('Đã cập nhật đề bài cho bảng đấu.');
      await loadTracks();
    } catch (error) {
      message.error(error?.message || 'Không upload được đề bài.');
    } finally {
      setUploadingTrackId(null);
    }
    return Upload.LIST_IGNORE;
  };

  const handleReleaseTrack = (track) => {
    const pdfName = track.problem_statement_filename || 'Đã có PDF';
    Modal.confirm({
      title: `Phát đề cho bảng «${track.name}»?`,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            File đề: <strong>{pdfName}</strong>
          </p>
          <p style={{ margin: 0 }}>
            Sinh viên thuộc bảng này sẽ nhận thông báo và tải được đề. Thao tác one-way — không đổi PDF sau khi phát.
          </p>
        </div>
      ),
      okText: 'Phát đề',
      cancelText: 'Hủy',
      onOk: async () => {
        setReleasingTrackId(track.id);
        try {
          await trackService.releaseProblem(track.id);
          message.success(`Đã phát đề cho bảng «${track.name}».`);
          await loadTracks();
          onTrackReleased?.();
        } catch (error) {
          message.error(error?.message || 'Không phát được đề cho bảng đấu.');
        } finally {
          setReleasingTrackId(null);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Bảng đấu',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <strong>{name}</strong>,
    },
    {
      title: 'Trạng thái đề',
      key: 'status',
      render: (_, record) => {
        const released = isTrackReleased(record) || roundProblemReleased;
        if (released) {
          return (
            <Tag color="processing" icon={<CheckCircleOutlined />}>
              Đã phát đề
            </Tag>
          );
        }
        if (hasTrackProblem(record)) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              {record.problem_statement_filename || 'Đã có PDF'}
            </Tag>
          );
        }
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Chưa upload
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        const released = isTrackReleased(record) || roundProblemReleased;
        const canRelease = hasTrackProblem(record) && !released;
        const canUpload = !released && !roundProblemReleased;

        return (
          <Space wrap>
            {hasTrackProblem(record) && (
              <Button
                size="small"
                icon={<EyeOutlined />}
                loading={viewingTrackId === record.id}
                onClick={() => handleViewPdf(record.id)}
              >
                Xem
              </Button>
            )}
            {canUpload && (
              <Upload
                accept="application/pdf,.pdf"
                showUploadList={false}
                beforeUpload={(file) => handleReplacePdf(record.id, file)}
              >
                <Button size="small" loading={uploadingTrackId === record.id}>
                  {hasTrackProblem(record) ? 'Đổi PDF' : 'Upload PDF'}
                </Button>
              </Upload>
            )}
            {canRelease && (
              <Button
                size="small"
                type="primary"
                icon={<SendOutlined />}
                loading={releasingTrackId === record.id}
                onClick={() => handleReleaseTrack(record)}
              >
                Phát đề
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 12 }}
        message="Nguyên tắc vàng"
        description={
          <span style={{ fontSize: 13 }}>
            Chỉ phát đề sau khi vòng đã <strong>kích hoạt</strong>. Có thể phát từng bảng hoặc «Phát tất cả».
            Sau khi phát, thao tác <strong>one-way</strong> — không đổi file đề nữa.
          </span>
        }
      />
      <Table
        size="small"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={tracks}
        pagination={false}
        locale={{ emptyText: 'Chưa có bảng đấu — tạo bảng và upload đề trước khi phát.' }}
      />
      {!loading && tracks.length > 0 && !allReady && !roundProblemReleased && (
        <Alert
          type="info"
          showIcon
          style={{ marginTop: 12 }}
          message="Phát từng bảng"
          description="Bạn có thể phát đề từng bảng khi đã có PDF — không cần chờ tất cả bảng sẵn sàng. «Phát tất cả» vẫn yêu cầu mọi bảng có PDF."
        />
      )}
      {!loading && tracks.length > 0 && allTracksReleased && !roundProblemReleased && (
        <Alert
          type="success"
          showIcon
          style={{ marginTop: 12 }}
          message="Mọi bảng đã phát đề riêng"
          description="Có thể đóng hộp thoại hoặc dùng «Phát tất cả» để đánh dấu phát đề cấp vòng."
        />
      )}
    </div>
  );
};

export default PrelimReleaseChecklist;
