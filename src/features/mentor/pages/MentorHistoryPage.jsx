import { useEffect, useState } from 'react';
import { Card, Empty, Select, Space, Spin, Table, Typography } from 'antd';
import { History } from 'lucide-react';
import { mentorPortalService } from '../services/mentorPortal.service';

const { Title, Text } = Typography;

const MentorHistoryPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mentorPortalService
      .getHistory(year)
      .then((data) => {
        if (!cancelled) setItems(data);
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
  }, [year]);

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <Card style={{ marginBottom: 24, borderRadius: 16 }}>
        <Space direction="vertical" size={4}>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={22} /> Lịch sử mentor
          </Title>
          <Text type="secondary">FR-M-19 — Các mùa hackathon bạn đã hỗ trợ đội.</Text>
        </Space>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Text strong>Năm:</Text>
          <Select
            value={year}
            onChange={setYear}
            options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            style={{ width: 120 }}
          />
        </Space>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description="Chưa có lịch sử mentor cho năm này." />
        ) : (
          <Table
            rowKey={(row) => row.hackathonId ?? row.hackathon_id}
            dataSource={items}
            pagination={false}
            columns={[
              {
                title: 'Hackathon',
                dataIndex: 'hackathonName',
                render: (v, r) => v ?? r.hackathon_name ?? '—',
              },
              {
                title: 'Số đội đã mentor',
                dataIndex: 'teamsMentored',
                render: (v, r) => v ?? r.teams_mentored ?? 0,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default MentorHistoryPage;
