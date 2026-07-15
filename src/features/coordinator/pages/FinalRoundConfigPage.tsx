import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, Grid, List, Select, Space, Spin, Tag, Tooltip, Typography, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Settings, RefreshCw, UserPlus, Clock, FileText, Play, CheckCircle2, AlertCircle } from 'lucide-react';
import FinalRoundCoordinatorStepper from '../components/FinalRoundCoordinatorStepper';
import CalibrationSessionManager from '../components/CalibrationSessionManager';
import FinalPresentationDurationCard from '../../presentation/components/FinalPresentationDurationCard';
import { useHackathonSelect } from '../hooks/useHackathonSelect';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import { reviewService } from '../../review/services/reviewService';
import { ROUTES } from '../../../shared/constants/routes';
import { resolveUserError, resolveStatusLabel } from '../../../shared/errors/resolveUserError';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';
import {
  canOpenPresentationQueue,
  getOpenQueueTooltip,
  isRoundActive,
} from '../../rounds/utils/roundLifecycleGates';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const formatReadinessMessage = (msg: string) => {
  if (!msg) return '';
  let friendly = msg;
  friendly = friendly.replace(/Round Chung kết/gi, 'Vòng Chung kết');
  friendly = friendly.replace(/Round Sơ loại/gi, 'Vòng Sơ loại');
  friendly = friendly.replace(/advance từ/gi, 'chuyển tiếp đội thi đi tiếp từ');
  friendly = friendly.replace(/activate Chung kết/gi, 'kích hoạt Vòng Chung kết');
  friendly = friendly.replace(/guest judge/gi, 'giám khảo khách mời');
  friendly = friendly.replace(/blockers/gi, 'yêu cầu bắt buộc');
  friendly = friendly.replace(/activate/gi, 'kích hoạt');
  friendly = friendly.replace(/GD4/gi, 'Vòng Sơ loại (Giai đoạn 4)');
  friendly = friendly.replace(/GD5/gi, 'Vòng Chung kết (Giai đoạn 5)');
  friendly = friendly.replace(/CK/gi, 'Chung kết');
  friendly = friendly.replace(/Chưa có đội tham gia/gi, 'Chưa chuyển danh sách đội thi tham gia');
  return friendly;
};

const TechDecoration: React.FC = () => {
  return (
    <svg
      width="380"
      height="100%"
      viewBox="0 0 380 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: 'absolute',
        right: 0,
        top: 0,
        height: '100%',
        pointerEvents: 'none',
        opacity: 0.85,
        zIndex: 0,
      }}
    >
      <defs>
        <radialGradient id="glow" cx="80%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#c7d2fe" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cubeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      
      {/* Background Glow */}
      <rect width="100%" height="100%" fill="url(#glow)" />

      {/* Connection Grid Lines */}
      <path d="M 280,100 L 320,60 M 280,100 L 240,80 M 320,60 L 360,80 M 320,60 L 320,10" stroke="#818cf8" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" />
      
      {/* Glowing Nodes */}
      <circle cx="320" cy="60" r="4" fill="#818cf8" opacity="0.6" />
      <circle cx="240" cy="80" r="3" fill="#818cf8" opacity="0.4" />

      {/* Floating Isometric Cube 1 (Small Top Right) */}
      <g transform="translate(320, 20)">
        {/* Top Face */}
        <polygon points="0,-8 14,-15 28,-8 14,0" fill="#a5b4fc" fillOpacity="0.65" />
        {/* Left Face */}
        <polygon points="0,-8 14,0 14,16 0,8" fill="#818cf8" fillOpacity="0.5" />
        {/* Right Face */}
        <polygon points="14,0 28,-8 28,8 14,16" fill="#4f46e5" fillOpacity="0.75" />
      </g>

      {/* Floating Isometric Cube 2 (Small Left) */}
      <g transform="translate(210, 110)">
        {/* Top Face */}
        <polygon points="0,-6 10,-11 20,-6 10,0" fill="#a5b4fc" fillOpacity="0.55" />
        {/* Left Face */}
        <polygon points="0,-6 10,0 10,12 0,6" fill="#818cf8" fillOpacity="0.45" />
        {/* Right Face */}
        <polygon points="10,0 20,-6 20,6 10,12" fill="#4f46e5" fillOpacity="0.65" />
      </g>

      {/* Main Big Isometric Cube (Center Right) */}
      <g transform="translate(260, 60)">
        {/* Outer Hexagon outline glow */}
        <polygon points="30,-10 65,-30 100,-10 100,30 65,50 30,30" stroke="#818cf8" strokeWidth="1.5" strokeOpacity="0.35" fill="none" />
        
        {/* Inner Cube */}
        {/* Top Face */}
        <polygon points="35,-4 65,-20 95,-4 65,12" fill="#e0e7ff" fillOpacity="0.8" />
        {/* Left Face */}
        <polygon points="35,-4 65,12 65,42 35,26" fill="url(#cubeGrad)" />
        {/* Right Face */}
        <polygon points="65,12 95,-4 95,26 65,42" fill="#4f46e5" fillOpacity="0.9" />
        
        {/* Inside core glow */}
        <circle cx="65" cy="12" r="10" fill="#818cf8" opacity="0.6" style={{ filter: 'blur(4px)' }} />
      </g>

      {/* Gear Icon (Outline/Tech Style) */}
      <g transform="translate(330, 115)" stroke="#818cf8" strokeOpacity="0.35" strokeWidth="1.5" fill="none">
        <circle cx="15" cy="15" r="8" />
        <path d="M15,2 L15,5 M15,25 L15,28 M2,15 L5,15 M25,15 L28,15 M6,6 L8,8 M22,22 L24,24 M6,24 L8,22 M22,6 L24,8" />
      </g>
    </svg>
  );
};

