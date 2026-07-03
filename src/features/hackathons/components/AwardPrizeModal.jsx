import { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, InputNumber, message } from 'antd';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';

const { Option } = Select;
const { TextArea } = Input;

const PRIZE_RANKS = [
  { value: 'FIRST', label: 'Giải Nhất (First Prize)' },
  { value: 'SECOND', label: 'Giải Nhì (Second Prize)' },
  { value: 'THIRD', label: 'Giải Ba (Third Prize)' },
  { value: 'CONSOLATION', label: 'Giải Khuyến khích (Consolation)' },
  { value: 'OTHER', label: 'Giải Khác (Other)' }
];

const AwardPrizeModal = ({ visible, onClose, onSuccess, hackathonId, awardedTeamIds = [], awardedRanks = [] }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // Data cho Dropdown
  const [rounds, setRounds] = useState([]);
  const [teams, setTeams] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);

  useEffect(() => {
    if (visible && hackathonId) {
      fetchDropdownData();
    } else {
      form.resetFields();
    }
  }, [visible, hackathonId]);

  const fetchDropdownData = async () => {
    setFetchingData(true);
    try {
      const [roundsData, teamsData] = await Promise.all([
        hackathonResultsService.getHackathonRounds(hackathonId),
        hackathonResultsService.getHackathonTeams(hackathonId)
      ]);
      
      const parsedRounds = Array.isArray(roundsData) ? roundsData : [];
      const parsedTeams = Array.isArray(teamsData) ? teamsData : [];
      
      setRounds(parsedRounds);
      setTeams(parsedTeams);

      if (parsedRounds.length > 0) {
        const finalRound = parsedRounds.find(
          (r) => r.isFinal === true || r.name?.toLowerCase().includes('chung kết'),
        );
        const defaultRoundId = finalRound ? finalRound.id : parsedRounds[parsedRounds.length - 1].id;
        form.setFieldsValue({ roundId: defaultRoundId });
      }
    } catch (error) {
      message.error("Lỗi khi tải danh sách Đội thi và Vòng thi.");
    } finally {
      setFetchingData(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const payload = {
        roundId: values.roundId,
        teamId: values.teamId,
        trackId: values.trackId, // Có thể undefined
        prizeName: values.prizeName,
        prizeRank: values.prizeRank,
        prizeValue: values.prizeValue,
        description: values.description
      };

      await hackathonResultsService.awardPrize(hackathonId, payload);
      message.success("Trao giải thành công!");
      onSuccess();
      onClose();
    } catch (error) {
      if (error?.errorFields) return;
      const { message: msg } = resolveProgressionError(error, 'Đã có lỗi xảy ra khi trao giải.');
      message.error(`Trao giải thất bại: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const awardedTeamSet = new Set(awardedTeamIds.map(String));
  const awardedRankSet = new Set(awardedRanks.map(String));
  const eligibleTeams = teams.filter((t) => {
    const id = String(t.id || t.teamId);
    const status = String(t.participationStatus || t.participation_status || t.status || '').toUpperCase();
    if (status === 'ELIMINATED') return false;
    return !awardedTeamSet.has(id);
  });

  return (
    <Modal
      title="Trao Giải Thưởng Mới"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="Lưu giải thưởng"
      cancelText="Hủy"
      okButtonProps={{ id: 'hackathon-award-save' }}
      width={600}
    >
      <Form form={form} layout="vertical" disabled={fetchingData}>
        
        <Form.Item 
          name="roundId" 
          label="Vòng thi (Round)" 
          rules={[{ required: true, message: 'Vui lòng chọn Vòng thi' }]}
        >
          <Select placeholder="Chọn vòng thi" loading={fetchingData}>
            {rounds.map(r => (
              <Option key={r.id} value={r.id}>
                {r.name} {r.isFinal ? '(Chung kết)' : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="teamId" 
          label="Đội đạt giải (Team)" 
          rules={[{ required: true, message: 'Vui lòng chọn Đội thi' }]}
        >
          <Select 
            placeholder="Tìm kiếm và chọn đội" 
            showSearch 
            optionFilterProp="children"
            loading={fetchingData}
          >
            {eligibleTeams.map((t) => (
              <Option key={t.id || t.teamId} value={t.id || t.teamId}>
                {t.teamName || t.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="prizeName" 
          label="Tên giải thưởng (Hiển thị cho sinh viên)" 
          rules={[{ required: true, message: 'Vui lòng nhập tên giải' }]}
        >
          <Input placeholder="Ví dụ: Giải Nhất Toàn Đoàn, Giải Ý tưởng sáng tạo..." />
        </Form.Item>

        <Form.Item 
          name="prizeRank" 
          label="Xếp hạng cấp bậc (Rank)" 
          rules={[{ required: true, message: 'Vui lòng chọn cấp bậc' }]}
        >
          <Select placeholder="Chọn hạng giải">
            {PRIZE_RANKS.map((rank) => (
              <Option key={rank.value} value={rank.value} disabled={awardedRankSet.has(rank.value)}>
                {rank.label}
                {awardedRankSet.has(rank.value) ? ' (đã trao)' : ''}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item 
          name="prizeValue" 
          label="Tiền thưởng (Tùy chọn)"
        >
          <InputNumber 
            style={{ width: '100%' }} 
            placeholder="Ví dụ: 10000000" 
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => value.replace(/\$\s?|(,*)/g, '')}
            addonAfter="VNĐ"
          />
        </Form.Item>

        <Form.Item 
          name="description" 
          label="Mô tả thêm / Lời chúc (Tùy chọn)"
        >
          <TextArea rows={3} placeholder="Ghi chú thêm về giải thưởng này..." />
        </Form.Item>

      </Form>
    </Modal>
  );
};

export default AwardPrizeModal;
