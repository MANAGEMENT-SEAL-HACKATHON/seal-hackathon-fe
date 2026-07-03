import { useEffect, useState } from 'react';
import { Card, Empty, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import { Award } from 'lucide-react';
import { studentPortalService } from '../services/studentPortal.service';

const { Title, Text } = Typography;

const StudentAnnualAwardsPage = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [awards, setAwards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    studentPortalService
      .getAnnualAwards(year)
      .then((data) => {
        if (!cancelled) setAwards(data);
      })
      .catch(() => {
        if (!cancelled) setAwards([]);
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
    <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 40 }}>
      <Card
        style={{
          border: 0,
          color: '#fff',
          background: 'linear-gradient(135deg, #78350f 0%, #d97706 55%, #fbbf24 100%)',
          marginBottom: 24,
          borderRadius: 16,
        }}
        styles={{ body: { padding: '28px 32px' } }}
      >
        <Space direction="vertical" size={8}>
          <Tag color="gold" style={{ border: 0, background: 'rgba(255,255,255,0.2)' }} icon={<Award size={13} />}>
            FR-U-32
          </Tag>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>
            Giải cá nhân năm
          </Title>
          <Text style={{ color: 'rgba(255,255,255,.9)' }}>
            Vinh danh thành tích cá nhân xuất sắc qua các mùa Fall Hackathon.
          </Text>
        </Space>
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Text strong>Năm học:</Text>
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
        ) : awards.length === 0 ? (
          <Empty
            description={
              <span>
                Chưa có giải cá nhân năm cho kỳ {year}.
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Dữ liệu sẽ hiển thị sau khi Ban tổ chức tổng hợp giải Fall.
                </Text>
              </span>
            }
          />
        ) : (
          <Table
            rowKey={(row) => row.id ?? `${row.hackathonId}-${row.awardName}`}
            dataSource={awards}
            pagination={false}
            columns={[
              {
                title: 'Giải thưởng',
                dataIndex: 'awardName',
                render: (v, r) => v ?? r.award_name ?? '—',
              },
              {
                title: 'Hackathon',
                dataIndex: 'hackathonName',
                render: (v, r) => v ?? r.hackathon_name ?? '—',
              },
              {
                title: 'Hạng',
                dataIndex: 'rank',
                render: (v) => (v != null ? <Tag color="gold">#{v}</Tag> : '—'),
              },
              {
                title: 'Năm',
                dataIndex: 'year',
                render: (v) => v ?? year,
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default StudentAnnualAwardsPage;
