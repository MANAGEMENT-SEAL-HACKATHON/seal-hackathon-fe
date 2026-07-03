import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Drawer, Select, Skeleton, Tabs, Button, Card } from 'antd';
import { personBApi, AssignedTeamsResponse } from '../../../api/personB.api';
import { mentorPortalService } from '../services/mentorPortal.service';
import MentorFinalSchedulePanel from '../components/MentorFinalSchedulePanel';
import MentorHackathonRankingsPanel from '../components/MentorHackathonRankingsPanel';
import MentorTeamAssignmentsPanel from '../components/MentorTeamAssignmentsPanel';

// Helper to generate elegant gradient avatars for teams
const getAvatarGradient = (teamName: string) => {
  const code = teamName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-emerald-400 to-teal-600',
    'from-amber-400 to-orange-600',
    'from-violet-500 to-purple-600',
    'from-cyan-400 to-blue-600'
  ];
  return colors[code % colors.length];
};

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getGroupInitials = (group: string) => {
  if (!group) return 'GA';
  const cleanGroup = String(group).trim();
  if (/^\d+$/.test(cleanGroup)) {
    return 'G' + cleanGroup;
  }
  const words = cleanGroup.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return cleanGroup.substring(0, 2).toUpperCase();
};

const getStatusStyles = (status: string) => {
  const norm = (status || '').toUpperCase();
  if (norm === 'ACTIVE') {
    return { background: '#DCFCE7', color: '#16A34A' };
  } else if (norm === 'INACTIVE' || norm === 'ELIMINATED') {
    return { background: '#F3F4F6', color: '#6B7280' };
  } else {
    return { background: '#FEF3C7', color: '#D97706' }; // PENDING
  }
};

interface TeamCardProps {
  team: any;
  groupNumber: string;
  onViewSubmission?: (team: any) => void;
  presentationSlot?: any;
}

const TeamCard: React.FC<TeamCardProps> = ({ team, groupNumber, onViewSubmission, presentationSlot }) => {
  const scheduleText =
    team.presentation_schedule ||
    team.presentationSchedule ||
    presentationSlot?.slotStartAt ||
    presentationSlot?.slot_start_at ||
    presentationSlot?.presentationSchedule;
  const locationText = team.location || presentationSlot?.location;

  const formatSlotTime = () => {
    if (!scheduleText) return '';
    return scheduleText;
  };

  const hasSchedule = Boolean(scheduleText || locationText);

  return (
    <div className="team-card-item animate-fadeIn">
      {/* Avatar chữ viết tắt - 2 chữ cái */}
      <div style={{
        width: '36px', height: '36px',
        borderRadius: '8px',
        background: '#F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '11px', fontWeight: 700,
        color: '#6B7280',
        flexShrink: 0,
        marginTop: '2px'
      }}>
        {getGroupInitials(team.assigned_group || team.group_number)}
      </div>

      {/* Nội dung chính */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* Tên đội */}
        <div style={{
          fontSize: '14px', fontWeight: 600,
          color: '#111827', marginBottom: '4px'
        }}>
          {team.team_name}
        </div>

        {/* Meta info: nhóm + ID */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          fontSize: '12px',
          color: '#6B7280',
          marginBottom: '6px'
        }}>
          <span>👥 Nhóm {groupNumber}</span>
          <span>🆔 ID: {team.team_id}</span>
        </div>

        {/* Lịch thuyết trình từ assigned-teams (§7 BE) */}
        {hasSchedule ? (
          <div style={{
            background: '#F9FAFB',
            border: '1px dashed #E5E7EB',
            borderRadius: '6px',
            padding: '6px 10px',
            margin: '4px 0 8px',
            fontSize: '12px',
            color: '#4B5563'
          }}>
            {scheduleText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                <span>📅</span>
                <strong style={{ color: '#1F2937' }}>Lịch thuyết trình:</strong>
                <span>{formatSlotTime()}</span>
              </div>
            )}
            {locationText && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📍</span>
                <strong style={{ color: '#1F2937' }}>Địa điểm:</strong>
                <span>{locationText}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Status badge */}
        <span style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '999px',
          fontSize: '11px', fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          ...getStatusStyles(team.status)
        }}>
          {team.status || 'ACTIVE'}
        </span>
        {onViewSubmission && (
          <Button type="link" size="small" style={{ padding: 0, marginTop: 8 }} onClick={() => onViewSubmission(team)}>
            Xem bài nộp →
          </Button>
        )}
      </div>
    </div>
  );
};

