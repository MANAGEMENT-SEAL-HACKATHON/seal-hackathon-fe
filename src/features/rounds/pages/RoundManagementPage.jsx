import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Timeline, Tag, Card, Spin, Typography, Modal, Alert } from 'antd';
import { Plus, Edit, Trash2, Calendar, List, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RoundFormModal from '../components/RoundFormModal';
import { roundService } from '../services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { criteriaService } from '../../criteria/services/criteriaService';
import { mapRoundToFE, mapRoundToBE, sortRoundsByExamAt } from '../mappers/roundMapper';
import { getRoundErrorMessage } from '../../../shared/constants/roundErrors';
import { formatDate } from '../../../shared/utils/date';
import { teamService } from '../../teams/services/teamService';
import {
  buildPartitionStats,
  validateAdvancementConfig,
} from '../utils/roundAdvancementRules';
import dayjs from 'dayjs';

const { Title } = Typography;

const RoundManagementPage = ({ hackathonId, hackathon, onHackathonSync }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'timeline'
  const [advancementTeams, setAdvancementTeams] = useState([]);
  const [advancementTracks, setAdvancementTracks] = useState([]);
  const navigate = useNavigate()

  const fetchAdvancementData = async () => {
    try {
      const [teamsRes, tracksRes] = await Promise.all([
        teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
        trackService.listByHackathon(hackathonId),
      ]);
      setAdvancementTeams(Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || []);
      setAdvancementTracks(Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || []);
    } catch {
      setAdvancementTeams([]);
      setAdvancementTracks([]);
    }
  };

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const res = await roundService.listByHackathon(hackathonId);

      const fullRounds = await Promise.all(
        (res || []).map(async (r) => {
          try {
            const detail = await roundService.getById(r.id);
            return mapRoundToFE(detail);
          } catch (e) {
            return mapRoundToFE(r);
          }
        })
      );

      setRounds(sortRoundsByExamAt(fullRounds));
    } catch (error) {
      message.error(error.message || 'Lỗi khi tải danh sách vòng thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRounds();
    fetchAdvancementData();
  }, [hackathonId]);

  const handleAdd = async () => {
    await fetchAdvancementData();
    setEditingRound(null);
    setIsModalVisible(true);
  };

  const handleEdit = async (round) => {
    await fetchAdvancementData();
    setEditingRound(round);
    setIsModalVisible(true);
  };

  const handleViewRanking = (roundId) => {
    navigate(`/hackathons/${hackathonId}/rounds/${roundId}/ranking-preview`);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      await roundService.delete(id);
      message.success('Đã xóa vòng thi thành công');
      await fetchRounds();
      if (onHackathonSync) await onHackathonSync();
    } catch (error) {
      message.error(error.message || 'Lỗi khi xóa vòng thi');
      setLoading(false);
    }
  };

  const handleModalFinish = async (values) => {
    try {
      setLoading(true);

      const isActivating = values.is_active && (!editingRound || !editingRound.is_active);

      // Validate activation readiness before saving or activating
      if (isActivating) {
        if (!editingRound) {
          Modal.error({
            title: 'Không thể kích hoạt vòng thi mới',
            content: 'Vòng thi mới tạo chưa có bảng đấu và tiêu chí đánh giá. Vui lòng lưu vòng thi ở trạng thái "Ngưng hoạt động" trước, sau đó cấu hình các bảng đấu và tiêu chí đánh giá bên trong rồi mới kích hoạt.',
          });
          setLoading(false);
          return;
        }

        const roundId = editingRound.id;
        const isFinal = values.is_final;

        if (isFinal) {
          const summary = await criteriaService.getWeightSummaryByRound(roundId);
          const items = summary?.items || [];
          if (items.length === 0) {
            Modal.error({
              title: 'Không thể kích hoạt vòng thi',
              content: 'Vòng Chung kết chưa có tiêu chí đánh giá nào. Vui lòng tạo tiêu chí đánh giá cho vòng thi này trước.',
            });
            setLoading(false);
            return;
          }
          const totalWeight = summary?.total || 0;
          if (Math.abs(totalWeight - 1) > 0.001) {
            Modal.error({
              title: 'Không thể kích hoạt vòng thi',
              content: `Tổng trọng số các tiêu chí của vòng Chung kết phải bằng 1.0 (100%). Hiện tại đang là: ${(totalWeight * 100).toFixed(1)}%.`,
            });
            setLoading(false);
            return;
          }
        } else {
          const [teamsRes, tracksRes] = await Promise.all([
            teamService.listByHackathon(hackathonId, { status: 'ACTIVE' }),
            trackService.listByHackathon(hackathonId),
          ]);
          const freshTeams = Array.isArray(teamsRes) ? teamsRes : teamsRes?.items || [];
          const freshTracks = Array.isArray(tracksRes) ? tracksRes : tracksRes?.items || [];
          const partitions = buildPartitionStats(freshTeams, freshTracks, {
            requireLocked: hackathon?.status === 'ONGOING',
          });
          const advancementCheck = validateAdvancementConfig({
            topNAdvance: values.top_n_advance,
            minTeamsFinal: values.min_teams_final,
            partitions,
            requirePartitions: hackathon?.status === 'ONGOING',
          });

          if (!advancementCheck.valid) {
            Modal.error({
              title: 'Chưa thể kích hoạt Sơ loại',
              content: (
                <div>
                  <p>Kiểm tra lại luật đi tiếp theo số đội thực tế sau lottery:</p>
                  <ul style={{ paddingLeft: 18 }}>
                    {advancementCheck.errors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                  <p style={{ fontSize: 13, marginTop: 8 }}>
                    Gợi ý: chỉnh Top N mỗi bảng ≤ số đội ít nhất trong từng bảng, rồi lưu lại trước khi kích hoạt.
                  </p>
                </div>
              ),
            });
            setLoading(false);
            return;
          }

          const tracks = await trackService.listByRound(roundId);
          if (!tracks || tracks.length === 0) {
            Modal.error({
              title: 'Không thể kích hoạt vòng thi',
              content: 'Vòng thi chưa có bảng đấu nào. Thêm ít nhất một bảng đấu trước.',
            });
            setLoading(false);
            return;
          }

          for (const track of tracks) {
            if (track.status === 'CANCELLED') continue;

            const summary = await criteriaService.getWeightSummaryByTrack(track.id);
            const items = summary?.items || [];
            if (items.length === 0) {
              Modal.error({
                title: 'Không thể kích hoạt vòng thi',
                content: `Bảng đấu "${track.name}" chưa có tiêu chí đánh giá nào. Vui lòng cấu hình tiêu chí cho bảng đấu này trước.`,
              });
              setLoading(false);
              return;
            }

            const totalWeight = summary?.total || 0;
            if (Math.abs(totalWeight - 1) > 0.001) {
              Modal.error({
                title: 'Không thể kích hoạt vòng thi',
                content: `Tổng trọng số các tiêu chí của bảng đấu "${track.name}" phải bằng 1.0 (100%). Hiện tại đang là: ${(totalWeight * 100).toFixed(1)}%.`,
              });
              setLoading(false);
              return;
            }
          }
        }
      }

      if (editingRound) {
        values.sequenceOrder = editingRound.sequenceOrder || editingRound.sequence_order || 1;
      } else {
        values.sequenceOrder = rounds.length + 1;
      }

      const payload = mapRoundToBE(values);
      let roundId = editingRound?.id;
      let createdOrUpdatedRound;

      if (editingRound) {
        createdOrUpdatedRound = await roundService.update(editingRound.id, payload);
        roundId = editingRound.id;
      } else {
        createdOrUpdatedRound = await roundService.createByHackathon(hackathonId, payload);
        roundId = createdOrUpdatedRound.id;
      }

      // If user wants to activate the round and it is not already active
      if (values.is_active && (!editingRound || !editingRound.is_active)) {
        try {
          await roundService.activate(roundId, { note: 'Kích hoạt từ giao diện cấu hình' });
          message.success(editingRound ? 'Đã cập nhật và kích hoạt vòng thi thành công' : 'Đã tạo và kích hoạt vòng thi thành công');
        } catch (actError) {
          Modal.error({
            title: 'Không thể kích hoạt vòng thi',
            content: (
              <div>
                <p>Vòng thi chưa đủ điều kiện để hoạt động. Vui lòng kiểm tra lại:</p>
                <div style={{ padding: '8px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', color: '#ff4d4f' }}>
                  {actError.response?.data?.message || actError.response?.data?.error?.message || actError.message || 'Thiếu tiêu chí đánh giá hoặc chưa phân công giám khảo'}
                </div>
                <p style={{ marginTop: 8, fontSize: '13px' }}>Vòng thi đã được lưu thành công ở trạng thái "Ngưng hoạt động". Bạn hãy cấu hình đầy đủ tiêu chí trước khi bật kích hoạt nhé.</p>
              </div>
            )
          });
        }
      } else {
        message.success(editingRound ? 'Đã cập nhật vòng thi thành công' : 'Đã tạo vòng thi mới thành công');
      }

      setIsModalVisible(false);
      await fetchRounds();
      if (onHackathonSync) await onHackathonSync();
    } catch (error) {
      message.error(getRoundErrorMessage(error));
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Ngày giờ thi',
      dataIndex: 'exam_at',
      key: 'exam_at',
      width: 180,
      render: (val) => (val ? formatDate(val) : '-'),
    },
    {
      title: 'Tên vòng thi',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.is_final && <Tag color="gold" style={{ marginLeft: 8 }}>Chung kết</Tag>}
        </div>
      ),
    },
    {
      title: 'Thời gian nộp bài',
      key: 'period',
      render: (_, record) => (
        <div style={{ fontSize: 13 }}>
          <div>Mở: {record.submission_open ? formatDate(record.submission_open) : '-'}</div>
          <div>Hạn chót: {record.submission_deadline ? formatDate(record.submission_deadline) : '-'}</div>
        </div>
      ),
    },
    {
      title: 'Thời lượng',
      dataIndex: 'coding_duration_hours',
      key: 'duration',
      render: (val) => val ? `${val}h` : '-',
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const isEnded = record.submission_deadline && dayjs().isAfter(dayjs(record.submission_deadline));
        if (isEnded) {
          return <Tag color="red">Đã kết thúc</Tag>;
        }
        return (
          <Tag color={record.is_active ? 'green' : 'default'}>
            {record.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        return (
          <Space size="middle">
            <Button
              type="link"
              icon={<BarChart3 size={16} />}
              onClick={() => handleViewRanking(record.id)}
            >
              Xếp hạng tạm
            </Button>
            {!record.is_active && (
              <>
                <Button
                  type="text"
                  icon={<Edit size={16} />}
                  onClick={() => handleEdit(record)}
                />
                <Popconfirm
                  title="Xóa vòng thi"
                  description="Bạn có chắc chắn muốn xóa vòng thi này?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Xóa"
                  cancelText="Hủy"
                >
                  <Button type="text" danger icon={<Trash2 size={16} />} />
                </Popconfirm>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  if (loading && rounds.length === 0) {
    return <Card style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></Card>;
  }

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Vòng thi"
        description={<span style={{ fontSize: 12 }}>Tạo Sơ loại + Chung kết. Số đội đi tiếp nhập dự tính trước, xác nhận lại trước khi mở thi.</span>}
      />
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Space>
          <Button.Group style={{ marginRight: 16 }}>
            <Button
              icon={<List size={16} />}
              type={viewMode === 'table' ? 'primary' : 'default'}
              onClick={() => setViewMode('table')}
            >
              Bảng
            </Button>
            <Button
              icon={<Calendar size={16} />}
              type={viewMode === 'timeline' ? 'primary' : 'default'}
              onClick={() => setViewMode('timeline')}
            >
              Dòng thời gian
            </Button>
          </Button.Group>

          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={handleAdd}
          >
            Thêm vòng thi
          </Button>
        </Space>
      </div>

      {viewMode === 'table' ? (
        <Table scroll={{ x: 'max-content' }}
          columns={columns}
          dataSource={rounds}
          rowKey="id"
          pagination={false}
          loading={loading}
        />
      ) : (
        <Card loading={loading}>
          <Timeline
            mode="left"
            items={rounds.map(round => ({
              label: round.exam_at ? formatDate(round.exam_at) : 'Chưa thiết lập',
              children: (
                <div style={{ paddingBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {round.name}
                      {round.is_final && <Tag color="gold" style={{ marginLeft: 8 }}>Chung kết</Tag>}
                    </Title>
                    {(() => {
                      const isEnded = round.submission_deadline && dayjs().isAfter(dayjs(round.submission_deadline));
                      if (isEnded) return <Tag color="blue">Đã kết thúc</Tag>;
                      return (
                        <Tag color={round.is_active ? 'green' : 'default'}>
                          {round.is_active ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                        </Tag>
                      );
                    })()}
                  </div>
                  <div style={{ color: '#8c8c8c', marginBottom: 4 }}>
                    Thi: {round.exam_at ? formatDate(round.exam_at) : '-'}
                  </div>
                  <div style={{ color: '#8c8c8c', marginBottom: 8 }}>
                    Nộp bài: {round.submission_open ? formatDate(round.submission_open) : '-'}
                    {' → '}
                    {round.submission_deadline ? formatDate(round.submission_deadline) : '-'}
                  </div>
                  <Space>
                    <Button
                      size="small"
                      type="link"
                      icon={<BarChart3 size={14} />}
                      onClick={() => handleViewRanking(round.id)}
                    >
                      Xếp hạng tạm
                    </Button>
                    {!round.is_active && (
                      <Button size="small" icon={<Edit size={14} />} onClick={() => handleEdit(round)}>Sửa</Button>
                    )}
                  </Space>
                </div>
              ),
            }))}
          />
          {rounds.length === 0 && <div>Không tìm thấy vòng thi nào.</div>}
        </Card>
      )}

      {isModalVisible && (
        <RoundFormModal
          visible={isModalVisible}
          title={editingRound ? 'Sửa vòng thi' : 'Thêm vòng thi'}
          initialValues={editingRound}
          existingRounds={rounds}
          hackathon={hackathon}
          advancementTeams={advancementTeams}
          advancementTracks={advancementTracks}
          onCancel={() => setIsModalVisible(false)}
          onFinish={handleModalFinish}
        />
      )}
    </div>
  );
};

export default RoundManagementPage;
