import { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Card, Spin, Alert } from 'antd';
import { Plus, Edit, Trash2, Send } from 'lucide-react'; // Đã import thêm icon Send
import TrackFormModal from '../components/TrackFormModal';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import { trackService } from '../services/trackService';
import { roundService } from '../../rounds/services/roundService';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import { mapTrackToFE, mapTrackToBE, mapTrackDurationToBE, formatTrackDurationLabel, hasTrackDurationInput, isTrackDurationCleared, trackHasDurationOverride } from '../mappers/trackMapper';
import { presentationService } from '../../judging/services/presentationService';

const TrackManagementPage = ({ hackathonId }) => {
  const [tracks, setTracks] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  
  // TASK 19: State quản lý loading khi đang bấm nút Phát đề
  const [releasingTrackId, setReleasingTrackId] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tracksRes, roundsRes] = await Promise.all([
        trackService.listByHackathon(hackathonId),
        roundService.listByHackathon(hackathonId)
      ]);
      
      const fullRounds = await Promise.all(
        (roundsRes || []).map(async (r) => {
          try {
            const detail = await roundService.getById(r.id);
            return mapRoundToFE(detail);
          } catch (_e) {
            return mapRoundToFE(r);
          }
        })
      );

      setTracks((tracksRes || []).map(mapTrackToFE));
      setRounds(fullRounds);
    } catch (error) {
      message.error(error.message || 'Không tải được dữ liệu bảng đấu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [hackathonId]);

  const handleAdd = async () => {
    await fetchData();
    setEditingTrack(null);
    setIsModalVisible(true);
  };

  const handleEdit = async (trackSummary) => {
    try {
      setLoading(true);
      const trackDetail = await trackService.getById(trackSummary.id);
      setEditingTrack(mapTrackToFE(trackDetail));
      setIsModalVisible(true);
    } catch (error) {
      message.error(error.message || 'Không tải được chi tiết bảng đấu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await trackService.delete(id);
      message.success('Đã xóa bảng đấu');
      fetchData();
    } catch (error) {
      message.error(error.message || 'Không xóa được bảng đấu');
      setLoading(false);
    }
  };

  // ==========================================
  // TASK 19: HÀM XỬ LÝ PHÁT ĐỀ THI
  // ==========================================
  const handleReleaseProblem = async (track) => {
    try {
      setReleasingTrackId(track.id);
      await trackService.releaseProblem(track.id);
      message.success(`Đã phát đề thi thành công cho bảng đấu: ${track.name}`);
      await fetchData(); // Cập nhật lại giao diện sau khi phát đề
    } catch (error) {
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error?.message || error.message;
      message.error(errorMsg || 'Không thể phát đề thi. Vòng thi có thể chưa kích hoạt.');
    } finally {
      setReleasingTrackId(null);
    }
  };

  const handleModalFinish = async (values) => {
    try {
      setLoading(true);
      const { problem_file: problemFileListValue, ...trackValues } = values;
      const payload = mapTrackToBE(trackValues);
      let trackId = editingTrack?.id;
      const roundIdForCreate = editingTrack?.round_id ?? prelimRounds[0]?.id;
      const roundId = editingTrack ? editingTrack.round_id : roundIdForCreate;

      if (editingTrack) {
        await trackService.update(editingTrack.id, payload);
        trackId = editingTrack.id;
        if (trackHasDurationOverride(editingTrack) && isTrackDurationCleared(trackValues)) {
          await presentationService.clearTrackOverride(roundId, trackId);
        }
        message.success('Đã cập nhật bảng đấu');
      } else {
        const createPayload = { ...payload };
        delete createPayload.presentationMinutes;
        delete createPayload.qaMinutes;
        const created = await trackService.createByRound(roundIdForCreate, createPayload);
        trackId = created.id;
        if (hasTrackDurationInput(trackValues)) {
          // PUT yêu cầu đủ field bắt buộc (name, min/max team size), không chỉ duration.
          await trackService.update(trackId, payload);
        }
        message.success('Đã thêm bảng đấu');
      }

      const problemFile = problemFileListValue?.[0]?.originFileObj ?? problemFileListValue?.[0];
      const roundReleased = rounds.find((r) => r.id === roundId)?.problem_released_at;
      if (problemFile && trackId && !roundReleased) {
        try {
          await trackService.uploadProblemStatement(trackId, problemFile);
        } catch (uploadError) {
          message.warning(uploadError?.message || 'Đã lưu bảng đấu nhưng chưa upload được file đề bài.');
        }
      }

      setIsModalVisible(false);
      await fetchData();
    } catch (error) {
      message.error(error.message || 'Không lưu được bảng đấu');
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tên bảng đấu',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Vòng sơ loại',
      dataIndex: 'round_id',
      key: 'round_id',
      render: (val) => rounds.find(r => r.id === val)?.name || '-',
    },
    {
      title: 'Đội / nhóm',
      key: 'max_per_group',
      render: (_, record) => record.max_teams_per_group || '—',
    },
    {
      title: 'Tổng đội',
      key: 'teams',
      render: (_, record) => `${record.max_teams || 'Không giới hạn'}`,
    },
    {
      title: 'Thành viên / đội',
      key: 'team_size',
      render: (_, record) => `${record.min_team_size || '-'} - ${record.max_team_size || '-'} người`,
    },
    {
      title: 'Timer TT / Q&A',
      key: 'presentation_duration',
      render: (_, record) => (
        <span style={{ fontSize: 12 }}>{formatTrackDurationLabel(record)}</span>
      ),
    },
    {
      title: 'Đề bài',
      key: 'problem',
      render: (_, record) =>
        record.problem_statement_filename ? (
          <span style={{ fontSize: 12 }}>{record.problem_statement_filename}</span>
        ) : (
          <span style={{ color: '#999' }}>Chưa upload</span>
        ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusBadge status={status} />,
    },
    // ==========================================
    // TASK 19: CỘT PHÁT ĐỀ TỪNG BẢNG ĐẤU
    // ==========================================
    {
      title: 'Phát đề',
      key: 'release',
      align: 'center',
      render: (_, record) => {
        // Kiểm tra xem đã upload file chưa
        const hasProblem = record.problem_statement_filename || record.problem_statement_url;
        // Kiểm tra xem đã được phát trước đó chưa
        const isReleased = record.is_released || record.problem_released_at;
        
        if (isReleased) {
          return (
            <span style={{ color: '#16a34a', fontWeight: 600, fontSize: 13 }}>
              ✓ Đã phát
            </span>
          );
        }

        return (
          <Popconfirm
            title="Xác nhận phát đề thi"
            description="Sinh viên trong bảng này sẽ ngay lập tức nhận được đề thi. Xác nhận phát?"
            onConfirm={() => handleReleaseProblem(record)}
            okText="Phát"
            cancelText="Hủy"
            disabled={!hasProblem}
          >
            <Button 
              type="primary" 
              size="small" 
              icon={<Send size={14} style={{ marginRight: 4 }} />} 
              disabled={!hasProblem}
              loading={releasingTrackId === record.id}
              style={{ 
                background: hasProblem ? '#2563eb' : undefined, 
                fontSize: 13, 
                display: 'inline-flex', 
                alignItems: 'center',
                borderRadius: 6 
              }}
            >
              Phát đề
            </Button>
          </Popconfirm>
        );
      }
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="text" 
            icon={<Edit size={16} />} 
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Xóa bảng đấu"
            description="Bạn có chắc muốn xóa bảng đấu này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (loading && tracks.length === 0) {
    return <Card style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></Card>;
  }

  const prelimRounds = rounds.filter(r => !r.is_final && r.round_type !== 'FINAL');

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Bảng đấu (chủ đề thi)"
        description={<span style={{ fontSize: 12 }}>Chỉ thêm trong vòng Sơ loại. Mỗi bảng đấu cần bộ tiêu chí riêng và file PDF đề bài riêng. Bấm "Phát đề" để mở quyền truy cập tài liệu cho sinh viên.</span>}
      />
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          type="primary" 
          icon={<Plus size={16} />} 
          onClick={handleAdd}
          disabled={prelimRounds.length === 0}
        >
          Thêm bảng đấu
        </Button>
      </div>
      
      {prelimRounds.length === 0 && (
        <Card style={{ marginBottom: 16 }}>Tạo vòng Sơ loại trước khi thêm bảng đấu.</Card>
      )}

      <Table scroll={{ x: 'max-content' }}
        columns={columns} 
        dataSource={tracks} 
        rowKey="id"
        pagination={false}
        loading={loading}
        locale={{ emptyText: 'Chưa có bảng đấu nào.' }}
      />

      {isModalVisible && (
        <TrackFormModal
          visible={isModalVisible}
          title={editingTrack ? 'Sửa bảng đấu' : 'Thêm bảng đấu'}
          initialValues={editingTrack}
          rounds={prelimRounds}
          isEditing={!!editingTrack}
          problemReleased={Boolean(
            rounds.find((r) => r.id === editingTrack?.round_id)?.problem_released_at,
          )}
          onCancel={() => setIsModalVisible(false)}
          onFinish={handleModalFinish}
        />
      )}
    </div>
  );
};

export default TrackManagementPage;