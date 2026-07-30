import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Tag, message } from 'antd';
import { personBApi } from '../../../api/personB.api';
import { mentorPortalService } from '../services/mentorPortal.service';
import { runDeclineAssignment } from '../../assignments/utils/confirmAssignmentDecline';
import { resolveUserError } from '../../../shared/errors/resolveUserError';

const MentorRoundsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: rounds = [], isLoading, error, refetch: refetchRounds } = useQuery<any[]>({
    queryKey: ['mentorRounds'],
    queryFn: () => personBApi.getMentorRounds(),
    retry: false,
  });

  const { data: trackAssignments = [], isLoading: tracksLoading, refetch: refetchTracks } = useQuery<any[]>({
    queryKey: ['mentorTrackAssignments'],
    queryFn: () => mentorPortalService.getTrackAssignments(),
    enabled: !isLoading && !error && rounds.length === 0,
    retry: false,
  });

  const refresh = async () => {
    await Promise.all([refetchRounds(), refetchTracks(), queryClient.invalidateQueries({ queryKey: ['mentorRounds'] })]);
  };

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

  const isDeclinedStatus = (status?: string) => String(status || '').toUpperCase() === 'DECLINED';

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: "'Inter', sans-serif" }}>
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

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🤝 Vòng thi đang phụ trách
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Danh sách các vòng thi mà bạn được phân công hỗ trợ chuyên môn trong SEAL Hackathon.
        </p>
      </div>

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
          {(error as Error)?.message || 'Có lỗi xảy ra khi tải dữ liệu.'}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginLeft: 12, background: 'transparent', border: 'none', color: '#2563EB', cursor: 'pointer', fontWeight: 600 }}
          >
            Thử lại
          </button>
        </div>
      ) : rounds.length === 0 ? (
        tracksLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2].map((i) => (
              <div key={i} className="shimmer-bg" style={{ height: '88px', borderRadius: '12px' }} />
            ))}
          </div>
        ) : trackAssignments.length > 0 ? (
          <div
            className="animate-fadeIn"
            style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '28px 24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 8, color: '#111827' }}>
              Bạn đã được gán track chuyên môn
            </h2>
            <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: 16 }}>
              Ban tổ chức sẽ phân đội cụ thể cho bạn ở giai đoạn tiếp theo. Hiện chưa có vòng thi nào cần hỗ trợ trực tiếp.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {trackAssignments.map((item: any) => {
                const assignmentId = item.assignmentId ?? item.assignment_id;
                const declined = isDeclinedStatus(item.responseStatus || item.response_status);
                return (
                  <div
                    key={assignmentId ?? item.trackId ?? item.track_id}
                    style={{
                      padding: '12px 16px',
                      borderRadius: 10,
                      background: declined ? '#FEF2F2' : '#F9FAFB',
                      border: `1px solid ${declined ? '#FECACA' : '#E5E7EB'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#111827' }}>
                        {item.trackName ?? item.track_name ?? `Hạng mục #${item.trackId ?? item.track_id}`}
                      </span>
                      {declined && (
                        <Tag color="error" style={{ marginLeft: 8 }}>ĐÃ TỪ CHỐI</Tag>
                      )}
                    </div>
                    {assignmentId != null && (
                      declined ? (
                        <Button
                          type="link"
                          size="small"
                          onClick={async () => {
                            try {
                              await mentorPortalService.acceptTrackAssignment(assignmentId);
                              message.success('Đã chấp nhận lại phân công');
                              await refresh();
                            } catch (err) {
                              message.error(resolveUserError(err, { fallback: 'Không thể chấp nhận lại.' }));
                            }
                          }}
                        >
                          Rút lại từ chối
                        </Button>
                      ) : (
                        <Button
                          type="link"
                          danger
                          size="small"
                          onClick={() =>
                            runDeclineAssignment(
                              (reason) => mentorPortalService.declineTrackAssignment(assignmentId, reason),
                              { onSuccess: refresh },
                            )
                          }
                        >
                          Từ chối tham gia
                        </Button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
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
        )
      ) : (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column' }}>
          {rounds.map((round: any) => {
            const badge = getStatusBadge(round.status);
            const teams = round.teams || [];
            const canDeclineRound = round.status === 'UPCOMING' || round.status === 'upcoming';
            const activeTeamAssignments = teams.filter(
              (t: any) => !isDeclinedStatus(t.responseStatus || t.response_status),
            );
            const declinedTeams = teams.filter(
              (t: any) => isDeclinedStatus(t.responseStatus || t.response_status),
            );
            const allDeclined = teams.length > 0 && activeTeamAssignments.length === 0;

            return (
              <div
                key={round.round_id ?? round.roundId}
                className="round-card-item"
                style={allDeclined ? { borderColor: '#FECACA', background: '#FFFBFB' } : undefined}
              >
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
                  {getRoundIcon(round.round_name || round.roundName)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                      {round.round_name || round.roundName}
                    </span>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: allDeclined ? '#FEE2E2' : badge.bg,
                      color: allDeclined ? '#B91C1C' : badge.color
                    }}>
                      {allDeclined ? 'ĐÃ TỪ CHỐI' : badge.text}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', marginTop: 0 }}>
                    {round.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#9CA3AF' }}>
                    👥 Đội thi giám:
                    <span style={{ color: '#374151', fontWeight: 500 }}>
                      {teams.map((t: any) => t.team_name || t.teamName).join(', ') || 'Chưa phân công'}
                    </span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '10px',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
                    {round.team_count ?? round.teamCount ?? teams.length} đội
                  </span>

                  {!allDeclined && (
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
                      }}
                    >
                      Chi tiết vòng thi →
                    </button>
                  )}

                  {canDeclineRound && activeTeamAssignments.length > 0 && (
                    <Button
                      type="link"
                      danger
                      size="small"
                      onClick={() => {
                        const first = activeTeamAssignments[0];
                        const assignmentId = first.assignmentId ?? first.assignment_id;
                        if (assignmentId == null) {
                          message.warning('Không tìm thấy mã phân công để từ chối.');
                          return;
                        }
                        runDeclineAssignment(
                          async (reason) => {
                            for (const t of activeTeamAssignments) {
                              const id = t.assignmentId ?? t.assignment_id;
                              if (id != null) {
                                await mentorPortalService.declineTeamAssignment(id, reason);
                              }
                            }
                          },
                          { onSuccess: refresh },
                        );
                      }}
                    >
                      Từ chối tham gia
                    </Button>
                  )}

                  {declinedTeams.length > 0 && (
                    <Button
                      type="link"
                      size="small"
                      onClick={async () => {
                        try {
                          for (const t of declinedTeams) {
                            const id = t.assignmentId ?? t.assignment_id;
                            if (id != null) {
                              await mentorPortalService.acceptTeamAssignment(id);
                            }
                          }
                          message.success('Đã chấp nhận lại phân công');
                          await refresh();
                        } catch (err) {
                          message.error(resolveUserError(err, { fallback: 'Không thể chấp nhận lại.' }));
                        }
                      }}
                    >
                      Rút lại từ chối
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{
        marginTop: '24px',
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '20px 24px',
        color: '#6B7280',
        fontSize: '14px',
        textAlign: 'center'
      }}>
        Chưa có thống kê hiệu suất mentor — sẽ hiển thị khi BE cung cấp dữ liệu.
      </div>
    </div>
  );
};

export default MentorRoundsPage;
