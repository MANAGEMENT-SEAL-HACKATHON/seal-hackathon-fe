import React, { useState } from 'react';
import { Card, List, Tag, Typography, Space, Button } from 'antd';
import { Gift, Award, Star, Plus } from 'lucide-react';
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

const PrizeListPanel = ({ data, loading, hackathonId, onRefresh }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  return (
    <Card 
      loading={loading} 
      bordered={true} 
      style={{ marginTop: 16 }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Danh sách Giải thưởng</span>
          <Button 
            type="primary" 
            icon={<Plus size={16} />} 
            onClick={() => setIsModalVisible(true)}
          >
            Trao giải mới
          </Button>
        </div>
      }
    >
      <List
        itemLayout="horizontal"
        dataSource={data}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              avatar={getPrizeIcon(item.prize_type)}
              title={
                <Space>
                  <Text strong style={{ fontSize: 16 }}>{item.prize_name}</Text>
                  <Tag color={getPrizeColor(item.prize_type)}>{item.prize_type}</Tag>
                  {item.scope === 'INDIVIDUAL' && <Tag color="purple">Giải Cá nhân</Tag>}
                </Space>
              }
              description={
                <div style={{ marginTop: 8 }}>
                  <div><strong>Phần thưởng:</strong> {item.prize_value || 'Chưa công bố'}</div>
                  <div style={{ marginTop: 4 }}>
                    {item.scope === 'TEAM' ? (
                      <Text><strong>Đội đoạt giải:</strong> {item.team?.team_name || 'Chưa có dữ liệu'}</Text>
                    ) : (
                      <Text><strong>Cá nhân xuất sắc:</strong> {item.user?.full_name || 'Chưa có dữ liệu'}</Text>
                    )}
                  </div>
                </div>
              }
            />
          </List.Item>
        )}
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