type FinalRoundConfigPageProps = {
  /** Khi mở từ tab setup hackathon — bắt buộc truyền để readiness khớp GĐ4 vừa advance */
  hackathonId?: number | string;
  /** Hub Setup: refresh checklist/counts sau mutation thành công */
  onUpdated?: () => void | Promise<void>;
};

const FinalRoundConfigPage: React.FC<FinalRoundConfigPageProps> = ({
  hackathonId: hackathonIdProp,
  onUpdated,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { hackathonId: hackathonIdFromRoute } = useParams<{ hackathonId?: string }>();
  const [searchParams] = useSearchParams();
  const presetHackathonId = hackathonIdProp ?? hackathonIdFromRoute ?? searchParams.get('hackathonId');

  const {
    hackathons,
    selectedHackathonId,
    setSelectedHackathonId,
    isLoadingHackathons,
  } = useHackathonSelect(presetHackathonId ? String(presetHackathonId) : undefined);

  const activeHackathonId = presetHackathonId
    ? Number(presetHackathonId)
    : selectedHackathonId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hackathon, setHackathon] = useState<any>(null);
  const [rounds, setRounds] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    if (!activeHackathonId) {
      setHackathon(null);
      setRounds([]);
      setReadiness(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const currentHackathon = await hackathonService.getById(activeHackathonId);
      if (!currentHackathon?.id) {
        setHackathon(null);
        setRounds([]);
        setReadiness(null);
        return;
      }

      const [roundList, readinessResult] = await Promise.all([
        roundService.listByHackathon(currentHackathon.id),
        reviewService.checkReadiness(currentHackathon.id, 'FINAL_ROUND'),
      ]);
      setHackathon(currentHackathon);
      const roundItems: any = roundList;
      setRounds(Array.isArray(roundItems) ? roundItems : roundItems?.items || []);
      setReadiness(readinessResult?.data || readinessResult);
    } catch (error: any) {
      message.error(resolveUserError(error, { fallback: 'Không tải được cấu hình chung kết.' }));
    } finally {
      setLoading(false);
    }
  }, [activeHackathonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // UX-FOCUS: khi Coord quay lại tab Config sau ops trên Round Management, Stepper cập nhật.
  useEffect(() => {
    const onFocus = () => {
      if (activeHackathonId) loadData();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [activeHackathonId, loadData]);

  const finalRound = useMemo(() => {
    const raw =
      rounds.find((round) => Boolean(round?.isFinal ?? round?.is_final)) ||
      rounds.find((round) => /chung kết|final/i.test(String(round?.name || ''))) ||
      rounds.find((round) => String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL') ||
      null;
    return raw ? mapRoundToFE(raw) : null;
  }, [rounds]);
  const blockers = readiness?.blockers || [];
  const warnings = readiness?.warnings || [];
  const isFinalReady = Boolean(readiness?.ready) && blockers.length === 0;
  const finalRoundActive = isRoundActive(finalRound);
  const queueOpenAllowed = canOpenPresentationQueue(finalRound);
  const queueOpenTooltip = getOpenQueueTooltip(finalRound);
  const roundsManagementUrl = `/hackathons/${hackathon?.id ?? activeHackathonId}/setup?tab=rounds&from=final-config`;

  const prelimRound = useMemo(
    () =>
      rounds.find((round) => {
        if (finalRound && round?.id === finalRound.id) return false;
        if (Boolean(round?.isFinal ?? round?.is_final)) return false;
        if (/chung kết|final/i.test(String(round?.name || ''))) return false;
        return true;
      }) || rounds[0] || null,
    [rounds, finalRound],
  );
  const finalScoringLocked = Boolean(finalRound?.scoring_locked ?? finalRound?.scoringLocked);

  const handleActivateFinal = async () => {
    if (!finalRound?.id) return;
    if (!isFinalReady) {
      return message.warning('Điều kiện kích hoạt vòng Chung kết chưa đạt, vui lòng hoàn thành các yêu cầu bắt buộc trước.');
    }
    setSubmitting(true);
    try {
      await roundService.activate(finalRound.id, { note: 'Activate final round by coordinator' });
      message.success('Đã kích hoạt vòng Chung kết.');
      await loadData();
      if (typeof onUpdated === 'function') await onUpdated();
    } catch (error: any) {
      const code = error?.code || error?.response?.data?.error?.code;
      if (code === 'JUDGE_NOT_ASSIGNED') {
        message.error('Chưa gán giám khảo khách mời cho vòng Chung kết. Vui lòng mở mục Nhân sự để gán.');
      } else if (code === 'RESULT_NOT_PUBLISHED') {
        message.error('Cần công bố kết quả và hoàn thành chuyển tiếp đội thi từ vòng Sơ loại trước.');
      } else {
        message.error(
          resolveProgressionError(error, 'Không thể kích hoạt vòng Chung kết.').message,
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!activeHackathonId && isLoadingHackathons) {
    return (
      <Card style={{ textAlign: 'center', padding: 32 }}>
        <Spin tip="Đang tải sự kiện..." />
      </Card>
    );
  }

  if (!activeHackathonId && !isLoadingHackathons) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card>
          <div
            style={{
              alignItems: isMobile ? 'stretch' : 'center',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 16,
              justifyContent: 'space-between',
            }}
          >
            <Space direction="vertical" size={4}>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Settings size={22} />
                Cấu hình chung kết
              </Title>
              <Text type="secondary">Chọn sự kiện để cấu hình và kích hoạt vòng chung kết.</Text>
            </Space>
            <Select
              showSearch
              placeholder="Chọn sự kiện hackathon"
              loading={isLoadingHackathons}
              value={selectedHackathonId}
              onChange={(value) => setSelectedHackathonId(value)}
              style={{ minWidth: isMobile ? '100%' : 320 }}
              size="large"
              suffixIcon={<SearchOutlined />}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={hackathons.map((h) => ({
                value: h.id,
                label: h.hackathonName || h.name || `Hackathon #${h.id}`,
              }))}
            />
          </div>
        </Card>
        <Alert
          showIcon
          type="info"
          message="Chưa chọn sự kiện hackathon"
          description="Vui lòng chọn một sự kiện ở phía trên để bắt đầu cấu hình chung kết."
        />
      </Space>
    );
  }

  if (loading) {
    return (
      <Card style={{ textAlign: 'center', padding: 32 }}>
        <Spin />
      </Card>
    );
  }

  if (!hackathon) {
    return <Alert showIcon type="warning" message="Chưa xác định được hackathon hiện tại." />;
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <FinalRoundCoordinatorStepper
        hackathonId={hackathon.id}
        prelimRoundId={prelimRound?.id}
        finalRoundId={finalRound?.id}
        finalRound={finalRound}
        finalActive={finalRoundActive}
        scoringLocked={finalScoringLocked}
      />

      <Card 
        bordered={false}
        style={{
          borderRadius: 20,
          background: 'linear-gradient(135deg, #f5f7ff 0%, #f4f6fc 50%, #eff2fa 100%)',
          boxShadow: '0 10px 30px rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.12)',
          position: 'relative',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '32px 24px', position: 'relative', zIndex: 1 } }}
      >
        {/* Vector background art */}
        {!isMobile && <TechDecoration />}

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Tag Header Row */}
          <div style={{ marginBottom: 16 }}>
            <Space wrap size={8}>
              <span style={{
                background: 'rgba(59, 130, 246, 0.08)',
                color: '#2563eb',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                Vòng Chung kết
              </span>
              <span style={{
                background: finalRoundActive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                color: finalRoundActive ? '#10b981' : '#475569',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: finalRoundActive ? '#10b981' : '#475569',
                  marginRight: 8,
                  display: 'inline-block',
                }} />
                Trạng thái: {finalRoundActive ? 'Đang diễn ra' : 'Chưa kích hoạt'}
              </span>
              <span style={{
                background: isFinalReady ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                color: isFinalReady ? '#10b981' : '#dc2626',
                fontWeight: 600,
                fontSize: 13,
                borderRadius: '8px',
                padding: '6px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}>
                {isFinalReady ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                Điều kiện kích hoạt: {isFinalReady ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}
              </span>
              {blockers.length > 0 && (
                <span style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#b91c1c',
                  fontWeight: 700,
                  fontSize: 13,
                  borderRadius: '8px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.05)'
                }}>
                  Yêu cầu cần xử lý: {blockers.length}
                </span>
              )}
            </Space>
          </div>

          {/* Heading */}
          <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', marginBottom: 28 }}>
            Cấu hình Vòng Chung kết
          </Title>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                onClick={loadData}
                style={{
                  height: 'auto',
                  padding: '10px 20px',
                  background: '#ffffff',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#1e293b',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
              >
                <RefreshCw size={15} style={{ color: '#4f46e5' }} />
                Làm mới
              </Button>

              <Button
                onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=people')}
                style={{
                  height: 'auto',
                  padding: '10px 20px',
                  background: '#ffffff',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#1e293b',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
              >
                <UserPlus size={16} style={{ color: '#4f46e5' }} />
                Gán Giám khảo Khách mời
              </Button>

              {finalRound?.id && (
                <Tooltip title={queueOpenAllowed ? undefined : queueOpenTooltip}>
                  <span>
                    <Button
                      disabled={!queueOpenAllowed}
                      onClick={() => {
                        if (!queueOpenAllowed) return;
                        window.open(
                          `/presentation/queue?roundId=${finalRound.id}&from=final-config`,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }}
                      style={{
                        height: 'auto',
                        padding: '10px 20px',
                        background: '#ffffff',
                        border: '1px solid rgba(226, 232, 240, 0.8)',
                        borderRadius: 12,
                        fontWeight: 600,
                        fontSize: 14,
                        color: '#1e293b',
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'all 0.2s ease',
                        opacity: queueOpenAllowed ? 1 : 0.55,
                      }}
                    >
                      <Clock size={16} style={{ color: '#4f46e5' }} />
                      Hàng đợi Thuyết trình
                    </Button>
                  </span>
                </Tooltip>
              )}

              <Button
                onClick={() => window.open(roundsManagementUrl, '_blank', 'noopener,noreferrer')}
                style={{
                  height: 'auto',
                  padding: '10px 20px',
                  background: '#ffffff',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: 12,
                  fontWeight: 600,
                  fontSize: 14,
                  color: '#1e293b',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s ease',
                }}
              >
                <FileText size={16} style={{ color: '#4f46e5' }} />
                Cấu hình Đề & Trạng thái
              </Button>
            </div>

            <Button
              type="primary"
              loading={submitting}
              disabled={!finalRound || finalRoundActive || !isFinalReady}
              onClick={handleActivateFinal}
              style={{
                height: 'auto',
                padding: '12px 24px',
                background: (!finalRound || finalRoundActive || !isFinalReady) 
                  ? 'rgba(79, 70, 229, 0.35)' 
                  : 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
                border: 'none',
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 14,
                color: '#ffffff',
                boxShadow: (!finalRound || finalRoundActive || !isFinalReady) 
                  ? 'none' 
                  : '0 4px 14px rgba(79, 70, 229, 0.35)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: (!finalRound || finalRoundActive || !isFinalReady) ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={14} fill="currentColor" />
              Kích hoạt Vòng Chung kết
            </Button>
          </div>
        </div>

        {(blockers.length > 0 || warnings.length > 0) && <Divider style={{ margin: '20px 0', position: 'relative', zIndex: 2 }} />}

        {blockers.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1.5px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.02)',
            marginBottom: warnings.length > 0 ? 12 : 0,
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#dc2626',
                boxShadow: '0 0 8px #dc2626'
              }} />
              <span style={{ fontWeight: 650, color: '#991b1b', fontSize: '14px', letterSpacing: '-0.01em' }}>
                Các yêu cầu bắt buộc cần hoàn thành trước khi kích hoạt Vòng Chung kết
              </span>
            </div>
            <List
              size="small"
              dataSource={blockers}
              renderItem={(item: any) => (
                <List.Item style={{ color: '#b91c1c', border: 'none', padding: '3px 0 3px 18px', fontSize: '13px', fontWeight: 500 }}>
                  • {formatReadinessMessage(item?.message || item?.code || 'Yêu cầu bắt buộc chưa hoàn thành')}
                </List.Item>
              )}
            />
          </div>
        )}

        {warnings.length > 0 && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.03)',
            border: '1.5px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.02)',
            position: 'relative',
            zIndex: 2
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#d97706',
                boxShadow: '0 0 8px #d97706'
              }} />
              <span style={{ fontWeight: 650, color: '#92400e', fontSize: '14px', letterSpacing: '-0.01em' }}>
                Khuyến nghị vận hành (có thể bổ sung sau)
              </span>
            </div>
            <List
              size="small"
              dataSource={warnings}
              renderItem={(item: any) => (
                <List.Item style={{ color: '#d97706', border: 'none', padding: '3px 0 3px 18px', fontSize: '13px', fontWeight: 500 }}>
                  • {formatReadinessMessage(item?.message || item?.code || 'Khuyến nghị chưa hoàn thành')}
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>

      {!finalRound && (
        <Alert
          showIcon
          type="warning"
          message="Chưa có vòng Chung kết"
          description="Sự kiện này chưa được thiết lập vòng Chung kết. Vui lòng thêm vòng Chung kết trước khi kích hoạt hoặc mở cổng nộp bài."
          style={{ borderRadius: 12 }}
        />
      )}

      {finalRound?.id && (
        <FinalPresentationDurationCard roundId={finalRound.id} timerStarted={false} />
      )}

      {finalRoundActive && (
        <Card title="Các bước tiếp theo — Vòng Chung kết">
          <Alert
            showIcon
            type="success"
            message="Vòng Chung kết đã được kích hoạt thành công"
            description={`Vui lòng hoàn thành các bước dưới đây để kết thúc vòng Chung kết và chuyển sang giai đoạn ${resolveStatusLabel('PENDING_CONFIRM')}.`}
            style={{ marginBottom: 16 }}
          />
          <List
            size="small"
            dataSource={[
              'Công bố đề thi Vòng Chung kết (tại mục Quản lý vòng thi → Phát đề)',
              'Thiết lập phiên chấm thử/chuẩn hóa (tùy chọn — cấu hình bên dưới)',
              'Sinh viên các đội đi tiếp nộp bài thi Chung kết',
              'Ban giám khảo thực hiện đánh giá và chấm điểm trên trang Giám khảo',
              `Khóa chấm điểm Vòng Chung kết → Trạng thái giải đấu chuyển sang «${resolveStatusLabel('PENDING_CONFIRM')}»`,
            ]}
            renderItem={(item, index) => (
              <List.Item>
                <Text>
                  {index + 1}. {item}
                </Text>
              </List.Item>
            )}
          />
          <Divider />
          <Space wrap>
            <Button onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)))}>
              Quản lý đề thi & Khóa chấm Vòng Chung kết
            </Button>
            <Button onClick={() => navigate(`${ROUTES.COORDINATOR_ANALYTICS}?hackathonId=${hackathon.id}`)}>
              Bảng dữ liệu Phân tích (RBL)
            </Button>
          </Space>
        </Card>
      )}

      {finalRoundActive && finalRound?.id && (
        <CalibrationSessionManager
          roundId={finalRound.id}
          roundLabel={finalRound.name || 'Chung kết'}
          enabled={finalRoundActive}
        />
      )}
    </Space>
  );
};

export default FinalRoundConfigPage;
