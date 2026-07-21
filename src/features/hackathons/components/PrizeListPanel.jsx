import { useState } from 'react';
import { Card, List, Tag, Typography, Space, Button, Modal, Select, Input } from 'antd';
import { Gift, Award, Star, Plus, Trash2 } from 'lucide-react';
import AwardPrizeModal from './AwardPrizeModal';
import { PRIZE_TYPE_LABELS, labelOf } from '../../../shared/constants/labels';

const { Text } = Typography;

const REVOKE_CATEGORIES = [
  { value: 'AWARDED_IN_ERROR', label: 'Trao nhầm / sai đội' },
  { value: 'TEAM_DQ', label: 'Đội bị loại / DQ sau trao giải' },
  { value: 'DUPLICATE_AWARD', label: 'Trùng giải' },
  { value: 'OTHER', label: 'Khác (ghi rõ trong ghi chú)' },
];

const getPrizeIcon = (type) => {
  switch (type) {
    case 'FIRST': return <Award size={24} color="#fadb14" />;
    case 'SECOND': return <Award size={24} color="#d4af37" />;
    case 'THIRD': return <Award size={24} color="#cd7f32" />;
    case 'CREATIVE':
    case 'PRACTICAL': return <Star size={24} color="#1890ff" />;
    default: return <Gift size={24} color="#52c41a" />;
  }
};

const getPrizeColor = (type) => {
  switch (type) {
    case 'FIRST': return 'gold';
    case 'SECOND': return 'lime';
    case 'THIRD': return 'orange';
    case 'CREATIVE':
    case 'PRACTICAL': return 'blue';
    default: return 'green';
  }
};

const PrizeListPanel = ({ data, loading, hackathonId, onRefresh, canAward, canRevoke, onRevoke, awardedTeamIds = [], awardedRanks = [] }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [revokeModal, setRevokeModal] = useState({
    open: false,
    prizeId: null,
    prizeName: '',
    category: undefined,
    note: '',
  });

  const openRevoke = (item) => {
    setRevokeModal({
      open: true,
      prizeId: item.id ?? item.prizeId,
      prizeName: item.prizeName ?? item.prize_name ?? 'Giải thưởng',
      category: undefined,
      note: '',
    });
  };

  const confirmRevoke = async () => {
    if (!revokeModal.category || !revokeModal.note.trim()) return;
    await onRevoke?.(revokeModal.prizeId, {
      category: revokeModal.category,
      note: revokeModal.note.trim(),
    });
    setRevokeModal({ open: false, prizeId: null, prizeName: '', category: undefined, note: '' });
  };

  return (
    <Card
      loading={loading}
      bordered={true}
      style={{ marginTop: 16 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Danh sách Giải thưởng</span>
          {canAward && (
            <Button
              type="primary"
              icon={<Plus size={16} />}
              id="hackathon-award-trigger"
              onClick={() => setIsModalVisible(true)}
            >
              Trao giải mới
            </Button>
          )}
        </div>
      }
    >
      <List
        itemLayout="horizontal"
        dataSource={data}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        renderItem={(item) => {
          const prizeName = item.prizeName ?? item.prize_name ?? 'Giải thưởng';
          const prizeType = item.prizeRank ?? item.prize_type ?? item.prize_rank;
          const prizeValue = item.prizeValue ?? item.prize_value;
          const teamName = item.teamName ?? item.team?.team_name ?? item.team?.teamName;
          return (
          <List.Item
            actions={canRevoke && (item.id ?? item.prizeId) ? [
              <Button
                key="revoke"
                type="text"
                danger
                icon={<Trash2 size={16} />}
                id={`hackathon-revoke-${item.id ?? item.prizeId}`}
                onClick={() => openRevoke(item)}
              >
                Thu hồi
              </Button>,
            ] : undefined}
          >
            <List.Item.Meta
              avatar={getPrizeIcon(prizeType)}
              title={
                <Space>
                  <Text strong>{prizeName}</Text>
                  {prizeType && (
                    <Tag color={getPrizeColor(prizeType)}>
                      {labelOf(PRIZE_TYPE_LABELS, prizeType, prizeType)}
                    </Tag>
                  )}
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <Text type="secondary">Đội: {teamName || '—'}</Text>
                  {prizeValue && <Text type="secondary">Giá trị: {prizeValue}</Text>}
                </Space>
              }
            />
          </List.Item>
          );
        }}
      />

      <AwardPrizeModal
        visible={isModalVisible}
        hackathonId={hackathonId}
        onClose={() => setIsModalVisible(false)}
        onSuccess={() => {
          setIsModalVisible(false);
          onRefresh?.();
        }}
        awardedTeamIds={awardedTeamIds}
        awardedRanks={awardedRanks}
      />

      <Modal
        title={`Thu hồi giải: ${revokeModal.prizeName}`}
        open={revokeModal.open}
        onOk={confirmRevoke}
        onCancel={() => setRevokeModal({ open: false, prizeId: null, prizeName: '', category: undefined, note: '' })}
        okText="Thu hồi"
        cancelText="Hủy"
        okButtonProps={{
          danger: true,
          id: 'hackathon-revoke-ok',
          disabled: !revokeModal.category || !revokeModal.note.trim(),
        }}
        cancelButtonProps={{ id: 'hackathon-revoke-cancel' }}
        data-testid="prize-revoke-modal"
      >
        <Text type="secondary">
          Thu hồi giải là hành động công khai — bắt buộc chọn lý do và ghi chú (chuẩn ngang Override vé vớt).
        </Text>
        <div style={{ marginTop: 12 }}>
          <Text strong>Lý do (category) *</Text>
          <Select
            style={{ width: '100%', marginTop: 6 }}
            placeholder="Chọn lý do thu hồi"
            value={revokeModal.category}
            options={REVOKE_CATEGORIES}
            onChange={(category) => setRevokeModal((p) => ({ ...p, category }))}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <Text strong>Ghi chú *</Text>
          <Input.TextArea
            rows={3}
            style={{ marginTop: 6 }}
            placeholder="Mô tả rõ lý do thu hồi…"
            value={revokeModal.note}
            onChange={(e) => setRevokeModal((p) => ({ ...p, note: e.target.value }))}
          />
        </div>
      </Modal>
    </Card>
  );
};

export default PrizeListPanel;
