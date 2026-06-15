import React from 'react';
import { Table, Typography, Tag, Card } from 'antd';
import { Trophy, Medal } from 'lucide-react';

const { Text } = Typography;

const StudentFinalLeaderboard = ({ data, loading }) => {
  const getMedalColor = (rank) => {
    switch (rank) {
      case 1: return '#faad14'; // Gold
      case 2: return '#8c8c8c'; // Silver
      case 3: return '#d46b08'; // Bronze
      default: return 'transparent';
    }
  };

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      align: 'center',
      render: (rank) => {
        if (rank <= 3) {
          return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <Trophy size={18} color={getMedalColor(rank)} />
              <Text strong style={{ color: getMedalColor(rank) }}>Top {rank}</Text>
            </div>
          );
        }
        return <Text strong style={{ color: '#8c8c8c' }}>{rank}</Text>;
      }
    },
    {
      title: 'Đội thi',
      dataIndex: 'teamName',
      key: 'teamName',
      render: (text) => <Text strong style={{ fontSize: 16, color: '#1f1f1f' }}>{text}</Text>,
    },
    {
      title: 'Điểm tổng (Final)',
      dataIndex: 'totalScore',
      key: 'totalScore',
      align: 'right',
      render: (score) => (
        <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 16, fontWeight: 600 }}>
          {score.toFixed(2)}
        </Tag>
      )
    }
  ];

  return (
    <Card 
      style={{ 
        background: '#fff', 
        border: '1px solid #f0f0f0', 
        borderRadius: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}
      bodyStyle={{ padding: 24 }}
    >
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: 8, background: '#e6f4ff', borderRadius: 12, display: 'flex' }}>
          <Medal size={20} color="#1677ff" />
        </div>
        <h3 style={{ margin: 0, color: '#1f1f1f', fontSize: 18 }}>Bảng xếp hạng Chung cuộc</h3>
      </div>

      <Table 
        columns={columns} 
        dataSource={data} 
        rowKey="teamId"
        loading={loading}
        pagination={false}
        rowClassName={(record) => record.rank <= 3 ? 'top-tier-row' : ''}
      />
      <style>{`
        .ant-table-thead > tr > th { background: #fafafa !important; color: #595959 !important; font-weight: 600 !important; }
        .top-tier-row { background: linear-gradient(90deg, rgba(250, 173, 20, 0.05) 0%, rgba(255,255,255,0) 100%); }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f0f0f0 !important; }
        .ant-table-cell::before { display: none !important; /* Xoá gạch dọc ở header */ }
      `}</style>
    </Card>
  );
};

export default StudentFinalLeaderboard;
