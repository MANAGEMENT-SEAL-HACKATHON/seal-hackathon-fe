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
        return <Text strong type="secondary">{rank}</Text>;
      }
    },
    {
      title: 'Đội thi',
      dataIndex: 'teamName',
      key: 'teamName',
      render: (text) => <Text strong style={{ fontSize: 16 }}>{text}</Text>,
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
        background: 'var(--ant-color-bg-container)', 
        border: '1px solid var(--ant-color-border-secondary)', 
        borderRadius: 16,
        boxShadow: 'var(--ant-box-shadow-tertiary)'
      }}
      bodyStyle={{ padding: 24 }}
    >
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ padding: 8, background: 'var(--ant-color-primary-bg)', borderRadius: 12, display: 'flex' }}>
          <Medal size={20} color="var(--ant-color-primary)" />
        </div>
        <h3 style={{ margin: 0, fontSize: 18 }}>Bảng xếp hạng Chung cuộc</h3>
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
        .ant-table-thead > tr > th { background: var(--ant-color-fill-alter) !important; color: var(--ant-color-text-secondary) !important; font-weight: 600 !important; }
        .top-tier-row { background: linear-gradient(90deg, var(--ant-color-warning-bg) 0%, transparent 100%); }
        .ant-table-tbody > tr > td { border-bottom: 1px solid var(--ant-color-border-secondary) !important; }
        .ant-table-cell::before { display: none !important; /* Xoá gạch dọc ở header */ }
      `}</style>
    </Card>
  );
};

export default StudentFinalLeaderboard;
