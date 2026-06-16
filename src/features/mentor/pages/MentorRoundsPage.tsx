import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { personBApi } from '../../../api/personB.api';

const MentorRoundsPage: React.FC = () => {
  const navigate = useNavigate();

  // Fetch mentor rounds
  const { data: rounds = [], isLoading, error } = useQuery<any[]>({
    queryKey: ['mentorRounds'],
    queryFn: async () => {
      try {
        return await personBApi.getMentorRounds();
      } catch (err) {
        console.error('Error fetching mentor rounds:', err);
        throw err;
      }
    },
    retry: false,
  });

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return { text: 'ĐANG DIỄN RA', bg: '#DCFCE7', color: '#16A34A' };
    } else if (status === 'UPCOMING') {
      return { text: 'SẮP DIỄN RA', bg: '#EFF6FF', color: '#2563EB' };
    } else {
      return { text: 'ĐÃ KẾT THÚC', bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const getRoundIcon = (name: string) => {
    const lowerName = (name || '').toLowerCase();
    if (lowerName.includes('sơ loại') || lowerName.includes('round a')) return '🚀';
    if (lowerName.includes('bán kết') || lowerName.includes('round b')) return '🏆';
    return '👑';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
      {/* Design System Style Injection */}
      <style>{`
        body {
          background-color: #F8F9FA !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-fadeIn {
          animation: fadeIn 300ms ease-out forwards;
        }
        .shimmer-bg {
          background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        .round-card-item {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 12px;
          padding: 20px 24px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 150ms ease-in-out;
        }
        .round-card-item:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border-color: #D1D5DB;
        }
      `}</style>

      {/* BREADCRUMB */}
      <nav style={{
        fontSize: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      }}>
        <span style={{ color: '#6B7280' }}>MENTOR PORTAL</span>
        <span style={{ color: '#D1D5DB' }}>›</span>
        <span style={{ color: '#374151', fontWeight: 600 }}>
          VÒNG THI ĐANG PHỤ TRÁCH
        </span>
      </nav>

      {/* PAGE HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤝 Vòng Thi Đang Phụ Trách
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Danh sách các vòng thi mà bạn được phân công hỗ trợ chuyên môn trong SEAL Hackathon.
        </p>
      </div>

      {/* ROUND CARDS LIST */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer-bg" style={{ height: '108px', borderRadius: '12px' }} />
          ))}
        </div>
      ) : error ? (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '16px 20px',
          color: '#B91C1C',
          fontSize: '14px'
        }}>
          Có lỗi xảy ra khi tải dữ liệu. Vui lòng tải lại trang hoặc thử lại sau.
        </div>
      ) : rounds.length === 0 ? (
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '40px 24px',
          textAlign: 'center',
          color: '#6B7280'
        }}>
          Bạn chưa được phân công phụ trách vòng thi nào.
        </div>
      ) : (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column' }}>
          {rounds.map((round: any) => {
            const badge = getStatusBadge(round.status);
            return (
              <div key={round.round_id} className="round-card-item">
                {/* Icon emoji trong circle */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#F8F9FA',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  flexShrink: 0
                }}>
                  {getRoundIcon(round.round_name)}
                </div>

                {/* Nội dung giữa */}
                <div style={{ flex: 1 }}>
                  {/* Tên + Badge trạng thái */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                      {round.round_name}
                    </span>

                    {/* Badge: ĐANG DIỄN RA / SẮP DIỄN RA */}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: badge.bg,
                      color: badge.color
                    }}>
                      {badge.text}
                    </span>
                  </div>

                  {/* Mô tả */}
                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', marginTop: 0 }}>
                    {round.description}
                  </p>

                  {/* Đội thi giám */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}>
                    👥 Đội thi giám:
                    <span style={{ color: '#374151', fontWeight: 500 }}>
                      {round.teams?.map((t: any) => t.team_name).join(', ') || 'Chưa phân công'}
                    </span>
                  </div>
                </div>

                {/* Số đội + nút chi tiết */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '10px',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                    {round.team_count} đội
                  </span>

                  <button
                    onClick={() => navigate(`/mentor/support?roundId=${round.roundId ?? round.round_id}`)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      background: 'white',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#374151',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 150ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#9CA3AF';
                      e.currentTarget.style.background = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E5E7EB';
                      e.currentTarget.style.background = 'white';
                    }}
                  >
                    Chi tiết vòng thi →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STATS BAR — phía dưới danh sách */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginTop: '24px',
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '20px 24px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Watermark text */}
        <div style={{
          position: 'absolute',
          right: '24px',
          bottom: '-8px',
          fontSize: '64px',
          fontWeight: 900,
          color: 'rgba(0,0,0,0.04)',
          letterSpacing: '-2px',
          userSelect: 'none',
          pointerEvents: 'none'
        }}>
          MENTOR
        </div>

        {/* Stat 1: Support Efficiency */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>📋</span>
            <div>
              <div style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#6B7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                SUPPORT EFFICIENCY
              </div>
              <span style={{
                fontSize: '10px',
                padding: '1px 6px',
                background: '#EFF6FF',
                color: '#2563EB',
                borderRadius: '4px',
                fontWeight: '600'
              }}>WEEKLY</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>
            94.2%
          </div>
          {/* Progress bar xanh lá */}
          <div style={{ height: '4px', background: '#F3F4F6', borderRadius: '999px', marginTop: '8px' }}>
            <div style={{ width: '94.2%', height: '100%', background: '#16A34A', borderRadius: '999px' }} />
          </div>
        </div>

        {/* Stat 2: Average Response */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px' }}>🔄</span>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              AVERAGE RESPONSE
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>
            14 min
          </div>
          <div style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>
            2.4m faster than average
          </div>
        </div>

        {/* Stat 3: Pending Alerts */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '20px', color: '#EF4444' }}>❗</span>
            <div style={{
              fontSize: '10px',
              fontWeight: '600',
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              PENDING ALERTS
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>
            02
          </div>
          <div style={{ fontSize: '12px', color: '#EF4444', cursor: 'pointer', marginTop: '4px' }}>
            View critical issues
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorRoundsPage;
