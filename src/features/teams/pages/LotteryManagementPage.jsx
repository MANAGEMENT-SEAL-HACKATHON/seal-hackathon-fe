// src/features/teams/pages/LotteryManagementPage.jsx
import { useState } from 'react';
import { Card, Table, Button, Space, Select, Typography, Tag, Modal, Input, Form, Alert, theme, message, Empty, Tooltip } from 'antd';
import { Shuffle, Edit, Repeat, LayoutGrid, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useLotteryManagement } from '../hooks/useLotteryManagement';
import { isRegistrationClosedEarly, isRegistrationPeriodEnded } from '../../hackathons/utils/hackathonRegistrationRules';
import SectionHeader, { HintList } from '../../../shared/components/ui/SectionHeader';
import { ROUTES } from '../../../shared/constants/routes';


const { Text } = Typography;
const { Option } = Select;
const { useToken } = theme;

const LOTTERY_TAB_HINT = (
  <HintList
    items={[
      'Chỉ bốc thăm sau khi kết thúc đăng ký (hoặc kết thúc sớm) và khóa đội',
      'Xử lý hết đội PENDING (duyệt / từ chối sớm) trước khi bốc thăm',
      'Gán chủ đề cho từng bảng đấu trước',
      'Bốc thăm tự động để phân bảng cho các đội đã duyệt',
      'Sau khi phân bảng xong, kích hoạt vòng Sơ loại',
    ]}
  />
);

