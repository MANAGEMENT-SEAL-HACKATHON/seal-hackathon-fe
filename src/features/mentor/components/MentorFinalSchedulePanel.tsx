import { Card, Empty, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

export type MentorScheduleSlot = {
  teamId?: number;
  teamName?: string;
  startAt?: string;
  endAt?: string;
};

export type MentorFinalSchedule = {
  roundId?: number;
  roundName?: string;
  slots?: MentorScheduleSlot[];
};

type Props = {
  schedule?: MentorFinalSchedule | null;
  assignedTeamIds?: number[];
  roundName?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const MentorFinalSchedulePanel = ({ schedule, assignedTeamIds = [], roundName }: Props) => {
  const slots = [...(schedule?.slots || [])].sort((a, b) => {
    const ta = a.startAt ? new Date(a.startAt).getTime() : 0;
    const tb = b.startAt ? new Date(b.startAt).getTime() : 0;
    return ta - tb;
  });

  const columns: ColumnsType<MentorScheduleSlot> = [
    {
      title: 'Đội',
      dataIndex: 'teamName',
      render: (name, row) => {
        const isMine = assignedTeamIds.includes(Number(row.teamId));
        return (
          <span>
            {name || `Đội #${row.teamId}`}
            {isMine && (
              <Tag color="green" style={{ marginLeft: 8 }}>
                Đội của bạn
              </Tag>
            )}
          </span>
        );
      },
    },
    {
      title: 'Bắt đầu',
      dataIndex: 'startAt',
      render: formatDateTime,
      width: 160,
    },
    {
      title: 'Kết thúc',
      dataIndex: 'endAt',
      render: formatDateTime,
      width: 160,
    },
  ];

  return (
    <Card
      size="small"
      title={`Lịch Chung kết (FR-M-16)${schedule?.roundName || roundName ? ` — ${schedule?.roundName || roundName}` : ''}`}
      style={{ marginBottom: 16 }}
    >
      {slots.length === 0 ? (
        <Empty description="Chưa có lịch thuyết trình cho vòng này." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          rowKey={(row) => String(row.teamId)}
          dataSource={slots}
          columns={columns}
          pagination={false}
          size="small"
        />
      )}
    </Card>
  );
};

export default MentorFinalSchedulePanel;
