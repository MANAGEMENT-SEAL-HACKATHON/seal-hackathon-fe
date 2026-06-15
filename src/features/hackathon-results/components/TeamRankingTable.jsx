import React from 'react';
import { Table, Tag } from 'antd';
import { Trophy } from 'lucide-react';

const TeamRankingTable = ({ data, loading }) => {
  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      render: (rank) => {
        let color = '';
        if (rank === 1) color = 'gold';
        else if (rank === 2) color = 'silver';
        else if (rank === 3) color = '#cd7f32'; 
        
        return color ? <Tag color={color} icon={<Trophy size={14} />}>Top {rank}</Tag> : <Tag>#{rank}</Tag>;
      }
    },
    {
      title: 'Tên Đội',
      dataIndex: 'team_name',
      key: 'team_name',
    },
    {
      title: 'Cơ sở',
      dataIndex: 'chapter_name',
      key: 'chapter_name',
      render: (text) => text === 'External' ? <Tag color="purple">Thí sinh ngoài</Tag> : text
    },
    {
      title: 'Điểm tổng (Final)',
      dataIndex: 'weighted_avg_score',
      key: 'weighted_avg_score',
      render: (val) => Number(val).toFixed(2)
    },
    {
      title: 'Số Giám khảo chấm',
      dataIndex: 'judge_count',
      key: 'judge_count',
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

export default TeamRankingTable;
