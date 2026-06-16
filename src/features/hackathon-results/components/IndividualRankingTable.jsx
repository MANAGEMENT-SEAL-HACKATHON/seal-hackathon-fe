import React from 'react';
import { Table, Tag } from 'antd';
import { User } from 'lucide-react';

const IndividualRankingTable = ({ data, loading }) => {
  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      render: (rank) => `#${rank}`
    },
    {
      title: 'Thí sinh',
      dataIndex: 'user_name',
      key: 'user_name',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={14} />
          <span>{text}</span>
        </div>
      )
    },
    {
      title: 'Đội thi',
      dataIndex: 'team_name',
      key: 'team_name',
    },
    {
      title: 'Điểm kỳ này',
      dataIndex: 'score_this_hackathon',
      key: 'score_this_hackathon',
      render: (val) => Number(val).toFixed(2)
    },
    {
      title: 'Điểm Tích Luỹ',
      dataIndex: 'cumulative_score',
      key: 'cumulative_score',
      render: (val) => <Tag color="cyan">{Number(val).toFixed(2)}</Tag>
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      pagination={false}
      rowKey="key"
      bordered
    />
  );
};

export default IndividualRankingTable;
