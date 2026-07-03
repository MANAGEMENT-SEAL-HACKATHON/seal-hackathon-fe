import { useEffect, useState } from 'react';
import { Card, Empty, Spin, Table, Typography } from 'antd';
import { peopleService } from '../../people/services/peopleService';

const { Text } = Typography;

const unwrapItems = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const TeamMentorHistoryPanel = ({ teamId, teamName }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamId) return undefined;
    let cancelled = false;
    setLoading(true);
    peopleService
      .getTeamMentors(teamId)
      .then((res) => {
        if (!cancelled) setItems(unwrapItems(res));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (!teamId) return null;

  return (
    <Card
      size="small"
      title={`Lịch sử mentor${teamName ? `: ${teamName}` : ''}`}
      style={{ marginTop: 16 }}
    >
      {loading ? (
        <Spin size="small" />
      ) : items.length === 0 ? (
        <Empty description="Chưa có mentor được gán." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Table
          size="small"
          rowKey={(row) => `${row.roundId ?? row.round_id}-${row.mentorId ?? row.mentor_id}`}
          dataSource={items}
          pagination={false}
          columns={[
            {
              title: 'Vòng',
              dataIndex: 'roundName',
              render: (v, r) => v ?? r.round_name ?? '—',
            },
            {
              title: 'Mentor',
              dataIndex: 'mentorName',
              render: (v, r) => v ?? r.mentor_name ?? '—',
            },
            {
              title: 'Ngày gán',
              dataIndex: 'assignedAt',
              render: (v, r) => {
                const raw = v ?? r.assigned_at;
                if (!raw) return '—';
                try {
                  return new Date(raw).toLocaleString('vi-VN');
                } catch {
                  return String(raw);
                }
              },
            },
          ]}
        />
      )}
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
        FR-13C — mentor theo từng vòng thi.
      </Text>
    </Card>
  );
};

export default TeamMentorHistoryPanel;
