import { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Select, Input, InputNumber, message, Table, Typography, Space, Tag } from 'antd';
import { Trophy } from 'lucide-react';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

const PRIZE_RANKS = [
  { value: 'FIRST', label: 'Giải Nhất (First Prize)' },
  { value: 'SECOND', label: 'Giải Nhì (Second Prize)' },
  { value: 'THIRD', label: 'Giải Ba (Third Prize)' },
  { value: 'HONORABLE', label: 'Giải Khuyến khích (Honorable)' },
  { value: 'SPECIAL', label: 'Giải đặc biệt (Special)' },
];

const normalizeRankingRow = (item, index) => {
  const teamId = item.teamId ?? item.team_id;
  const rank = item.rank ?? item.hackathon_rank ?? index + 1;
  const teamName = item.teamName ?? item.team_name ?? 'N/A';
  const score = Number(item.weightedAvgScore ?? item.weighted_avg_score ?? 0);
  return {
    key: String(teamId ?? index),
    teamId,
    rank,
    teamName,
    score,
    chapterName: item.chapterName ?? item.chapter_name ?? '',
  };
};

const AwardPrizeModal = ({ visible, onClose, onSuccess, hackathonId, awardedTeamIds = [], awardedRanks = [] }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [finalRounds, setFinalRounds] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [fetchingData, setFetchingData] = useState(false);
  const selectedTeamId = Form.useWatch('teamId', form);

  useEffect(() => {
    if (visible && hackathonId) {
      fetchDropdownData();
    } else {
      form.resetFields();
      setRankings([]);
      setFinalRounds([]);
    }
  }, [visible, hackathonId]);

  const fetchDropdownData = async () => {
    setFetchingData(true);
    try {
      const [roundsData, rankingsData] = await Promise.all([
        hackathonResultsService.getHackathonRounds(hackathonId),
        hackathonResultsService.getTeamRankings(hackathonId),
      ]);

      const parsedRounds = Array.isArray(roundsData) ? roundsData : [];
      const onlyFinal = parsedRounds.filter(
        (r) => r.isFinal === true || r.is_final === true || r.name?.toLowerCase().includes('chung kết'),
      );
      setFinalRounds(onlyFinal.length > 0 ? onlyFinal : parsedRounds.filter((r) => r.isFinal || r.is_final));

      const rows = (Array.isArray(rankingsData) ? rankingsData : [])
        .map(normalizeRankingRow)
        .filter((r) => r.teamId != null)
        .sort((a, b) => a.rank - b.rank);
      setRankings(rows);

      const defaultRound = onlyFinal[0] || parsedRounds.find((r) => r.isFinal || r.is_final);
      if (defaultRound) {
        form.setFieldsValue({ roundId: defaultRound.id });
      }
    } catch (_error) {
      message.error('Lỗi khi tải bảng xếp hạng Chung kết.');
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
        trackId: values.trackId,
        prizeName: values.prizeName,
        prizeRank: values.prizeRank,
        prizeValue: values.prizeValue,
        description: values.description,
      };

      await hackathonResultsService.awardPrize(hackathonId, payload);
      message.success('Trao giải thành công!');
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

  const awardedTeamSet = useMemo(() => new Set(awardedTeamIds.map(String)), [awardedTeamIds]);
  const awardedRankSet = useMemo(() => new Set(awardedRanks.map(String)), [awardedRanks]);

  const eligibleRankings = useMemo(
    () => rankings.filter((r) => !awardedTeamSet.has(String(r.teamId))),
    [rankings, awardedTeamSet],
  );

  const rankingColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      width: 88,
      render: (rank) => {
        let color = '';
        if (rank === 1) color = 'gold';
        else if (rank === 2) color = 'silver';
        else if (rank === 3) color = '#cd7f32';
        return color ? (
          <Tag color={color} icon={<Trophy size={12} />}>
            Top {rank}
          </Tag>
        ) : (
          <Tag>#{rank}</Tag>
        );
      },
    },
    {
      title: 'Đội',
      dataIndex: 'teamName',
      ellipsis: true,
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      width: 80,
      render: (v) => Number(v).toFixed(2),
    },
  ];

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
      width={780}
    >
      <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
        <Text strong>BXH Chung kết — chọn đội theo hạng</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Chỉ đội vào Chung kết. Click hàng để chọn đội đạt giải.
        </Text>
        <Table
          size="small"
          loading={fetchingData}
          columns={rankingColumns}
          dataSource={eligibleRankings}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          rowKey="key"
          locale={{ emptyText: 'Chưa có BXH Chung kết / không còn đội đủ điều kiện' }}
          onRow={(record) => ({
            onClick: () => form.setFieldsValue({ teamId: record.teamId }),
            style: {
              cursor: 'pointer',
              background:
                String(selectedTeamId) === String(record.teamId) ? 'rgba(22, 119, 255, 0.08)' : undefined,
            },
          })}
        />
      </Space>

      <Form form={form} layout="vertical" disabled={fetchingData}>
        <Form.Item
          name="roundId"
          label="Vòng Chung kết"
          rules={[{ required: true, message: 'Vui lòng chọn vòng Chung kết' }]}
        >
          <Select placeholder="Vòng Chung kết" loading={fetchingData}>
            {finalRounds.map((r) => (
              <Option key={r.id} value={r.id}>
                {r.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="teamId"
          label="Đội đạt giải"
          rules={[{ required: true, message: 'Vui lòng chọn đội từ BXH ở trên' }]}
        >
          <Select
            placeholder="Chọn đội (hoặc click hàng BXH)"
            showSearch
            optionFilterProp="label"
            loading={fetchingData}
            options={eligibleRankings.map((t) => ({
              value: t.teamId,
              label: `#${t.rank} · ${t.teamName} · ${t.score.toFixed(2)}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="prizeName"
          label="Tên giải thưởng"
          rules={[{ required: true, message: 'Vui lòng nhập tên giải' }]}
        >
          <Input placeholder="Ví dụ: Giải Nhất Toàn Đoàn..." />
        </Form.Item>

        <Form.Item
          name="prizeRank"
          label="Cấp bậc giải"
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

        <Form.Item name="prizeValue" label="Tiền thưởng (tùy chọn)">
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Ví dụ: 10000000"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            addonAfter="VNĐ"
          />
        </Form.Item>

        <Form.Item name="description" label="Ghi chú (tùy chọn)">
          <TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AwardPrizeModal;
