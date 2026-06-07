import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Typography, Spin } from 'antd';
import { personBApi, PresentationQueueResponse, QueueTeam, QueueGroup } from '../../../api/personB.api';
import toast from 'react-hot-toast';

const { Title, Text } = Typography;

interface FlatTeam extends QueueTeam {
  group_name: string;
}

const PresentationQueuePage: React.FC = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const isCoordinator = ['COORDINATOR', 'ADMIN'].includes(userInfo.role);

  // Local state for queue to support real-time local transitions
  const [localGroups, setLocalGroups] = useState<QueueGroup[]>([]);
  const [useMock, setUseMock] = useState(false);

  // Fetch Presentation Queue
  const { data: queueData, isLoading, error, refetch } = useQuery<PresentationQueueResponse>({
    queryKey: ['presentationQueue', useMock],
    queryFn: async () => {
      if (useMock) {
        const { mockPresentationQueue } = await import('../../../api/personB.mock');
        return mockPresentationQueue;
      }
      try {
        return await personBApi.getPresentationQueue();
      } catch (err: any) {
        toast.error(`Lỗi tải thứ tự thuyết trình: ${err?.message || 'Không thể lấy dữ liệu'}`);
        throw err;
      }
    },
    retry: false
  });

  // Keep local groups in sync with query data
  useEffect(() => {
    if (queueData?.groups) {
      setLocalGroups(queueData.groups);
    }
  }, [queueData]);

  // Flatten the queue to manage order transitions
  const flatTeams: FlatTeam[] = localGroups.reduce((acc: FlatTeam[], group) => {
    const groupTeams = group.teams.map((t) => ({ ...t, group_name: group.group_name }));
    return [...acc, ...groupTeams];
  }, []).sort((a, b) => a.order - b.order);

  // Find currently presenting team
  const currentTeamIndex = flatTeams.findIndex((t) => t.status === 'PRESENTING');
  const currentTeam = currentTeamIndex !== -1 ? flatTeams[currentTeamIndex] : null;

  // Find first upcoming team in the queue if none is currently presenting
  const firstUpcomingTeam = flatTeams.find((t) => t.status === 'WAITING');

  // Find next team in queue (first WAITING team after current presenting team, or first WAITING team in general if none presenting)
  const nextTeam = currentTeamIndex !== -1
    ? flatTeams.slice(currentTeamIndex + 1).find(t => t.status === 'WAITING')
    : flatTeams.find(t => t.status === 'WAITING');

  // Timer States
  const [phase, setPhase] = useState<'present' | 'qa'>('present');
  const [timeLeft, setTimeLeft] = useState(5 * 60); // 300s

  // Timer Effect
  useEffect(() => {
    if (!currentTeam) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          if (phase === 'present') {
            setPhase('qa');
            toast.success('Hết giờ thuyết trình! Chuyển sang phần phản biện (Q&A).');
            return 3 * 60; // 180s Q&A
          }
          clearInterval(interval);
          toast.error('Hết giờ phản biện! Vui lòng chuyển sang đội tiếp theo.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentTeam]);

  // Next Team Mutation (Fire and Forget Backend Sync)
  const nextMutation = useMutation({
    mutationFn: async () => {
      return await personBApi.triggerNextPresentation();
    },
    onSuccess: () => {
      toast.success('Đã đồng bộ thứ tự tiếp theo lên hệ thống.');
    },
    onError: (err: any) => {
      toast.error(`Lỗi gửi báo hiệu BE: ${err?.message || 'Không thể đồng bộ'}`);
    }
  });

  // Start Q&A phase
  const handleStartQA = () => {
    setPhase('qa');
    setTimeLeft(3 * 60); // 180s
  };

  // Start the queue manually from the first team
  const handleStartQueue = () => {
    if (!firstUpcomingTeam) {
      toast.error('Không tìm thấy đội nào đang chờ trong hàng đợi.');
      return;
    }

    const updatedGroups = localGroups.map((group) => {
      return {
        ...group,
        teams: group.teams.map((t) => {
          if (t.team_id === firstUpcomingTeam.team_id) {
            return { ...t, status: 'PRESENTING' as const };
          }
          return t;
        })
      };
    });

    setLocalGroups(updatedGroups);
    setPhase('present');
    setTimeLeft(5 * 60); // 300s

    // Trigger BE fire-and-forget sync
    nextMutation.mutate();
  };

  // Handle clicking "Next Team"
  const handleNextTeam = () => {
    if (!nextTeam) {
      toast.error('Đã đến đội cuối cùng trong hàng đợi.');
      return;
    }

    // Local state transformation
    const updatedGroups = localGroups.map((group) => {
      return {
        ...group,
        teams: group.teams.map((t) => {
          if (t.team_id === currentTeam?.team_id) {
            return { ...t, status: 'DONE' as const };
          }
          if (t.team_id === nextTeam.team_id) {
            return { ...t, status: 'PRESENTING' as const };
          }
          return t;
        })
      };
    });

    setLocalGroups(updatedGroups);
    setPhase('present');
    setTimeLeft(5 * 60); // 300s

    // Trigger BE fire-and-forget sync
    nextMutation.mutate();
  };

  // Timer display helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Time format helper for schedule display
  const formatTimeRange = (startStr?: string, endStr?: string) => {
    if (!startStr) return '';
    try {
      const start = new Date(startStr);
      const startH = String(start.getHours()).padStart(2, '0');
      const startM = String(start.getMinutes()).padStart(2, '0');
      
      if (endStr) {
        const end = new Date(endStr);
        const endH = String(end.getHours()).padStart(2, '0');
        const endM = String(end.getMinutes()).padStart(2, '0');
        return `${startH}:${startM} - ${endH}:${endM}`;
      }
      return `${startH}:${startM}`;
    } catch {
      return '';
    }
  };

  // Date format helper for schedule start
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      
      const mins = String(d.getMinutes()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      
      return `${hours}:${mins} ngày ${day}/${month}`;
    } catch {
      return dateStr;
    }
  };

  // Stats for Card 2
  const total = flatTeams.length;
  const done = flatTeams.filter((t) => t.status === 'DONE').length;
  const absent = flatTeams.filter((t) => t.status === 'ELIMINATED').length;
  const progressPercent = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* PAGE HEADER */}
      <div style={{ marginBottom: '20px' }}>
        
        {/* Title row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
            color: '#111827'
          }}>
            👥 Thứ Tự Thuyết Trình
          </h1>
          <button 
            onClick={() => refetch()}
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
              cursor: 'pointer',
              color: '#374151',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            ↺ Làm mới
          </button>
        </div>

        {/* Subtitle */}
        <p style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 10px 0' }}>
          Điều hành phòng thuyết trình và theo dõi thời gian trình bày, phản biện.
        </p>

        {/* Role badge */}
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: '#DCFCE7',
          border: '1px solid #BBF7D0',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 700,
          color: '#16A34A',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          ✦ VAI TRÒ: {userInfo.role || 'MENTOR'}
        </span>

      </div>

      {isLoading ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px',
          gap: '12px'
        }}>
          <Spin size="large" />
          <div style={{ color: '#6B7280', fontSize: '14px' }}>Đang tải thứ tự thuyết trình...</div>
        </div>
      ) : error && !useMock ? (
        <div style={{
          background: 'white',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#DC2626', margin: '0 0 8px 0' }}>Lỗi kết nối máy chủ</h3>
          <p style={{ color: '#6B7280', fontSize: '14px', margin: '0 0 16px 0' }}>{(error as any)?.message || 'Không thể tải thứ tự thuyết trình từ server'}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button 
              onClick={() => refetch()} 
              style={{
                padding: '8px 16px',
                background: '#3B82F6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Thử lại
            </button>
            <button 
              onClick={() => setUseMock(true)} 
              style={{
                padding: '8px 16px',
                background: 'white',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#374151',
                fontWeight: 500
              }}
            >
              Xem Demo Mock
            </button>
          </div>
        </div>
      ) : (
        /* LAYOUT TỔNG THỂ */
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 280px',
          gap: '16px',
          alignItems: 'start'
        }}>
          
          {/* CỘT TRÁI — QUEUE LIST */}
          <div>
            {localGroups.map((group) => (
              <div 
                key={group.group_name}
                style={{
                  background: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}
              >
                {/* Section header */}
                <div style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#374151',
                  background: '#F9FAFB'
                }}>
                  👥 {group.group_name}
                </div>

                {/* Danh sách đội */}
                {group.teams.map((team, idx) => {
                  const isPresenting = team.status === 'PRESENTING';
                  const isDone = team.status === 'DONE';
                  const isEliminated = team.status === 'ELIMINATED';

                  // Row wrapper with bottom border separation
                  return (
                    <div 
                      key={team.team_id}
                      style={{
                        borderBottom: idx < group.teams.length - 1 ? '1px solid #F3F4F6' : 'none'
                      }}
                    >
                      {isPresenting ? (
                        /* Trạng thái 1: PRESENTING — đang thuyết trình */
                        <div style={{
                          padding: '12px 16px',
                          background: '#F0FDF4',
                          borderLeft: '3px solid #16A34A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}>
                          {/* Số thứ tự */}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#16A34A',
                            color: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {team.order}
                          </div>

                          {/* Tên + ID */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                              {team.team_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>ID: {team.team_id}</span>
                              {team.slot_start_at && (
                                <span style={{ color: '#4B5563', fontWeight: 500 }}>
                                  ⏱ {formatTimeRange(team.slot_start_at, team.slot_end_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge "Đang Thuyết Trình" */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 12px',
                            background: '#16A34A',
                            color: 'white',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}>
                            ● Đang Thuyết Trình
                          </span>
                        </div>
                      ) : isEliminated ? (
                        /* Trạng thái 3: ELIMINATED — bị loại */
                        <div style={{
                          padding: '12px 16px',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: 0.6
                        }}>
                          {/* Số thứ tự */}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#FEE2E2',
                            color: '#EF4444',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {team.order}
                          </div>

                          {/* Tên + ID */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF', textDecoration: 'line-through' }}>
                              {team.team_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>ID: {team.team_id}</span>
                              {team.slot_start_at && (
                                <span style={{ color: '#9CA3AF' }}>
                                  ⏱ {formatTimeRange(team.slot_start_at, team.slot_end_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge */}
                          <span style={{ color: '#9CA3AF', fontSize: '12px' }}>
                            ELIMINATED
                          </span>
                        </div>
                      ) : isDone ? (
                        /* Trạng thái Hoàn thành */
                        <div style={{
                          padding: '12px 16px',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          opacity: 0.7
                        }}>
                          {/* Số thứ tự */}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#E5E7EB',
                            color: '#9CA3AF',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {team.order}
                          </div>

                          {/* Tên + ID */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#9CA3AF' }}>
                              {team.team_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>ID: {team.team_id}</span>
                              {team.slot_start_at && (
                                <span style={{ color: '#9CA3AF' }}>
                                  ⏱ {formatTimeRange(team.slot_start_at, team.slot_end_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge */}
                          <span style={{ color: '#16A34A', fontSize: '12px', fontWeight: 600 }}>
                            ✓ Hoàn Thành
                          </span>
                        </div>
                      ) : (
                        /* Trạng thái 2: WAITING — chờ đợi */
                        <div style={{
                          padding: '12px 16px',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                        }}>
                          {/* Số thứ tự */}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            background: '#F3F4F6',
                            color: '#6B7280',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}>
                            {team.order}
                          </div>

                          {/* Tên + ID */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                              {team.team_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px', display: 'flex', gap: '8px' }}>
                              <span>ID: {team.team_id}</span>
                              {team.slot_start_at && (
                                <span style={{ color: '#4B5563' }}>
                                  ⏱ {formatTimeRange(team.slot_start_at, team.slot_end_at)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Badge "Chờ Đợi" */}
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 12px',
                            background: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '999px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#6B7280',
                          }}>
                            ⏱ Chờ Đợi
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* CỘT PHẢI — PANEL */}
          <div>
            
            {/* Card 1: Đội đang thuyết trình — dark card */}
            <div style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              borderRadius: '12px',
              padding: '20px',
              color: 'white',
              marginBottom: '12px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
            }}>

              {/* Label nhỏ */}
              <div style={{
                fontSize: '10px',
                fontWeight: 600,
                color: '#94A3B8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px'
              }}>
                {currentTeam ? 'ĐỘI ĐANG THUYẾT TRÌNH' : 'PHÒNG THUYẾT TRÌNH CHƯA BẮT ĐẦU'}
              </div>

              {/* Tên đội to */}
              <div style={{
                fontSize: '22px',
                fontWeight: 800,
                lineHeight: 1.3,
                marginBottom: '12px',
                wordBreak: 'break-word'
              }}>
                {currentTeam 
                  ? currentTeam.team_name 
                  : (firstUpcomingTeam ? firstUpcomingTeam.team_name : '--- Không có ---')}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span style={{
                  padding: '3px 10px',
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  {currentTeam 
                    ? (phase === 'present' ? 'Thuyết Trình' : 'Hỏi & Đáp')
                    : 'Chưa Bắt Đầu'}
                </span>
                <span style={{
                  padding: '3px 10px',
                  background: currentTeam ? '#16A34A' : '#4B5563',
                  borderRadius: '999px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}>
                  {currentTeam ? 'Active Slot' : 'Dự Kiến'}
                </span>
              </div>

              {/* Timer + ID grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: '#94A3B8',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    {currentTeam ? 'THỜI GIAN CÒN LẠI' : 'DỰ KIẾN BẮT ĐẦU'}
                  </div>
                  <div style={{
                    fontSize: currentTeam ? '28px' : '13px',
                    fontWeight: 800,
                    fontFamily: currentTeam ? 'monospace' : 'inherit',
                    color: 'white',
                    lineHeight: currentTeam ? 'inherit' : '24px'
                  }}>
                    {currentTeam 
                      ? formatTime(timeLeft) 
                      : (firstUpcomingTeam && firstUpcomingTeam.slot_start_at 
                          ? formatDateTime(firstUpcomingTeam.slot_start_at) 
                          : 'N/A')}
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '12px',
                }}>
                  <div style={{
                    fontSize: '10px',
                    color: '#94A3B8',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    MÃ NHÓM
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {currentTeam 
                      ? `ID: ${currentTeam.team_id}` 
                      : (firstUpcomingTeam ? `ID: ${firstUpcomingTeam.team_id}` : 'N/A')}
                  </div>
                </div>
              </div>

              {/* Nút điều khiển — Chỉ dành cho Coordinator/Admin */}
              {isCoordinator && (
                currentTeam ? (
                  phase === 'present' ? (
                    <button 
                      onClick={handleStartQA}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#16A34A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
                      }}
                    >
                      ⏱ Bắt đầu phản biện
                    </button>
                  ) : (
                    <button 
                      onClick={handleNextTeam}
                      disabled={!nextTeam}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#3B82F6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: nextTeam ? 'pointer' : 'not-allowed',
                        opacity: nextTeam ? 1 : 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: nextTeam ? '0 2px 4px rgba(59,130,246,0.3)' : 'none'
                      }}
                    >
                      ⏭ Đội tiếp theo
                    </button>
                  )
                ) : (
                  firstUpcomingTeam && (
                    <button 
                      onClick={handleStartQueue}
                      style={{
                        width: '100%',
                        padding: '12px',
                        background: '#16A34A',
                        color: 'white',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '14px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 4px rgba(22,163,74,0.3)'
                      }}
                    >
                      ▶ Bắt đầu thuyết trình
                    </button>
                  )
                )
              )}

              {/* Phân quyền Mentor/Judge hiển thị thông tin chờ đợi */}
              {!isCoordinator && !currentTeam && firstUpcomingTeam && (
                <div style={{
                  textAlign: 'center',
                  padding: '10px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#94A3B8'
                }}>
                  ⏱ Chờ ban tổ chức bắt đầu thuyết trình...
                </div>
              )}

            </div>

            {/* Card 2: Trạng thái phòng */}
            <div style={{
              background: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#1F2937' }}>
                Trạng thái phòng
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#6B7280' }}>Tổng số đội</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{total}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#6B7280' }}>Đã hoàn thành</span>
                  <span style={{ fontWeight: 700, color: '#16A34A' }}>{done}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#6B7280' }}>Vắng mặt</span>
                  <span style={{ fontWeight: 700, color: '#EF4444' }}>{absent}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '6px',
                background: '#F3F4F6',
                borderRadius: '999px',
                overflow: 'hidden',
                marginBottom: '4px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: '#16A34A',
                  borderRadius: '999px',
                  transition: 'width 500ms ease',
                }} />
              </div>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textAlign: 'right' }}>
                Tiến độ: {progressPercent}%
              </div>
            </div>

            {/* Card 3: Banner ảnh bottom */}
            <div style={{
              borderRadius: '12px',
              overflow: 'hidden',
              height: '120px',
              position: 'relative',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <img 
                src="/banner-hackathon.jpg" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                alt="Hackathon Room Banner"
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '12px',
              }}>
                <div style={{ color: 'white', fontSize: '12px', fontWeight: 700 }}>
                  PHÒNG HỘI THẢO A1
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px' }}>
                  Tầng 12, Toa nhà Công nghệ
                </div>
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default PresentationQueuePage;
