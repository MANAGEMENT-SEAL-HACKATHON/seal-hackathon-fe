import { Card, Empty, Table, Tabs } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export type MentorRankingItem = {
  rank?: number;
  teamId?: number;
  teamName?: string;
};

export type MentorRankings = {
  hackathonId?: number;
  teamRankings?: MentorRankingItem[];
  chapterRankings?: MentorRankingItem[];
  items?: MentorRankingItem[];
};

type Props = {
  rankings?: MentorRankings | null;
};

const rankingColumns: ColumnsType<MentorRankingItem> = [
  {
    title: 'Hạng',
    dataIndex: 'rank',
    width: 80,
    render: (v) => (v != null ? `#${v}` : '—'),
  },
  {
    title: 'Tên',
    dataIndex: 'teamName',
    render: (v, row) => v ?? row.teamId ?? '—',
  },
];

const MentorHackathonRankingsPanel = ({ rankings }: Props) => {
  const teamRankings = rankings?.teamRankings ?? rankings?.items ?? [];
  const chapterRankings = rankings?.chapterRankings ?? [];

  if (!teamRankings.length && !chapterRankings.length) return null;

  return (
    <Card size="small" title="Xếp hạng hackathon (FR-M-18, read-only)" style={{ marginBottom: 16 }}>
      <Tabs
        items={[
          {
            key: 'teams',
            label: `Đội (${teamRankings.length})`,
            children:
              teamRankings.length === 0 ? (
                <Empty description="Chưa có xếp hạng đội." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  rowKey={(row) => String(row.teamId ?? row.rank)}
                  dataSource={teamRankings}
                  columns={rankingColumns}
                  pagination={false}
                  size="small"
                />
              ),
          },
          {
            key: 'chapters',
            label: `Cơ sở (${chapterRankings.length})`,
            children:
              chapterRankings.length === 0 ? (
                <Empty description="Chưa có xếp hạng cơ sở." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <Table
                  rowKey={(row, idx) => String(row.teamId ?? row.rank ?? idx)}
                  dataSource={chapterRankings}
                  columns={rankingColumns}
                  pagination={false}
                  size="small"
                />
              ),
          },
        ]}
      />
    </Card>
  );
};

export default MentorHackathonRankingsPanel;
