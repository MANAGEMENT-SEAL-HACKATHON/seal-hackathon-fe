import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button, Space, Spin, Typography } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { hackathonService } from '../services/hackathonService';
import axiosClient from '../../../shared/api/axiosClient';
import { PRIZE_TYPE_LABELS, labelOf } from '../../../shared/constants/labels';
import '../../../shared/theme/print.css';

const { Title, Text } = Typography;

const RANK_ORDER = ['FIRST', 'SECOND', 'THIRD', 'HONORABLE', 'SPECIAL'];

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('vi-VN');
  } catch {
    return String(value);
  }
};

const PrizePrintPage = () => {
  const { hackathonId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hackathon, setHackathon] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [hack, prizes] = await Promise.all([
          hackathonService.getById(hackathonId),
          hackathonResultsService.getPrizes(hackathonId),
        ]);
        const prizeList = Array.isArray(prizes) ? prizes : [];
        const enriched = await Promise.all(
          prizeList.map(async (p) => {
            const teamId = p.teamId ?? p.team_id;
            let members = [];
            let trackName = p.trackName ?? p.track_name ?? '';
            if (teamId) {
              try {
                const team = await axiosClient.get(`/api/v1/teams/${teamId}`);
                members = (team?.members || [])
                  .filter((m) => String(m.status || '').toUpperCase() === 'ACCEPTED')
                  .map((m) => m.fullName || m.full_name || m.email)
                  .filter(Boolean);
                if (!trackName) {
                  trackName = team?.trackName || team?.track_name || '';
                }
              } catch {
                // keep row without members
              }
            }
            return {
              ...p,
              teamName: p.teamName ?? p.team_name ?? '—',
              prizeName: p.prizeName ?? p.prize_name ?? 'Giải thưởng',
              prizeRank: p.prizeRank ?? p.prize_rank,
              prizeValue: p.prizeValue ?? p.prize_value,
              awardedAt: p.awardedAt ?? p.awarded_at,
              members,
              trackName,
            };
          }),
        );
        if (!cancelled) {
          setHackathon(hack);
          setRows(enriched);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Không tải được bảng giải thưởng');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [hackathonId]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const ai = RANK_ORDER.indexOf(String(a.prizeRank || '').toUpperCase());
        const bi = RANK_ORDER.indexOf(String(b.prizeRank || '').toUpperCase());
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      }),
    [rows],
  );

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <Alert type="error" showIcon message={error} />
      </div>
    );
  }

  const season = hackathon?.season || '';
  const year = hackathon?.year || '';
  const title = hackathon?.name || `Hackathon #${hackathonId}`;

  return (
    <div style={{ background: '#e8eef6', minHeight: '100vh', padding: '24px 16px' }}>
      <div className="no-print" style={{ maxWidth: 900, margin: '0 auto 16px', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <Link to={`/hackathons/${hackathonId}/results`}>
          <Button icon={<ArrowLeft size={16} />}>Quay lại kết quả</Button>
        </Link>
        <Button type="primary" icon={<Printer size={16} />} onClick={() => window.print()}>
          In
        </Button>
      </div>

      <div
        className="print-page"
        style={{
          maxWidth: 900,
          margin: '0 auto',
          background: '#fff',
          padding: '28px 32px 40px',
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
        }}
      >
        <Space direction="vertical" size={4} style={{ width: '100%', textAlign: 'center', marginBottom: 24 }}>
          <Text type="secondary" style={{ letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>
            SEAL Hackathon — Bảng giải thưởng
          </Text>
          <Title level={2} style={{ margin: 0 }}>
            {title}
          </Title>
          <Text>
            Mùa giải: {[season, year].filter(Boolean).join(' ') || '—'}
          </Text>
          <Text type="secondary">Ngày in: {formatDate(new Date().toISOString())}</Text>
        </Space>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              {['Hạng', 'Tên giải', 'Đội & thành viên', 'Bảng đấu', 'Giá trị', 'Ngày trao'].map((h) => (
                <th
                  key={h}
                  style={{
                    border: '1px solid #cbd5e1',
                    padding: '10px 8px',
                    textAlign: 'left',
                    fontWeight: 700,
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ border: '1px solid #cbd5e1', padding: 16, textAlign: 'center' }}>
                  Chưa có giải thưởng
                </td>
              </tr>
            ) : (
              sorted.map((row) => (
                <tr key={row.id ?? `${row.prizeRank}-${row.teamId}`}>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, verticalAlign: 'top' }}>
                    {labelOf(PRIZE_TYPE_LABELS, row.prizeRank, row.prizeRank || '—')}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, verticalAlign: 'top' }}>{row.prizeName}</td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600 }}>{row.teamName}</div>
                    <div style={{ color: '#475569', marginTop: 4 }}>
                      {row.members?.length ? row.members.join(', ') : '—'}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, verticalAlign: 'top' }}>
                    {row.trackName || '—'}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, verticalAlign: 'top' }}>
                    {row.prizeValue || '—'}
                  </td>
                  <td style={{ border: '1px solid #cbd5e1', padding: 8, verticalAlign: 'top' }}>
                    {formatDate(row.awardedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div
          className="print-signatures"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 48,
            marginTop: 56,
            textAlign: 'center',
          }}
        >
          <div>
            <Text strong>Ban Tổ chức</Text>
            <div style={{ height: 72 }} />
            <Text type="secondary">Ký và ghi rõ họ tên</Text>
          </div>
          <div>
            <Text strong>Trưởng ban Giám khảo</Text>
            <div style={{ height: 72 }} />
            <Text type="secondary">Ký và ghi rõ họ tên</Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrizePrintPage;
