import { Table, Tag } from 'antd';
import { Medal } from 'lucide-react';

const ChapterRankingTable = ({ data, loading }) => {
  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 100,
      render: (rank) =>
        rank <= 3 ? (
          <Tag color="blue" icon={<Medal size={14} />}>
            #{rank}
          </Tag>
        ) : (
          `#${rank}`
        ),
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
      title: 'Điểm đội cao nhất',
      dataIndex: 'best_team_score',
      key: 'best_team_score',
      render: (val) => Number(val || 0).toFixed(2),
    },
    {
      title: 'Tổng điểm cơ sở',
      dataIndex: 'total_score',
      key: 'total_score',
      render: (val) => <strong>{Number(val || 0).toFixed(2)}</strong>,
    },
    {
      title: 'Số giải',
      dataIndex: 'prizes_won',
      key: 'prizes_won',
      render: (val) => Number(val || 0),
    },
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
