import React from 'react';
import { Table, Tag } from 'antd';
import { Medal } from 'lucide-react';

const ChapterRankingTable = ({ data, loading }) => {
  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      render: (rank) => rank <= 3 ? <Tag color="blue" icon={<Medal size={14} />}>#{rank}</Tag> : `#${rank}`
    },
    {
      title: 'Cơ sở',
      dataIndex: 'chapter_name',
      key: 'chapter_name',
    },
    {
      title: 'Đội tham gia CK',
      dataIndex: 'teams_participated',
      key: 'teams_participated',
    },
    {
      title: 'Điểm Đội cao nhất',
      dataIndex: 'best_team_score',
      key: 'best_team_score',
      render: (val) => Number(val).toFixed(2)
    },
    {
      title: 'Điểm thưởng (Giải)',
      dataIndex: 'prize_bonus',
      key: 'prize_bonus',
      render: (val) => `+${Number(val).toFixed(2)}`
    },
    {
      title: 'Điểm kỳ này',
      dataIndex: 'season_score',
      key: 'season_score',
      render: (val) => <strong>{Number(val).toFixed(2)}</strong>
    },
    {
      title: 'Điểm Tích Luỹ (Xuyên năm)',
      dataIndex: 'cumulative_score',
      key: 'cumulative_score',
      render: (val) => <Tag color="green" style={{ fontSize: 14, padding: '4px 8px' }}>{Number(val).toFixed(2)}</Tag>
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

export default ChapterRankingTable;
