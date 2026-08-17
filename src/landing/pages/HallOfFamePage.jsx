import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Empty, Select, Spin, Typography } from 'antd';
import { ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { absoluteApiUrl, showcaseService } from '../../features/showcase/services/showcase.service';
import { ROUTES } from '../../shared/constants/routes';

const { Title, Text, Paragraph } = Typography;

const seasonLabel = (season) => {
  if (!season) return '';
  const map = { SPRING: 'Spring', SUMMER: 'Summer', FALL: 'Fall', WINTER: 'Winter' };
  return map[String(season).toUpperCase()] || String(season);
};

const coverSrc = (entry) => {
  if (entry.coverUrl || entry.cover_url) return absoluteApiUrl(entry.coverUrl || entry.cover_url);
  if (entry.hackathonBannerUrl || entry.hackathon_banner_url) {
    return absoluteApiUrl(entry.hackathonBannerUrl || entry.hackathon_banner_url);
  }
  return null;
};

const initials = (name) => {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 20,
            }}
          >
            {entries.map((entry, index) => {
              const img = coverSrc(entry);
              const slug = entry.articleSlug || entry.article_slug;
              const summary = entry.articleSummary || entry.article_summary;
              const prizeDesc = entry.prizeDescription || entry.prize_description;
              return (
                <motion.article
                  key={entry.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  style={{
                    borderRadius: 18,
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 12px 32px rgba(15,23,42,0.06)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      height: 160,
                      background: img
                        ? `center / cover no-repeat url(${img})`
                        : 'linear-gradient(135deg, #1677ff 0%, #00529C 55%, #F37021 100%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      padding: 14,
                    }}
                  >
                    {!img ? (
                      <span
                        style={{
                          fontSize: 42,
                          fontWeight: 800,
                          color: 'rgba(255,255,255,0.85)',
                          letterSpacing: 1,
                        }}
                      >
                        {initials(entry.teamName)}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      style={{
                        background: 'rgba(15,23,42,0.72)',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {seasonLabel(entry.season)} {entry.year}
                    </span>
                  </div>

                  <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Title level={4} style={{ margin: '0 0 6px' }}>
                      {entry.teamName}
                    </Title>
                    <Text strong style={{ display: 'block', marginBottom: 6 }}>
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
                    {summary ? (
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 3 }}
                        style={{ marginTop: 12, marginBottom: 0 }}
                      >
                        {summary}
                      </Paragraph>
                    ) : null}
                    {entry.prizeName ? (
                      <Text style={{ display: 'block', marginTop: 12, color: '#1677ff', fontWeight: 600 }}>
                        {entry.prizeName}
                        {entry.prizeValue ? ` · ${entry.prizeValue}` : ''}
                      </Text>
                    ) : null}
                    {prizeDesc ? (
                      <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                        {prizeDesc}
                      </Text>
                    ) : null}
                    {slug ? (
                      <Link
                        to={ROUTES.PUBLIC_ARTICLE.replace(':slug', slug)}
                        style={{ marginTop: 16, fontWeight: 600 }}
                      >
                        Đọc câu chuyện quán quân →
                      </Link>
                    ) : null}
                  </div>
                </motion.article>
              );
            })}
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
