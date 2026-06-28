import React, { useState } from 'react';
import { Card, List, Tag, Typography, Space, Button, Modal } from 'antd';
import { Gift, Award, Star, Plus, Trash2 } from 'lucide-react';
import AwardPrizeModal from './AwardPrizeModal';

const { Text } = Typography;

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

const PrizeListPanel = ({ data, loading, hackathonId, onRefresh, canAward, canRevoke, onRevoke }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const confirmRevoke = (prizeId) => {
    Modal.confirm({
      title: 'Thu hồi giải thưởng?',
      content: 'Chỉ thực hiện khi chưa chốt sổ.',
      okText: 'Thu hồi',
      cancelText: 'Hủy',
      okButtonProps: { danger: true, id: 'gd6-revoke-ok' },
      cancelButtonProps: { id: 'gd6-revoke-cancel' },
      onOk: () => onRevoke?.(prizeId),
    });
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
              id="gd6-award-trigger"
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
                size="small"
                onClick={() => confirmRevoke(item.id ?? item.prizeId)}
              >
                Thu hồi
              </Button>,
            ] : undefined}
          >
            <List.Item.Meta
              avatar={getPrizeIcon(prizeType)}
              title={
                <Space>
                  <Text strong style={{ fontSize: 16 }}>{prizeName}</Text>
                  {prizeType && <Tag color={getPrizeColor(prizeType)}>{prizeType}</Tag>}
                  {item.scope === 'INDIVIDUAL' && <Tag color="purple">Giải Cá nhân</Tag>}
                </Space>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  <div><strong>Phần thưởng:</strong> {prizeValue || 'Chưa công bố'}</div>
                  <div style={{ marginTop: 4 }}>
                    {item.scope === 'TEAM' || teamName ? (
                      <Text><strong>Đội đoạt giải:</strong> {teamName || 'Chưa có dữ liệu'}</Text>
                    ) : (
                      <Text><strong>Cá nhân xuất sắc:</strong> {item.user?.full_name || item.user?.fullName || 'Chưa có dữ liệu'}</Text>
                    )}
                  </div>
                </div>
              }
            />
          </List.Item>
        );}}
      />
      <AwardPrizeModal 
        visible={isModalVisible} 
        onClose={() => setIsModalVisible(false)}
        onSuccess={onRefresh}
        hackathonId={hackathonId}
      />
    </Card>
  );
};

export default PrizeListPanel;
