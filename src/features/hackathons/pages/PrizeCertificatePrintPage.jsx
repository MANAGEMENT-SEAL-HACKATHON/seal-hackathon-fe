import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Space, Spin, Typography } from 'antd';
import { ArrowLeft, Printer } from 'lucide-react';
import { hackathonResultsService } from '../services/hackathonResults.service';
import { hackathonService } from '../services/hackathonService';
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

const formatMoney = (value) => {
  if (value == null || value === '') return '—';
  const raw = String(value).trim();
  const digits = raw.replace(/[^\d]/g, '');
  if (digits && /^\d+$/.test(digits) && digits.length >= 4) {
    try {
      return `${Number(digits).toLocaleString('vi-VN')} ₫`;
    } catch {
      return raw;
    }
  }
  return raw;
};

const PrizeCertificatePrintPage = () => {
  const { hackathonId } = useParams();
  const [searchParams] = useSearchParams();
  const teamIdFilter = searchParams.get('teamId');
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
        const [hack, prizes, rankings] = await Promise.all([
          hackathonService.getById(hackathonId),
          hackathonResultsService.getPrizes(hackathonId),
          hackathonResultsService.getTeamRankings(hackathonId).catch(() => []),
        ]);
        const prizeList = Array.isArray(prizes) ? prizes : [];
        const rankByTeamId = new Map();
        (Array.isArray(rankings) ? rankings : []).forEach((r) => {
          const tid = r.teamId ?? r.team_id;
          if (tid != null) {
            rankByTeamId.set(Number(tid), r.rank ?? r.finalRank ?? r.final_rank ?? r.position);
          }
        });
        const enriched = prizeList.map((p) => {
          const teamId = p.teamId ?? p.team_id;
          return {
            ...p,
            teamId,
            teamName: p.teamName ?? p.team_name ?? '—',
            prizeName: p.prizeName ?? p.prize_name ?? 'Giải thưởng',
            prizeRank: p.prizeRank ?? p.prize_rank,
            prizeValue: p.prizeValue ?? p.prize_value,
            awardedAt: p.awardedAt ?? p.awarded_at,
            finalRank: teamId != null ? rankByTeamId.get(Number(teamId)) : null,
          };
        });
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

  const certificates = useMemo(() => {
    let list = [...rows].filter((r) => r.teamId != null || r.teamName);
    if (teamIdFilter) {
      list = list.filter((r) => String(r.teamId) === String(teamIdFilter));
    }
    return list.sort((a, b) => {
      const ai = RANK_ORDER.indexOf(String(a.prizeRank || '').toUpperCase());
      const bi = RANK_ORDER.indexOf(String(b.prizeRank || '').toUpperCase());
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
  }, [rows, teamIdFilter]);

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

  const title = hackathon?.name || `Hackathon #${hackathonId}`;
  const season = [hackathon?.season, hackathon?.year].filter(Boolean).join(' ');

  return (
    <div style={{ background: '#e8eef6', minHeight: '100vh', padding: '24px 16px' }}>
      <div
        className="no-print"
        style={{
          maxWidth: 1100,
          margin: '0 auto 16px',
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Link to={`/hackathons/${hackathonId}/results`}>
          <Button icon={<ArrowLeft size={16} />}>Quay lại kết quả</Button>
        </Link>
        <Space>
          {teamIdFilter ? (
            <Link to={`/hackathons/${hackathonId}/prizes/certificates`}>
              <Button>In tất cả đội</Button>
            </Link>
          ) : null}
          <Button type="primary" icon={<Printer size={16} />} onClick={() => window.print()}>
            In bảng trao giải
          </Button>
        </Space>
      </div>

      {certificates.length === 0 ? (
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Alert type="info" showIcon message="Chưa có giải thưởng để in" />
        </div>
      ) : (
        certificates.map((row, index) => (
          <div
            key={row.id ?? `${row.prizeRank}-${row.teamId}-${index}`}
            className="print-certificate"
            style={{
              maxWidth: 1100,
              margin: '0 auto 24px',
              background: '#fff',
              border: '8px double #0f2942',
              padding: '40px 56px',
              minHeight: 520,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
              pageBreakAfter: 'always',
            }}
          >
            <img
              src="/logo.jpg"
              alt="SEAL Hackathon"
              style={{ height: 72, objectFit: 'contain', marginBottom: 16 }}
            />
            <Text
              style={{
                letterSpacing: 3,
                textTransform: 'uppercase',
                fontSize: 13,
                color: '#64748b',
                fontWeight: 700,
              }}
            >
              Giấy chứng nhận trao giải
            </Text>
            <Title level={2} style={{ margin: '12px 0 4px', color: '#0f2942' }}>
              {title}
            </Title>
            {season ? (
              <Text type="secondary" style={{ marginBottom: 20 }}>
                Mùa giải: {season}
              </Text>
            ) : null}

            <Text style={{ fontSize: 16, marginTop: 8 }}>Trao giải</Text>
            <Title level={3} style={{ margin: '8px 0', color: '#b45309' }}>
              {row.prizeName}
              {row.prizeRank
                ? ` — ${labelOf(PRIZE_TYPE_LABELS, row.prizeRank, row.prizeRank)}`
                : ''}
            </Title>
            {row.finalRank != null ? (
              <Text type="secondary" style={{ marginBottom: 8 }}>
                Hạng chung cuộc: #{row.finalRank}
              </Text>
            ) : null}

            <Text style={{ fontSize: 15, marginTop: 12 }}>cho đội</Text>
            <Title level={2} style={{ margin: '8px 0 20px', color: '#00529C' }}>
              {row.teamName}
            </Title>

            <div
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: '#0f2942',
                letterSpacing: '-0.02em',
                margin: '8px 0 24px',
                lineHeight: 1.1,
              }}
            >
              {formatMoney(row.prizeValue)}
            </div>

            <Text type="secondary">Ngày trao: {formatDate(row.awardedAt)}</Text>
          </div>
        ))
      )}
    </div>
  );
};

export default PrizeCertificatePrintPage;
