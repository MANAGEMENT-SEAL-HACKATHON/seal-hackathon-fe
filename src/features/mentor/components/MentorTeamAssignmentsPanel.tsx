import { Card, Empty, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export type MentorTeamAssignment = {
  assignmentId?: number;
  teamId?: number;
  teamName?: string;
  hackathonId?: number;
};

type Props = {
  assignments?: MentorTeamAssignment[];
};

const MentorTeamAssignmentsPanel = ({ assignments = [] }: Props) => {
  if (!assignments.length) return null;

  const columns: ColumnsType<MentorTeamAssignment> = [
    {
      title: 'Đội',
      dataIndex: 'teamName',
      render: (v, row) => v ?? `Đội #${row.teamId}`,
    },
    {
      title: 'Mã đội',
      dataIndex: 'teamId',
      width: 100,
    },
  ];

  return (
    <Card size="small" title={`Phân công đội (FR-M-06) — ${assignments.length} đội`} style={{ marginBottom: 16 }}>
      <Table
        rowKey={(row) => String(row.assignmentId ?? row.teamId)}
        dataSource={assignments}
        columns={columns}
        pagination={false}
        size="small"
      />
    </Card>
  );
};

export default MentorTeamAssignmentsPanel;
