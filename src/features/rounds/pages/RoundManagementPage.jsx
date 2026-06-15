import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Popconfirm, message, Timeline, Tag, Card, Spin, Typography, Modal, Alert, Tooltip, Input } from 'antd';
import { Plus, Edit, Trash2, Calendar, List, BarChart3, Trophy, PlayCircle, Lock, UserPlus } from 'lucide-react';
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
import LiveCodingMonitor from '../components/LiveCodingMonitor';

const { Title, Text } = Typography;

const RoundManagementPage = ({ hackathonId, hackathon, onHackathonSync }) => {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRound, setEditingRound] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'timeline'
  const [advancementTeams, setAdvancementTeams] = useState([]);
  const [advancementTracks, setAdvancementTracks] = useState([]);
  const navigate = useNavigate();

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

  // ==========================================
  // THÊM MỚI: State cho Bước 8 (Modal Khóa chấm điểm)
  // ==========================================
  const [isLockModalVisible, setIsLockModalVisible] = useState(false);
  const [lockingRound, setLockingRound] = useState(null);
  const [lockReason, setLockReason] = useState('');
  const [isLocking, setIsLocking] = useState(false);

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

  const handleViewResults = (roundId) => {
    navigate(`/hackathons/${hackathonId}/rounds/${roundId}/results`);
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

  // ==========================================
  // BƯỚC 1: Hàm Kích hoạt Vòng thi
  // ==========================================
  const handleActivateRound = (round) => {
    Modal.confirm({
      title: 'Xác nhận kích hoạt vòng thi?',
      content: `Bạn có chắc chắn muốn kích hoạt ${round.name}? Thao tác này sẽ mở cổng cho thí sinh và Giám khảo tham gia.`,
      okText: 'Kích hoạt ngay',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await roundService.activate(round.id, { note: 'Kích hoạt thủ công' });
          message.success(`ROUND_STARTED: ${round.name} đã được kích hoạt thành công!`);
          fetchRounds();
        } catch (error) {
          message.error(getRoundErrorMessage(error) || 'Lỗi khi kích hoạt vòng thi. Hãy kiểm tra lại tiêu chí và bảng đấu.');
          setLoading(false);
        }
      }
    });
  };

  // ==========================================
  // BƯỚC 8: Hàm Khóa chấm điểm
  // ==========================================
  const handleLockScoring = async () => {
    if (!lockReason.trim()) {
      return message.warning('Vui lòng nhập lý do khóa chấm điểm.');
    }
    
    setIsLocking(true);
    try {
      await roundService.lockScoring(lockingRound.id, { force_lock_reason: lockReason });
      message.success(`Đã khóa chấm điểm cho ${lockingRound.name}. Trạng thái hiện tại: scoring_locked`);
      setIsLockModalVisible(false);
      setLockReason('');
      fetchRounds();
    } catch (error) {
      message.error('Lỗi khi khóa chấm điểm. Vui lòng kiểm tra lại kết nối.');
    } finally {
      setIsLocking(false);
    }
  };

  const handleModalFinish = async (values) => {
    try {
      setLoading(true);

      const isActivating = values.is_active && (!editingRound || !editingRound.is_active);

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
        
        // BƯỚC 8: Hiển thị Badge Đã khóa chấm điểm
        if (record.scoring_locked || record.scoringLocked) {
          return <Tag color="red" icon={<Lock size={12} style={{marginRight: 4}}/>}>Đã khóa chấm điểm</Tag>;
        }

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
        const isLocked = record.scoring_locked || record.scoringLocked;
        const assignJudgeBtn = (
          <Tooltip title="Phân công Giám khảo" key="assign">
            <Button 
              type="text" 
              style={{ color: '#8b5cf6' }} 
              icon={<UserPlus size={16} />} 
              onClick={() => {
                const peopleTab = document.querySelector('.ant-tabs-tab[data-node-key="people"]');
                if (peopleTab) {
                  peopleTab.click();
                  message.success(`Đã chuyển sang Tab Nhân sự để phân công Giám khảo.`);
                } else {
                  message.info(`Vui lòng chuyển sang Tab Nhân sự để phân công.`);
                }
              }} 
            />
          </Tooltip>
        );

        // Đã khóa chấm
        if (isLocked) {
          return (
            <Space size="middle">
              {!record.is_final ? (
                <Tooltip title="Kết quả chính thức">
                  <Button type="text" style={{ color: '#d48806' }} icon={<Trophy size={16} />} onClick={() => handleViewResults(record.id)} />
                </Tooltip>
              ) : (
                <Tooltip title="Bảng xếp hạng">
                  <Button type="text" style={{ color: '#1677ff' }} icon={<BarChart3 size={16} />} onClick={() => handleViewRanking(record.id)} />
                </Tooltip>
              )}
              <span style={{ color: '#8c8c8c', fontSize: 13 }}>Đã đóng sổ (Locked)</span>
            </Space>
          );
        }

        // Đang hoạt động
        if (record.is_active) {
          return (
            <Space size="middle">
              <Tooltip title="Xếp hạng tạm">
                <Button type="text" style={{ color: '#1677ff' }} icon={<BarChart3 size={16} />} onClick={() => handleViewRanking(record.id)} />
              </Tooltip>
              {assignJudgeBtn}
              <Tooltip title="Khóa chấm điểm (Force Lock)">
                <Button type="text" danger icon={<Lock size={16} />} onClick={() => {
                  setLockingRound(record);
                  setIsLockModalVisible(true);
                }} />
              </Tooltip>
            </Space>
          );
        }

        // Ngưng hoạt động (chưa chạy)
        return (
          <Space size="middle">
            <Tooltip title="Xếp hạng tạm">
              <Button type="text" style={{ color: '#1677ff' }} icon={<BarChart3 size={16} />} onClick={() => handleViewRanking(record.id)} />
            </Tooltip>
            
            <Tooltip title="Sửa vòng thi">
              <Button type="text" icon={<Edit size={16} />} onClick={() => handleEdit(record)} />
            </Tooltip>
            <Tooltip title="Kích hoạt Vòng thi">
              <Button type="text" style={{ color: '#10b981' }} icon={<PlayCircle size={16} />} onClick={() => handleActivateRound(record)} />
            </Tooltip>
            <Popconfirm title="Xóa vòng thi" description="Bạn có chắc chắn muốn xóa vòng thi này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
              <Button type="text" danger icon={<Trash2 size={16} />} />
            </Popconfirm>
            {assignJudgeBtn}
          </Space>
        );
      },
    },
  ];

  if (loading && rounds.length === 0) {
    return <Card style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></Card>;
  }

  // ==========================================
  // THÊM MỚI (BƯỚC 2): Tìm vòng thi đang hoạt động (ACTIVE)
  // ==========================================
  const activeRound = rounds.find(r => r.is_active);

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Vòng thi"
        description={<span style={{ fontSize: 12 }}>Tạo Sơ loại + Chung kết. Số đội đi tiếp nhập dự tính trước, xác nhận lại trước khi mở thi.</span>}
      />
      {/* ========================================== */}
      {/* THÊM MỚI (BƯỚC 2): Hiển thị Banner Đếm ngược */}
      {/* ========================================== */}
      {activeRound && <LiveCodingMonitor activeRound={activeRound} />}

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
                      if (round.scoring_locked || round.scoringLocked) {
                        return <Tag color="red" icon={<Lock size={12} style={{marginRight: 4}}/>}>Đã khóa chấm</Tag>;
                      }
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
                    {(round.scoring_locked || round.scoringLocked) ? (
                      <>
                        {!round.is_final ? (
                          <Tooltip title="Kết quả chính thức">
                            <Button size="small" type="text" style={{ color: '#d48806' }} icon={<Trophy size={14} />} onClick={() => handleViewResults(round.id)} />
                          </Tooltip>
                        ) : (
                          <Tooltip title="Bảng xếp hạng">
                            <Button size="small" type="text" style={{ color: '#1677ff' }} icon={<BarChart3 size={14} />} onClick={() => handleViewRanking(round.id)} />
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      <>
                        <Tooltip title="Xếp hạng tạm">
                          <Button size="small" type="text" style={{ color: '#1677ff' }} icon={<BarChart3 size={14} />} onClick={() => handleViewRanking(round.id)} />
                        </Tooltip>
                        {!round.is_active && (
                          <Tooltip title="Sửa vòng thi">
                            <Button size="small" type="text" icon={<Edit size={14} />} onClick={() => handleEdit(round)} />
                          </Tooltip>
                        )}
                      </>
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

      {/* ========================================== */}
      {/* BƯỚC 8: Modal Nhập lý do khóa điểm */}
      {/* ========================================== */}
      <Modal
        title={<span><Lock size={18} style={{ color: '#ef4444', marginRight: 8, verticalAlign: 'middle' }}/> Khóa chấm điểm Vòng thi</span>}
        open={isLockModalVisible}
        onOk={handleLockScoring}
        onCancel={() => setIsLockModalVisible(false)}
        confirmLoading={isLocking}
        okText="Xác nhận Khóa"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text>Bạn đang thực hiện khóa luồng chấm điểm của vòng: <strong>{lockingRound?.name}</strong>.</Text><br/>
          <Text type="danger">Lưu ý: Hành động này sẽ chốt sổ điểm, Giám khảo sẽ không thể chỉnh sửa điểm hay comment được nữa.</Text>
        </div>
        
        <div>
          <Text strong>Lý do khóa (force_lock_reason) <span style={{ color: 'red' }}>*</span></Text>
          <Input.TextArea 
            rows={3} 
            placeholder="Ví dụ: Đã hết thời gian chấm thi theo quy định..." 
            value={lockReason}
            onChange={(e) => setLockReason(e.target.value)}
            style={{ marginTop: 8 }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default RoundManagementPage;