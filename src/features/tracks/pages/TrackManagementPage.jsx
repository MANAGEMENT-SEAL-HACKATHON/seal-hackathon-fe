import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Card, Spin, Alert } from 'antd';
import { Plus, Edit, Trash2 } from 'lucide-react';
import TrackFormModal from '../components/TrackFormModal';
import StatusBadge from '../../../shared/components/ui/StatusBadge';
import { trackService } from '../services/trackService';
import { roundService } from '../../rounds/services/roundService';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import { mapTrackToFE, mapTrackToBE } from '../mappers/trackMapper';

const TrackManagementPage = ({ hackathonId }) => {
  const [tracks, setTracks] = useState([]);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);

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
          } catch (e) {
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

  const handleModalFinish = async (values) => {
    try {
      setLoading(true);
      const payload = mapTrackToBE(values);
      if (editingTrack) {
        await trackService.update(editingTrack.id, payload);
        message.success('Đã cập nhật bảng đấu');
      } else {
        await trackService.createByRound(values.round_id, payload);
        message.success('Đã thêm bảng đấu');
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
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusBadge status={status} />,
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
        description={<span style={{ fontSize: 12 }}>Chỉ thêm trong vòng Sơ loại. Mỗi bảng đấu cần bộ tiêu chí riêng.</span>}
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
          onCancel={() => setIsModalVisible(false)}
          onFinish={handleModalFinish}
        />
      )}
    </div>
  );
};

export default TrackManagementPage;
