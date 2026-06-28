// src/features/presentation/pages/PresentationQueuePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Typography, Spin, Alert, Segmented, Card, Row, Col, Button, Tag, Space, Divider } from 'antd';
import { 
  RetweetOutlined, CheckCircleFilled, 
  ClockCircleOutlined, TrophyOutlined, AppstoreOutlined, ArrowLeftOutlined,
  ThunderboltOutlined, SettingOutlined, PlayCircleOutlined, LoadingOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

// Import Services & APIs
import { personBApi } from '../../../api/personB.api';
import { roundService } from '../../rounds/services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { hackathonService } from '../../hackathons/services/hackathonService';
import toast from 'react-hot-toast';

// Import Components phụ
import PresentationControllerCard from '../components/PresentationControllerCard';
import PresentationReadinessPanel from '../components/PresentationReadinessPanel';
import FinalPresentationDurationCard from '../components/FinalPresentationDurationCard';

const { Title, Text } = Typography;

// --- BRANDING COLORS ---
const PRIMARY_BLUE = '#2563eb';
const PRIMARY_BLUE_LIGHT = '#eff6ff';

// ==========================================
// COMPONENT: GAME QUAY SỐ (CHÍNH XÁC VÀO SLOT)
// ==========================================
const LotteryAnimation = ({ isRolling, onComplete, totalTeams }: { isRolling: boolean, onComplete: () => void, totalTeams: number }) => {
  const [balls, setBalls] = useState<any[]>([]);

  useEffect(() => {
    if (isRolling && totalTeams > 0) {
      const slotCount = 5; 
      
      const newBalls = Array.from({ length: totalTeams }).map((_, i) => {
        const startX = 20 + Math.random() * 60; 
        const targetSlot = i % slotCount; 
        const slotWidth = 100 / slotCount;
        const targetX = (targetSlot * slotWidth) + (slotWidth / 2); 

        return {
          id: i,
          startX: `${startX}%`,
          targetX: `${targetX}%`,
          delay: Math.random() * 2 
        };
      });
      setBalls(newBalls);

      const timer = setTimeout(() => {
        onComplete();
      }, 4500);
      return () => clearTimeout(timer);
    } else {
      setBalls([]);
    }
  }, [isRolling, totalTeams, onComplete]);

  return (
    <div style={{ height: 280, background: '#0f172a', borderRadius: 24, position: 'relative', overflow: 'hidden', border: '4px solid #1e293b', boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.5)' }}>
      {Array.from({ length: 40 }).map((_, i) => (
        <div key={`peg-${i}`} style={{
          position: 'absolute', width: 6, height: 6, background: '#475569', borderRadius: '50%',
          top: `${15 + Math.floor(i / 8) * 18}%`, left: `${10 + (i % 8) * 11 + (Math.floor(i / 8) % 2 === 0 ? 5 : 0)}%`,
          boxShadow: '0 0 5px #000'
        }} />
      ))}
      
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 50, display: 'flex', borderTop: '2px solid #334155' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`slot-${i}`} style={{ flex: 1, borderRight: i < 4 ? '2px solid #334155' : 'none', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8, background: 'rgba(51, 65, 85, 0.3)' }}>
            <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>SLOT {i+1}</Text>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {balls.map((ball) => (
          <motion.div
            key={`ball-${ball.id}`}
            initial={{ y: -30, x: ball.startX, opacity: 0 }}
            animate={{ 
              y: [0, 80, 140, 200, 240], 
              x: [
                ball.startX, 
                `calc(${ball.startX} + ${Math.random() > 0.5 ? '20px' : '-20px'})`, 
                `calc(${ball.targetX} + ${Math.random() > 0.5 ? '15px' : '-15px'})`, 
                ball.targetX, 
                ball.targetX  
              ],
              opacity: [0, 1, 1, 1, 1] 
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.5, delay: ball.delay, ease: "easeOut" }}
            style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'radial-gradient(circle at 30% 30%, #60a5fa, #2563eb)', boxShadow: '0 4px 10px rgba(37,99,235,0.8)', zIndex: 10, transform: 'translateX(-50%)' }}
          >
            <div style={{ color: '#fff', fontSize: 10, fontWeight: 900, textAlign: 'center', lineHeight: '20px' }}>{ball.id + 1}</div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {isRolling && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.6)', zIndex: 20 }}>
          <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900, textShadow: '0 0 20px #2563eb' }}>ĐANG QUAY SỐ BỐC THĂM...</Title>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// TRANG CHÍNH: QUẢN LÝ HÀNG ĐỢI
// ==========================================
const PresentationQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const userRole = String(userInfo.role || '').toUpperCase();
  const isCoordinator = ['COORDINATOR', 'ADMIN'].includes(userRole);

  const [searchParams, setSearchParams] = useSearchParams();
  const roundIdFromUrl = searchParams.get('roundId');
  const trackIdFromUrl = searchParams.get('trackId');

  const [roundId, setRoundId] = useState<number | null>(roundIdFromUrl ? Number(roundIdFromUrl) : null);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(trackIdFromUrl ? Number(trackIdFromUrl) : null);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    if (!roundIdFromUrl) personBApi.resolveActiveRoundId().then((id: number | null) => { if (id) setRoundId(id); });
  }, [roundIdFromUrl]);

  // ── QUERIES ──
  const { data: queueResponse, isLoading: isQueueLoading, refetch: refetchQueue } = useQuery<any>({
    queryKey: ['presentationQueue', roundId, selectedTrackId],
    queryFn: () => personBApi.getPresentationQueue(roundId as number, selectedTrackId || undefined),
    enabled: roundId !== null,
    refetchInterval: 3000, 
  });

  const { data: roundTracks = [] } = useQuery<any[]>({
    queryKey: ['roundTracks', roundId],
    queryFn: async () => {
      const data: any = await trackService.listByRound(roundId!);
      return Array.isArray(data) ? data : data?.items || [];
    },
    enabled: roundId !== null,
  });

  const { data: roundDetail } = useQuery<any>({
    queryKey: ['roundDetail', roundId],
    queryFn: () => roundService.getById(roundId!),
    enabled: roundId !== null,
  });

  const currentHackathonId = roundDetail?.hackathonId || roundDetail?.hackathon_id;
  const { data: hackathonDetail } = useQuery<any>({
    queryKey: ['hackathonDetail', currentHackathonId],
    queryFn: () => hackathonService.getById(currentHackathonId!),
    enabled: !!currentHackathonId,
  });

  const { refetch: refetchSubmissions } = useQuery({
    queryKey: ['roundSubmissions', roundId],
    queryFn: () => personBApi.getRoundSubmissions(roundId!),
    enabled: roundId !== null && isCoordinator,
  });

  // ── BÓC TÁCH DỮ LIỆU ──
  const isFinalRound = Boolean(roundDetail?.isFinal || roundDetail?.is_final);
  const scoringLocked = Boolean(roundDetail?.scoringLocked || roundDetail?.scoring_locked);
  const hackathonName = hackathonDetail?.name || hackathonDetail?.title || 'SEAL Hackathon'; 
  const roundName = roundDetail?.name || (isFinalRound ? 'Vòng Chung Kết' : 'Vòng Sơ Loại');

  const queueData = queueResponse?.data || queueResponse;
  const tracksData = queueData?.tracks || [];

  const trackSegmentOptions = useMemo(() => {
    if (isFinalRound) return [{ label: 'Toàn bộ Hệ thống (Chung kết)', value: 0 }];
    return roundTracks.map((t: any) => ({ label: t.name || `Bảng đấu ${t.id}`, value: t.id }));
  }, [roundTracks, isFinalRound]);

  useEffect(() => {
    if (!selectedTrackId && trackSegmentOptions.length > 0 && !isFinalRound) setSelectedTrackId(trackSegmentOptions[0].value as number);
  }, [trackSegmentOptions, selectedTrackId, isFinalRound]);

  const activeTrackData = useMemo(() => {
    if (!tracksData || tracksData.length === 0) return null;
    if (isFinalRound) return tracksData[0];
    return tracksData.find((t: any) => t.trackId === selectedTrackId) || tracksData[0];
  }, [tracksData, selectedTrackId, isFinalRound]);

  const teamsList = activeTrackData?.items || [];
  const isShuffled = Boolean(activeTrackData?.shuffled);
  const timerStarted = useMemo(() => {
    const items = teamsList || [];
    return items.some((item: any) => {
      const status = String(item?.status || '').toUpperCase();
      if (status === 'PRESENTING') return true;
      const phase = String(item?.timer?.phase || '').toUpperCase();
      return ['PRESENTING', 'QA', 'PAUSED', 'ENDED'].includes(phase);
    });
  }, [teamsList]);

  const totalTeamsToRoll = teamsList.length > 0 ? teamsList.length : 6;

  // ── MUTATIONS ──
  const shuffleMutation = useMutation({
    mutationFn: () => {
      const trackIdsArg = isFinalRound || !selectedTrackId ? undefined : [selectedTrackId];
      return personBApi.shufflePresentationQueue(roundId as number, trackIdsArg);
    },
    onSuccess: () => { 
      toast.success('Hệ thống đã phân bổ thứ tự thành công!'); 
      refetchQueue(); 
    },
    onError: (err: any) => toast.error(err?.message || 'Có lỗi xảy ra khi tạo hàng đợi.')
  });

  const handleStartLottery = () => {
    setIsRolling(true);
  };

  const onLotteryComplete = () => {
    setIsRolling(false);
    shuffleMutation.mutate();
  };

  const handleTrackChange = (val: number | string) => {
    const numVal = Number(val);
    setSelectedTrackId(numVal);
    const next = new URLSearchParams(searchParams);
    next.set('trackId', String(numVal));
    if (roundId) next.set('roundId', String(roundId));
    setSearchParams(next, { replace: true });
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchQueue(), isCoordinator ? refetchSubmissions() : Promise.resolve()]);
    toast.success('Đã cập nhật dữ liệu mới nhất');
  };

  // ── RENDER ──
  if (isQueueLoading && !queueData) {
    return <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}><Spin size="large" /><Text style={{ marginTop: 16 }}>Đang thiết lập bàn làm việc...</Text></div>;
  }

  if (!roundId) {
    return (
      <div style={{ padding: 100, textAlign: 'center' }}>
        <Title level={3} style={{ color: '#1e293b' }}>Không xác định được Vòng Thi</Title>
        <Text type="secondary">Vui lòng quay lại trang Cấu hình và chọn "Mở hàng đợi" trên 1 vòng cụ thể.</Text>
        <br/><br/><Button type="primary" onClick={() => navigate(-1)} style={{ background: PRIMARY_BLUE, marginTop: 16 }}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1440, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 64px)' }}>
      
      {/* ── HEADER CÓ NÚT BACK ── */}
      <div style={{ marginBottom: 24 }}>
        <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ padding: 0, marginBottom: 12, color: '#64748b', fontWeight: 600 }}>
          Quay lại Cấu hình Sự kiện
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
              <SettingOutlined style={{ color: PRIMARY_BLUE, marginRight: 12 }} />
              Điều Phối Lịch Trình Thuyết Trình
            </Title>
            <Text type="secondary" style={{ fontSize: 16 }}>Thiết lập thứ tự lên sân khấu và phân công quyền điều khiển cho Giám Khảo.</Text>
          </div>
          <Button onClick={handleRefreshAll} size="large" style={{ borderRadius: '8px', fontWeight: 600, borderColor: '#cbd5e1' }}>
            <RetweetOutlined /> Cập nhật Đồng bộ
          </Button>
        </div>
      </div>

      {/* ── INFO CARD TỔNG QUAN ── */}
      <Card style={{ borderRadius: 16, border: `1px solid ${PRIMARY_BLUE}40`, background: '#fff', marginBottom: 24, boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }} styles={{ body: { padding: '16px 24px' } }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large" split={<Divider type="vertical" style={{ height: 32, borderColor: '#e2e8f0' }} />}>
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>Sự Kiện Đang Điều Phối</Text>
                <Text strong style={{ fontSize: 18, color: '#0f172a' }}>{hackathonName}</Text>
              </div>
              <div>
                <Text type="secondary" style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>Phạm Vi Vòng Thi</Text>
                <Tag color={isFinalRound ? 'gold' : 'blue'} icon={isFinalRound ? <TrophyOutlined/> : <AppstoreOutlined/>} style={{ fontSize: 15, padding: '4px 12px', margin: 0, fontWeight: 700, borderRadius: 8 }}>
                  {roundName}
                </Tag>
              </div>
            </Space>
          </Col>
          <Col>
            {!isFinalRound && roundTracks.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f8fafc', padding: '8px 16px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                <Text strong style={{ fontSize: 15, color: '#475569' }}>Chọn Bảng đấu cần phân bổ:</Text>
                <Segmented size="large" value={selectedTrackId || 0} onChange={handleTrackChange} options={trackSegmentOptions} style={{ fontWeight: 700, fontSize: 15 }} />
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {scoringLocked && (
        <Alert type="error" message="Vòng thi này đã chốt sổ điểm!" description="Mọi thiết lập về hàng đợi và chấm điểm đã bị đóng băng." showIcon style={{ marginBottom: 24, fontWeight: 600, borderRadius: 12, fontSize: 15 }} />
      )}

      {/* ========================================================================= */}
      {/* KHU VỰC CHÍNH: CHIA 2 CỘT (DANH SÁCH & PHÂN CÔNG) */}
      {/* ========================================================================= */}
      <Row gutter={32} align="stretch" style={{ flex: 1, paddingBottom: 40 }}>
        
        {/* CỘT TRÁI: HÀNG ĐỢI & GAME QUAY SỐ */}
        <Col xs={24} lg={15} style={{ display: 'flex', flexDirection: 'column' }}>
          <Card 
            title={<span style={{ display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 800, color: '#1e293b' }}><ThunderboltOutlined style={{ marginRight: 12, color: PRIMARY_BLUE, fontSize: 24 }} /> Thứ Tự Lên Sân Khấu</span>} 
            extra={isShuffled && <Tag color="blue" style={{ fontWeight: 800, fontSize: 15, padding: '4px 16px', borderRadius: 20 }}>Có {teamsList.length} Đội tham gia</Tag>}
            style={{ borderRadius: 24, boxShadow: '0 4px 24px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', flex: 1, display: 'flex', flexDirection: 'column' }} 
            styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}
          >
            {!isShuffled ? (
              // ── MÀN HÌNH CHƯA XÁO TRỘN (KÈM GAME) ──
              <div style={{ flex: 1, padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Title level={3} style={{ color: '#1e293b', marginBottom: 12, fontWeight: 900, textAlign: 'center' }}>Bốc Thăm Phân Bổ Ngẫu Nhiên</Title>
                <Text style={{ fontSize: 16, color: '#475569', display: 'block', maxWidth: 600, margin: '0 auto 32px', lineHeight: 1.6, textAlign: 'center' }}>
                  Thay vì sắp xếp thủ công, hệ thống SEAL sẽ dùng thuật toán quay số để phân bổ các đội thi vào các khung giờ thuyết trình hoàn toàn ngẫu nhiên và minh bạch.
                </Text>

                <LotteryAnimation isRolling={isRolling} onComplete={onLotteryComplete} totalTeams={totalTeamsToRoll} />

                <div style={{ textAlign: 'center', marginTop: 32 }}>
                  <Button 
                    type="primary" size="large" icon={<RetweetOutlined />} loading={isRolling || shuffleMutation.isPending} 
                    onClick={handleStartLottery} 
                    style={{ height: 64, padding: '0 40px', borderRadius: 16, fontSize: 18, fontWeight: 900, background: PRIMARY_BLUE, boxShadow: `0 12px 24px ${PRIMARY_BLUE}40` }}
                  >
                    {isRolling ? 'Hệ thống đang thả bóng...' : 'Khởi Động Máy Quay Số'}
                  </Button>
                </div>
              </div>
            ) : (
              // ── DANH SÁCH ĐÃ XÁO TRỘN ──
              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
                <div style={{ background: '#f8fafc', padding: '12px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
                  <Text strong style={{ color: '#64748b' }}>SLOT / ĐỘI THI</Text>
                  <Text strong style={{ color: '#64748b' }}>TRẠNG THÁI</Text>
                </div>
                {teamsList.map((team: any, idx: number) => {
                  // --- LOGIC PHÂN BIỆT TRẠNG THÁI CHUẨN XÁC ---
                  const isCurrentSlot = team.status === 'PRESENTING' || team.queueStatus === 'PRESENTING';
                  const isDone = team.status === 'DONE' || team.queueStatus === 'DONE';
                  const timerPhase = team.timer?.phase || 'IDLE';

                  // Chỉ thực sự LIVE khi đồng hồ đang chạy (hoặc Pause/QA/Ended)
                  const isActuallyLive = isCurrentSlot && ['PRESENTING', 'PAUSED', 'QA', 'ENDED'].includes(timerPhase);
                  // Đang ở Slot hiện tại nhưng Trưởng ban chưa bấm Start
                  const isPreparing = isCurrentSlot && ['IDLE', 'SETUP'].includes(timerPhase);
                  
                  // Phối màu động theo trạng thái
                  const rowBg = isActuallyLive ? PRIMARY_BLUE_LIGHT : (isPreparing ? '#fffbeb' : (isDone ? '#f8fafc' : '#fff'));
                  const rowBorder = isActuallyLive ? `6px solid ${PRIMARY_BLUE}` : (isPreparing ? `6px solid #f59e0b` : '6px solid transparent');
                  const orderBg = isActuallyLive ? PRIMARY_BLUE : (isPreparing ? '#f59e0b' : (isDone ? '#e2e8f0' : '#f1f5f9'));
                  const orderColor = (isActuallyLive || isPreparing) ? '#fff' : '#475569';
                  const nameColor = isActuallyLive ? '#1d4ed8' : (isPreparing ? '#b45309' : (isDone ? '#94a3b8' : '#0f172a'));

                  return (
                    <div key={team.submissionId || idx} style={{
                      padding: '24px', borderBottom: '1px solid #f1f5f9',
                      background: rowBg,
                      borderLeft: rowBorder,
                      transition: 'all 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                      <Space size="large">
                        <div style={{ width: 56, height: 56, borderRadius: 16, background: orderBg, color: orderColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24 }}>
                          {team.order}
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 20, color: nameColor, textDecoration: isDone ? 'line-through' : 'none', display: 'block', letterSpacing: 0.5 }}>
                            {isFinalRound ? team.teamName : `TEAM-SBM#${team.submissionId || 'N/A'}`}
                          </Text>
                          {!isFinalRound && (
                            <div style={{ fontSize: 14, color: '#64748b', marginTop: 6, fontWeight: 500 }}>Bí danh nội bộ: <span style={{ fontWeight: 700, color: '#475569' }}>{team.teamName}</span></div>
                          )}
                        </div>
                      </Space>
                      <div>
                        {/* THẺ ĐANG THI CHÍNH THỨC */}
                        {isActuallyLive && (
                          <Tag color="blue" icon={<PlayCircleOutlined />} style={{ padding: '8px 16px', borderRadius: 12, fontWeight: 800, fontSize: 14, border: `2px solid ${PRIMARY_BLUE}` }}>ĐANG TRÌNH BÀY</Tag>
                        )}
                        {/* THẺ ĐANG CHUẨN BỊ (IDLE/SETUP) */}
                        {isPreparing && (
                          <Tag color="orange" icon={<LoadingOutlined />} style={{ padding: '8px 16px', borderRadius: 12, fontWeight: 800, fontSize: 14, border: `2px solid #f59e0b` }}>ĐANG CHUẨN BỊ</Tag>
                        )}
                        {/* THỂ ĐÃ XONG VÀ CHỜ */}
                        {isDone && <Text type="secondary" style={{ fontSize: 15, fontWeight: 600 }}><CheckCircleFilled style={{ color: '#94a3b8', marginRight: 6 }}/> Đã bảo vệ xong</Text>}
                        {team.status === 'WAITING' && <Text type="secondary" style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}><ClockCircleOutlined style={{ marginRight: 6 }}/> Chờ tới lượt</Text>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </Col>

        {/* CỘT PHẢI (ZONE 3): CẤU HÌNH & GÁN QUYỀN GIÁM KHẢO TRƯỞNG */}
        <Col xs={24} lg={9} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Card Phân Công Trưởng Ban Giám Khảo */}
          {isCoordinator && roundId && (
            <div style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                 <Title level={4} style={{ margin: 0, color: '#0f172a', fontWeight: 900 }}>Ủy Quyền Giám Khảo Trưởng</Title>
                 <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: 'block', lineHeight: 1.6 }}>Người được chọn sẽ nắm quyền bấm giờ và mở khóa form chấm điểm cho các thành viên khác trong hội đồng.</Text>
              </div>
              <div style={{ padding: 24 }}>
                 <PresentationControllerCard trackId={selectedTrackId as any} roundId={roundId as any} mode={isFinalRound ? 'round' : 'track'} canGrant={true} />
              </div>
            </div>
          )}

          {isCoordinator && roundId && isFinalRound && (
            <FinalPresentationDurationCard roundId={roundId} timerStarted={timerStarted} />
          )}

          {isCoordinator && roundId && isFinalRound && (
            <Alert
              type="info"
              showIcon
              message="Chung kết — HARD_LOCK"
              description="Vòng Chung kết không duyệt nộp trễ. Bài nộp sau deadline sẽ bị REJECTED (HARD_LOCK)."
              style={{ borderRadius: 16 }}
            />
          )}

          {/* Card Tình trạng Bài Nộp (Màn hình Review trễ) — chỉ Sơ loại */}
          {isCoordinator && roundId && !isFinalRound && (
             <PresentationReadinessPanel 
                roundId={roundId as any} 
                trackId={selectedTrackId as any} 
                trackName={activeTrackData?.trackName} 
                canReviewLate={true} 
                onReviewSuccess={() => refetchQueue()} 
             />
          )}

        </Col>
      </Row>

    </div>
  );
};

export default PresentationQueuePage;