const TeamCardWithSlot: React.FC<Omit<TeamCardProps, 'presentationSlot'>> = (props) => {
  const hasSchedule = Boolean(
    props.team.presentation_schedule || props.team.presentationSchedule || props.team.location
  );
  const { data: slot } = useQuery({
    queryKey: ['mentorPresentationSlot', props.team.team_id],
    queryFn: () => personBApi.getTeamPresentationSlot(props.team.team_id),
    enabled: !hasSchedule && Boolean(props.team.team_id),
    retry: false,
  });
  return <TeamCard {...props} presentationSlot={slot} />;
};

const parseRoundIdParam = (value: string | null) => {
  if (!value || value === 'undefined' || value === 'null') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const MentorSupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [showErrorAlert, setShowErrorAlert] = useState(true);
  const [drawerTeam, setDrawerTeam] = useState<any | null>(null);
  const [searchParams] = useSearchParams();
  const roundIdFromUrl = parseRoundIdParam(searchParams.get('roundId'));

  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const mentorId = userInfo.userId || userInfo.id || 'mentor-1';

  // Lấy vòng thi qua API mentor — không dùng endpoint coordinator
  const { data: dbRounds, isLoading: isRoundsLoading, error: roundsError, refetch: refetchRounds } = useQuery<any[]>({
    queryKey: ['mentorRounds'],
    queryFn: async () => {
      const res = await personBApi.getMentorRounds();
      return res || [];
    },
    retry: false
  });

  const dbRoundsList = dbRounds && dbRounds.length > 0 ? dbRounds : [];
  const activeRound = dbRoundsList.find((r: any) => r.status === 'ACTIVE' || r.isActive === true) || dbRoundsList[0];
  const effectiveRoundId = roundIdFromUrl ?? activeRound?.roundId ?? activeRound?.id ?? null;

  // React Query Fetching Teams — chỉ gọi khi đã có roundId hợp lệ
  const { data: teamsData, isLoading: isTeamsLoading, isFetching: isTeamsFetching, error: teamsError, refetch: refetchTeams } = useQuery<AssignedTeamsResponse>({
    queryKey: ['assignedTeams', mentorId, effectiveRoundId],
    queryFn: async () => {
      const res = await personBApi.getAssignedTeams(mentorId, effectiveRoundId!);
      setShowErrorAlert(false);
      return res;
    },
    enabled: effectiveRoundId != null,
    retry: false
  });

  const activeTeams = teamsData?.teams || [];
  const isLoading = isTeamsLoading || isRoundsLoading;
  const isFetching = isTeamsFetching;
  const error = teamsError || roundsError;
  const refetch = () => {
    refetchTeams();
    refetchRounds();
  };

  const currentRoundObj = dbRoundsList.find(
    (r: any) => String(r.roundId ?? r.id) === String(effectiveRoundId)
  ) || activeRound;
  const currentRoundName = currentRoundObj?.roundName || currentRoundObj?.name || 'Chưa chọn vòng thi';

  const teams = activeTeams;

  const { data: drawerSubmissions = [], isLoading: drawerSubmissionsLoading } = useQuery({
    queryKey: ['mentorTeamSubmissions', drawerTeam?.team_id, effectiveRoundId],
    queryFn: () => personBApi.getMentorTeamSubmissions(drawerTeam!.team_id, effectiveRoundId!),
    enabled: Boolean(drawerTeam?.team_id && effectiveRoundId),
    retry: false,
  });

  const { data: drawerScores = [], isLoading: drawerScoresLoading } = useQuery({
    queryKey: ['mentorTeamScores', drawerTeam?.team_id, effectiveRoundId],
    queryFn: () => personBApi.getMentorTeamScores(drawerTeam!.team_id, effectiveRoundId!),
    enabled: Boolean(drawerTeam?.team_id && effectiveRoundId),
    retry: false,
  });

  const { data: mentorTeamAssignments = [] } = useQuery({
    queryKey: ['mentorTeamAssignments', effectiveRoundId],
    queryFn: () => mentorPortalService.getTeamAssignments(effectiveRoundId!),
    enabled: Boolean(effectiveRoundId),
    retry: false,
  });

  const { data: finalSchedule } = useQuery({
    queryKey: ['mentorFinalSchedule', effectiveRoundId],
    queryFn: () => mentorPortalService.getFinalRoundSchedule(effectiveRoundId!),
    enabled: Boolean(effectiveRoundId),
    retry: false,
  });

  const hackathonIdForRankings =
    currentRoundObj?.hackathonId ?? currentRoundObj?.hackathon_id ?? teamsData?.hackathonId;

  const { data: mentorRankings } = useQuery({
    queryKey: ['mentorHackathonRankings', hackathonIdForRankings],
    queryFn: () => mentorPortalService.getHackathonRankings(hackathonIdForRankings!),
    enabled: Boolean(hackathonIdForRankings),
    retry: false,
  });

  const handleRoundChange = (nextRoundId: number) => {
    navigate(`/mentor/support?roundId=${nextRoundId}`);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Design System Style Injection */}
      <style>{`
        body {
          background-color: #F8F9FA !important;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        }
        :root {
          --primary: #1677ff;
          --primary-hover: #4096ff;
          --primary-light: #e6f4ff;
          --surface: #ffffff;
          --border: #f0f0f0;
          --text-muted: #8c8c8c;
          --text-primary: #1f1f1f;
          --warning: #faad14;
          --warning-surface: #fff8e1;
          --warning-border: #ffe58f;
        }
        .dark {
          --surface: #1f1f1f;
          --border: #303030;
          --primary-light: #111a2c;
          --text-primary: #f5f5f5;
          --warning-surface: #2b2110;
          --warning-border: #4d3c18;
        }
        
        .custom-heading {
          font-weight: 700;
        }
        .custom-label {
          font-weight: 500;
        }
        .custom-body {
          font-weight: 400;
        }
        
        .custom-card {
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02);
          transition: all 200ms ease-in-out;
        }
        .custom-card-hoverable:hover {
          border-color: var(--primary);
          box-shadow: 0 4px 12px rgba(22, 119, 255, 0.08);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-fadeIn {
          animation: fadeIn 300ms ease-out forwards;
        }
        
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, #f2f2f2 25%, #e6e6e6 37%, #f2f2f2 63%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        .dark .shimmer-bg {
          background: linear-gradient(90deg, #2a2a2a 25%, #333333 37%, #2a2a2a 63%);
          background-size: 200% 100%;
          animation: shimmer 1.4s ease infinite;
        }
        
        .team-card-item {
          padding: 14px 16px;
          border: 1px solid #E5E7EB;
          border-radius: 10px;
          margin-bottom: 10px;
          background: white;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: default;
          transition: box-shadow 150ms ease, border-color 150ms ease;
        }
        .team-card-item:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          border-color: #D1D5DB;
        }
      `}</style>

      {/* DETAIL ROUND TEAMS LIST SCREEN */}
      <div className="space-y-6 animate-fadeIn">
        {/* BREADCRUMB */}
        <nav style={{
          fontSize: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Link
            to="/mentor/rounds"
            style={{ color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#16A34A')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}
          >
            MENTOR PORTAL
          </Link>
          <span style={{ color: '#D1D5DB' }}>›</span>
          <span style={{ color: '#374151', fontWeight: 600 }}>VÒNG THI HIỆN TẠI</span>
        </nav>

        {/* PAGE HEADER */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}>
              🤝 Nhóm đội hỗ trợ
            </h1>
            <p style={{ fontSize: '14px', color: '#6B7280', margin: '4px 0 0' }}>
              Danh sách các đội thi được phân công hỗ trợ trực tiếp bởi Mentor {userInfo.fullName || 'Phạm Minh Mentor'}.
            </p>
          </div>

          {/* Chip vòng thi - góc phải */}
          {dbRoundsList.length > 1 ? (
            <Select
              style={{ minWidth: 260 }}
              value={effectiveRoundId ?? undefined}
              onChange={handleRoundChange}
              options={dbRoundsList.map((r: any) => ({
                value: r.roundId ?? r.id,
                label: r.roundName ?? r.name ?? `Vòng ${r.roundId ?? r.id}`,
              }))}
            />
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: '999px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#2563EB',
              whiteSpace: 'nowrap'
            }}>
              🔵 Vòng thi đang chọn: {currentRoundName}
            </div>
          )}
        </div>

        {/* ERROR BANNER (INLINE ALERT) */}
        {error && showErrorAlert && (
          <div className="flex items-start justify-between bg-[var(--warning-surface)] border-l-4 border-amber-500 rounded-lg p-4 shadow-sm text-sm animate-fadeIn">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 custom-label">
              <span className="text-base">⚠️</span>
              <span>Không thể tải dữ liệu — Đã xảy ra lỗi hệ thống.</span>
              <button
                onClick={() => refetch()}
                className="text-[var(--primary)] hover:underline ml-2 font-bold cursor-pointer bg-transparent border-0 p-0"
              >
                [Thử lại]
              </button>
            </div>
            <button
              onClick={() => setShowErrorAlert(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer bg-transparent border-0 text-base font-bold p-1 leading-none"
            >
              ✕
            </button>
          </div>
        )}

        {/* STAT CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px'
        }}>
          {/* Card 1 */}
          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#6B7280',
                marginBottom: '8px'
              }}>
                ĐỘI PHỤ TRÁCH
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                {teams.length}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              background: '#F3F4F6'
            }}>
              👥
            </div>
          </div>

          {/* Card 2 */}
          <div style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#6B7280',
                marginBottom: '8px'
              }}>
                ĐANG HOẠT ĐỘNG
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                {teams.filter(t => t.status === 'ACTIVE').length}
              </div>
            </div>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              background: '#DCFCE7'
            }}>
              ✅
            </div>
          </div>
        </div>

        {/* SECTION "Danh sách đội hỗ trợ" */}
        <div style={{
          background: 'white',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {/* Header của section */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #F3F4F6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }} className="text-gray-900 dark:text-white">
              Danh sách đội hỗ trợ
            </span>
            <button
              onClick={() => refetch()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                background: 'white',
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                cursor: 'pointer'
              }}
            >
              <span className={isFetching ? 'animate-spin' : ''}>↺</span> Làm mới
            </button>
          </div>

          {/* TEAM CARDS LIST / EMPTY STATE */}
          {isLoading ? (
            <div style={{ padding: 24 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          ) : teams.length === 0 ? (
            /* EMPTY STATE */
            <div style={{
              padding: '60px 24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              {/* Illustration */}
              <div style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: '#F3F4F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                marginBottom: '16px'
              }}>
                <span style={{ fontSize: '40px', color: '#9CA3AF' }}>📭</span>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
                Chưa có đội thi nào
              </h3>
              <p style={{ fontSize: '13px', color: '#6B7280', maxWidth: '340px', lineHeight: '1.6', margin: '0 0 24px 0' }}>
                Hiện tại không có đội thi nào được gán cho bạn hỗ trợ ở vòng thi này.
              </p>
            </div>
          ) : (
            <>
            <div style={{ padding: '16px 20px 0' }}>
              <MentorTeamAssignmentsPanel assignments={mentorTeamAssignments} />
              <MentorFinalSchedulePanel
                schedule={finalSchedule}
                assignedTeamIds={teams.map((t) => Number(t.team_id))}
                roundName={currentRoundName}
              />
              <MentorHackathonRankingsPanel rankings={mentorRankings} />
            </div>
            <div
              style={{
                padding: '20px',
                maxHeight: teams.length > 4 ? '480px' : 'none',
                overflowY: teams.length > 4 ? 'auto' : 'visible',
                scrollbarWidth: 'thin'
              }}
            >
              {teams.map((team) => {
                const groupNumber = String(team.group_number || (team.assigned_group ? team.assigned_group.replace(/Nhóm\s+/i, '').replace(/Group\s+/i, '') : 'A'));
                return (
                  <TeamCardWithSlot
                    key={team.team_id}
                    team={team}
                    groupNumber={groupNumber}
                    onViewSubmission={setDrawerTeam}
                  />
                );
              })}
            </div>
            </>
          )}
        </div>
      </div>

      <Drawer
        title={drawerTeam ? `Bài nộp — ${drawerTeam.team_name}` : 'Bài nộp'}
        open={Boolean(drawerTeam)}
        onClose={() => setDrawerTeam(null)}
        width={480}
      >
        {drawerSubmissionsLoading || drawerScoresLoading ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : (
          <Tabs
            items={[
              {
                key: 'submissions',
                label: 'Bài nộp',
                children: drawerSubmissions.length === 0 ? (
                  <p style={{ color: '#6B7280' }}>Chưa có bài nộp.</p>
                ) : (
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {drawerSubmissions.map((sub: any) => (
                      <li key={sub.id ?? sub.submissionId} style={{ marginBottom: 8 }}>
                        #{sub.id ?? sub.submissionId} — {sub.status || 'N/A'}
                        {sub.repoUrl || sub.repo_url ? (
                          <div style={{ fontSize: 12, color: '#6B7280' }}>{sub.repoUrl || sub.repo_url}</div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ),
              },
              {
                key: 'scores',
                label: 'Điểm',
                children: drawerScores.length === 0 ? (
                  <p style={{ color: '#6B7280' }}>Chưa có điểm (có thể chưa khóa chấm).</p>
                ) : (
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {drawerScores.map((score: any, idx: number) => (
                      <li key={score.id ?? idx} style={{ marginBottom: 8 }}>
                        {score.criterionName || score.criterion_name || 'Tiêu chí'}: {score.scoreValue ?? score.score_value ?? '—'}
                      </li>
                    ))}
                  </ul>
                ),
              },
            ]}
          />
        )}
      </Drawer>
    </div>
  );
};

export default MentorSupportPage;
