import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Empty, Select, Spin, Typography } from 'antd';
import { ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { showcaseService } from '../../features/showcase/services/showcase.service';
import { ROUTES } from '../../shared/constants/routes';

const { Title, Text, Paragraph } = Typography;

const HallOfFamePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(undefined);
  const [entries, setEntries] = useState([]);
  const [years, setYears] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await showcaseService.listHallOfFame(year);
        if (!cancelled) {
          setEntries(Array.isArray(data) ? data : []);
          if (year == null) {
            const ys = [...new Set((data || []).map((e) => e.year).filter(Boolean))].sort((a, b) => b - a);
            setYears(ys);
          }
        }
      } catch {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 18% 0%, rgba(22,119,255,0.12), transparent 34%), #f5f7fb',
        padding: '32px 18px 64px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(ROUTES.LANDING)}>
            Về trang chủ
          </Button>
          <Select
            allowClear
            placeholder="Lọc theo năm"
            style={{ minWidth: 160 }}
            value={year}
            options={years.map((y) => ({ value: y, label: String(y) }))}
            onChange={(v) => setYear(v)}
          />
        </div>

        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <Trophy size={36} color="#1677ff" />
          <Title level={1} style={{ marginTop: 12, marginBottom: 8 }}>
            Bảng vàng SEAL Hackathon
          </Title>
          <Paragraph type="secondary" style={{ maxWidth: 560, margin: '0 auto' }}>
            Vinh danh các đội quán quân qua từng mùa giải.
          </Paragraph>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : entries.length === 0 ? (
          <Empty description="Chưa có bản ghi bảng vàng" />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 18,
            }}
          >
            {entries.map((entry, index) => (
              <motion.article
                key={entry.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                style={{
                  padding: 22,
                  borderRadius: 18,
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
                }}
              >
                <Text type="secondary">
                  {entry.season} {entry.year}
                </Text>
                <Title level={4} style={{ margin: '8px 0' }}>
                  {entry.teamName}
                </Title>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  {entry.hackathonName}
                </Text>
                {entry.trackName ? (
                  <Text type="secondary" style={{ display: 'block' }}>
                    Bảng: {entry.trackName}
                  </Text>
                ) : null}
                {entry.memberNames ? (
                  <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                    {entry.memberNames}
                  </Text>
                ) : null}
                {entry.prizeName ? (
                  <Text style={{ display: 'block', marginTop: 12, color: '#1677ff', fontWeight: 600 }}>
                    {entry.prizeName}
                    {entry.prizeValue ? ` · ${entry.prizeValue}` : ''}
                  </Text>
                ) : null}
              </motion.article>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to={ROUTES.LANDING} style={{ color: '#64748b' }}>
            SEAL Hackathon
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HallOfFamePage;