const LotteryManagementPage = ({ hackathonId, onUpdated, onGoToGeneral }) => {
  const { token } = useToken();
  const navigate = useNavigate();
  const [topicModalVisible, setTopicModalVisible] = useState(false);
  const [changeTrackModalVisible, setChangeTrackModalVisible] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  
  const [form] = Form.useForm();
  const [trackForm] = Form.useForm();

  const {
    rounds, tracks, activeTeams, pendingBuckets, hackathon, isLoading,
    selectedRoundId, setSelectedRoundId, lotteryGate,
    handleAssignTopic, handleRunAutoLottery, handleChangeTrack
  } = useLotteryManagement(hackathonId, onUpdated);

  const closedEarly = isRegistrationClosedEarly(hackathon);
  const regStillOpen = hackathon && !isRegistrationPeriodEnded(hackathon);
  const lotteryStatusText = lotteryGate.allowed
    ? closedEarly
      ? 'Đăng ký đã kết thúc sớm và đội đã khóa — có thể bốc thăm tự động.'
      : 'Đăng ký đã kết thúc và đội đã khóa — có thể bốc thăm.'
    : lotteryGate.reason || 'Chưa thể bốc thăm: cần kết thúc đăng ký và khóa đội trước.';

  const noApprovedTeams = !isLoading && activeTeams.length === 0;
  const hasPending = (pendingBuckets?.total || 0) > 0;
  const teamsUrl = `${ROUTES.GLOBAL_TEAMS}?hackathonId=${hackathonId}&status=PENDING`;

  // Lọc Bảng đấu theo vòng đang chọn
  const currentTracks = tracks.filter(t => (t.round_id || t.roundId) === selectedRoundId);

  // Cột cho Bảng 1: Quản lý Topic của Track
  const trackColumns = [
    { title: 'Tên Bảng đấu', dataIndex: 'name', key: 'name', render: t => <strong>{t}</strong> },
    { title: 'Chủ đề', dataIndex: 'topic', key: 'topic', render: t => t ? <Tag color="blue">{t}</Tag> : <Text type="secondary">Chưa có chủ đề</Text> },
    { title: 'Số đội tối đa', key: 'maxTeams', render: (_, record) => record.max_teams_per_group || record.maxTeamsPerGroup || 'Không giới hạn' },
    {
      title: 'Thao tác', key: 'action', width: 120,
      render: (_, record) => (
        <Button 
          type="text" 
          icon={<Edit size={16} />} 
          onClick={() => {
            setEditingTrack(record);
            form.setFieldsValue({ topic: record.topic });
            setTopicModalVisible(true);
          }}
        >
          Gán Chủ đề
        </Button>
      )
    }
  ];

  // Cột cho Bảng 2: Danh sách Đội thi & Bốc thăm
  const teamColumns = [
    { title: 'Tên Đội', dataIndex: 'teamName', key: 'teamName', render: t => <strong>{t}</strong> },
    {
      title: 'Khóa đội',
      key: 'isLocked',
      width: 110,
      render: (_, record) => {
        const locked = record.isLocked ?? record.is_locked;
        return locked ? <Tag color="red">Đã khóa</Tag> : <Tag color="default">Chưa khóa</Tag>;
      },
    },
    { 
      title: 'Bảng đấu hiện tại', 
      key: 'track', 
      render: (_, record) => {
        // Mock logic lấy track hiện tại của đội (Backend trả về mảng participation)
        // Thay thế 'record.track_name' bằng field chính xác từ API response của team bạn
        const trackName = record.trackName || record.track_name; 
        return trackName ? <Tag color="geekblue">{trackName}</Tag> : <Tag color="default">Chưa phân bảng</Tag>;
      } 
    },
    {
      title: 'Thao tác', key: 'action', width: 150, align: 'right',
      render: (_, record) => (
        <Button 
          type="dashed" 
          icon={<Repeat size={14} />} 
          onClick={() => {
            setEditingTeam(record);
            trackForm.resetFields();
            setChangeTrackModalVisible(true);
          }}
        >
          Đổi Bảng
        </Button>
      )
    }
  ];

  return (
    <div style={{ padding: '24px 0', animation: 'fadeInUp 0.4s ease-out both' }}>
      <SectionHeader title="Bốc thăm & khai mạc" info={LOTTERY_TAB_HINT} />

      {/* Khung Chọn Vòng Thi */}
      <Card style={{ marginBottom: 24, borderRadius: 12, boxShadow: token.boxShadowTertiary }}>
        <Select 
          style={{ width: 300 }} 
          size="large"
          placeholder="Chọn Vòng Sơ loại"
          value={selectedRoundId}
          onChange={setSelectedRoundId}
          loading={isLoading}
        >
          {rounds.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
        </Select>
      </Card>

      {!selectedRoundId ? (
        <Alert message="Vui lòng tạo và chọn Vòng Sơ loại trước khi thực hiện Bốc thăm." type="warning" showIcon />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          {/* SECTION 1: GÁN TOPIC */}
          <Card 
            title={<Space><LayoutGrid size={18} /> Gán Chủ đề cho Bảng đấu</Space>} 
            style={{ borderRadius: 12, borderTop: '3px solid #818cf8' }}
          >
            <Table 
              dataSource={currentTracks} 
              columns={trackColumns} 
              rowKey="id" 
              pagination={false} 
              loading={isLoading}
              locale={{ emptyText: 'Chưa có Bảng đấu nào trong vòng này' }}
            />
          </Card>

          {/* SECTION 2: BỐC THĂM ĐỘI THI */}
          <Card 
            title={<Space><Shuffle size={18} /> Bốc thăm Bảng đấu cho Đội thi (Lottery)</Space>}
            style={{ borderRadius: 12, borderTop: '3px solid #10b981' }}
            extra={
              !noApprovedTeams ? (
              <Tooltip title={!lotteryGate.allowed ? lotteryGate.reason : undefined}>
                <span style={{ display: 'inline-block' }}>
                  <Button
                    type="primary"
                    icon={<Shuffle size={16} />}
                    onClick={handleRunAutoLottery}
                    loading={isLoading}
                    disabled={!lotteryGate.allowed}
                    data-testid="lottery-run-auto-btn"
                    style={{ background: lotteryGate.allowed ? 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' : undefined, boxShadow: lotteryGate.allowed ? '0 4px 12px rgba(16, 185, 129, 0.25)' : undefined }}
                  >
                    Bốc thăm Tự động (Cho đội chưa có)
                  </Button>
                </span>
              </Tooltip>
              ) : null
            }
          >
            {hasPending ? (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16, borderRadius: 8 }}
                message={`Còn ${pendingBuckets.total} đội đang chờ xử lý — chưa thể bốc thăm`}
                description={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    {pendingBuckets.awaitingApproval.length > 0 && (
                      <Text>
                        {pendingBuckets.awaitingApproval.length} đội đã xác nhận — đang chờ bạn duyệt
                      </Text>
                    )}
                    {pendingBuckets.inGrace.length > 0 && (
                      <Text>
                        {pendingBuckets.inGrace.length} đội chưa xác nhận — hạn gần nhất{' '}
                        {pendingBuckets.earliestGraceDeadlineAt
                          ? dayjs(pendingBuckets.earliestGraceDeadlineAt).format('DD/MM/YYYY HH:mm')
                          : '—'}{' '}
                        (có thể từ chối sớm để mở khóa)
                      </Text>
                    )}
                    {pendingBuckets.blockedOther.length > 0 && (
                      <Text>
                        {pendingBuckets.blockedOther.length} đội cần xem lại / từ chối
                      </Text>
                    )}
                    <Button type="primary" size="small" onClick={() => navigate(teamsUrl)}>
                      Xử lý danh sách đội thi
                    </Button>
                  </Space>
                }
              />
            ) : null}
            {noApprovedTeams ? (
              <Empty
                image={
                  <div style={{ display: 'flex', justifyContent: 'center', opacity: 0.35, marginBottom: 8 }}>
                    <Users size={72} strokeWidth={1.25} color="#64748b" />
                  </div>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <Text strong style={{ fontSize: 15 }}>Chưa có đội đã duyệt để bốc thăm</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Duyệt đội thi trước, hoặc đảm bảo đăng ký đã đóng và đội đã khóa.
                    </Text>
                  </Space>
                }
                style={{ padding: '40px 16px' }}
              >
                <Space wrap>
                  <Button type="primary" onClick={() => navigate(ROUTES.GLOBAL_TEAMS)}>
                    Đi đến Quản lý đội
                  </Button>
                  {regStillOpen && onGoToGeneral ? (
                    <Button onClick={onGoToGeneral}>Sang Cấu hình chung</Button>
                  ) : null}
                </Space>
              </Empty>
            ) : (
              <>
            <Alert
              message={lotteryStatusText}
              type={lotteryGate.allowed ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16, borderRadius: 8 }}
            />
            <Table 
              dataSource={activeTeams} 
              columns={teamColumns} 
              rowKey="id" 
              loading={isLoading}
              pagination={{ pageSize: 10 }}
            />
              </>
            )}
          </Card>
        </Space>
      )}

      {/* Modal 1: Gán Topic */}
      <Modal
        title={`Gán Topic: ${editingTrack?.name}`}
        open={topicModalVisible}
        onCancel={() => setTopicModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={isLoading}
      >
        <Form form={form} layout="vertical" onFinish={(vals) => {
          handleAssignTopic(editingTrack.id, vals.topic, editingTrack).then(() => setTopicModalVisible(false));
        }}>
          <Form.Item 
            name="topic" 
            label="Nhập Chủ đề thi đấu" 
            rules={[{ required: true, message: 'Bắt buộc nhập chủ đề' }]}
          >
            <Input.TextArea rows={3} placeholder="Ví dụ: Ứng dụng AI trong Nông nghiệp..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 2: Đổi Track (Re-Lottery) */}
      {/* Modal 2: Đổi Track (Re-Lottery) */}
      <Modal
        title={`Đổi Bảng đấu cho Đội: ${editingTeam?.teamName || editingTeam?.team_name}`}
        open={changeTrackModalVisible}
        onCancel={() => setChangeTrackModalVisible(false)}
        onOk={() => trackForm.submit()}
        confirmLoading={isLoading}
      >
        <Alert message="Lưu ý: Chỉ có thể đổi bảng khi Vòng thi CHƯA BẮT ĐẦU." type="warning" showIcon style={{ marginBottom: 16 }} />
        
        {/* ĐOẠN ĐƯỢC CẬP NHẬT: Thêm logic Validation chặn trùng bảng */}
        <Form form={trackForm} layout="vertical" onFinish={(vals) => {
          
          // 1. KIỂM TRA: Nếu Bảng đấu vừa chọn giống hệt bảng đấu hiện tại của đội
          if (vals.trackId === editingTeam?.trackId || vals.trackId === editingTeam?.track_id) {
            message.warning('Đội thi hiện đã nằm trong Bảng đấu này. Vui lòng chọn Bảng khác!');
            return; // Dừng lại ngay lập tức, KHÔNG gọi API xuống Backend
          }

          // 2. GỌI API: Nếu chọn bảng mới thì mới chạy lệnh này
          handleChangeTrack(editingTeam.id, vals.trackId).then(() => setChangeTrackModalVisible(false));
          
        }}>
          <Form.Item name="trackId" label="Chọn Bảng đấu mới" rules={[{ required: true, message: 'Vui lòng chọn bảng đấu' }]}>
            <Select placeholder="-- Chọn bảng đấu --">
              {currentTracks.map(t => <Option key={t.id} value={t.id}>{t.name} (Tối đa: {t.max_teams_per_group || t.maxTeamsPerGroup || '∞'})</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default LotteryManagementPage;