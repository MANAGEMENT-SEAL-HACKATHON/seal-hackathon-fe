import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, List, Space, Spin, Tooltip, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Settings, RefreshCw, UserPlus, Clock, FileText, Play, CheckCircle2, AlertCircle, ClipboardCheck } from 'lucide-react';
import FinalRoundCoordinatorStepper from '../components/FinalRoundCoordinatorStepper';
import FinalistsCard from '../components/FinalistsCard';
import FinalPresentationDurationCard from '../../presentation/components/FinalPresentationDurationCard';
import { useHackathonScopeOptional } from '../../hackathons/context/HackathonScopeContext';
import EventContextBanner from '../../hackathons/components/EventContextBanner';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import { reviewService } from '../../review/services/reviewService';
import { ROUTES } from '../../../shared/constants/routes';
import { resolveUserError, resolveStatusLabel } from '../../../shared/errors/resolveUserError';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';
import ActivateScheduleModal from '../../rounds/components/ActivateScheduleModal';
import {
  canOpenPresentationQueue,
  getOpenQueueTooltip,
  isRoundActive,
  isSubmissionClosed,
} from '../../rounds/utils/roundLifecycleGates';
import CoordinatorHero from '../../../shared/components/ui/CoordinatorHero';
import {
  primaryGradientButtonStyle,
  whiteButtonStyle,
} from '../../../shared/theme/coordinatorTheme';

const { Title, Text } = Typography;

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
  const { hackathonId: hackathonIdFromRoute } = useParams<{ hackathonId?: string }>();
  const [searchParams] = useSearchParams();
  // Context/service viết bằng JS — TS suy luận sai kiểu (never/AxiosResponse), ép any tại biên
  const scope: any = useHackathonScopeOptional();
  const presetHackathonId =
    hackathonIdProp ?? hackathonIdFromRoute ?? searchParams.get('hackathonId') ?? scope?.hackathonId;

  const activeHackathonId = presetHackathonId ? Number(presetHackathonId) : null;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
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
      const currentHackathon: any = await hackathonService.getById(activeHackathonId);
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

  useEffect(() => {
    setActivateModalOpen(false);
  }, [activeHackathonId]);

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
  // Điểm thành phần chỉ có nghĩa khi đã đóng cổng nộp (đồng bộ Round Management, không chỉ active).
  const finalSubmissionClosed = finalRoundActive && isSubmissionClosed(finalRound);
  const queueOpenAllowed = canOpenPresentationQueue(finalRound);
  const queueOpenTooltip = getOpenQueueTooltip(finalRound);
  const roundsManagementUrl = `/hackathons/${hackathon?.id ?? activeHackathonId}/setup?tab=rounds&from=final-config`;
  const isEmbeddedInSetup = Boolean(hackathonIdProp);

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

  const handleActivateFinal = () => {
    if (!finalRound?.id) return;
    if (!isFinalReady) {
      return message.warning('Điều kiện kích hoạt vòng Chung kết chưa đạt, vui lòng hoàn thành các yêu cầu bắt buộc trước.');
    }
    setActivateModalOpen(true);
  };

  const confirmActivateFinal = async (payload: any) => {
    if (!finalRound?.id || submitting) return;
    setSubmitting(true);
    try {
      await roundService.activate(finalRound.id, {
        ...payload,
        note: payload?.note || 'Activate final round by coordinator',
      });
      message.success('Đã kích hoạt vòng Chung kết (giữ nguyên lịch đã xếp).');
      setActivateModalOpen(false);
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

  if (!activeHackathonId) {
    return (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={22} />
          Cấu hình chung kết
        </Title>
        <EventContextBanner
          hackathon={null}
          hackathonId={null}
          extra="Chọn sự kiện trên thanh header để bắt đầu cấu hình chung kết."
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
    <Space direction="vertical" size={16} className="coord-page" style={{ width: '100%' }}>
      <EventContextBanner
        hackathon={hackathon}
        hackathonId={activeHackathonId}
        extra={
          isEmbeddedInSetup
            ? 'Đang cấu hình trong tab Setup. Đổi sự kiện bằng bộ chọn trên thanh header.'
            : 'Trang Cấu hình chung kết độc lập. Đổi sự kiện bằng bộ chọn trên thanh header.'
        }
      />

      <FinalRoundCoordinatorStepper
        hackathonId={hackathon.id}
        prelimRoundId={prelimRound?.id}
        finalRoundId={finalRound?.id}
        finalRound={finalRound}
        finalActive={finalRoundActive}
        scoringLocked={finalScoringLocked}
      />

      <CoordinatorHero
        data-testid="final-config-hero"
        title="Cấu hình Vòng Chung kết"
        onBack={
          isEmbeddedInSetup
            ? undefined
            : () =>
                navigate(
                  activeHackathonId
                    ? `/hackathons/${activeHackathonId}/setup?tab=final-config`
                    : '/hackathons',
                )
        }
        backLabel="Quay lại Cấu hình sự kiện"
        pills={[
          { key: 'round', label: 'Vòng Chung kết', tone: 'info' },
          {
            key: 'status',
            label: `Trạng thái: ${finalRoundActive ? 'Đang diễn ra' : 'Chưa kích hoạt'}`,
            tone: finalRoundActive ? 'success' : 'neutral',
            dot: true,
          },
          {
            key: 'ready',
            label: `Điều kiện kích hoạt: ${isFinalReady ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}`,
            tone: isFinalReady ? 'success' : 'danger',
            icon: isFinalReady ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />,
          },
          ...(blockers.length > 0
            ? [{ key: 'blockers', label: `Yêu cầu cần xử lý: ${blockers.length}`, tone: 'danger' }]
            : []),
        ]}
        actions={
          <>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                onClick={loadData}
                style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <RefreshCw size={15} style={{ color: '#4f46e5' }} />
                Làm mới
              </Button>
              <Button
                onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=people')}
                style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                        ...whiteButtonStyle,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
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
                style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <FileText size={16} style={{ color: '#4f46e5' }} />
                Cấu hình Đề & Trạng thái
              </Button>
              {finalRound?.id && finalSubmissionClosed && (
                <Button
                  onClick={() =>
                    navigate(
                      `/hackathons/${hackathon.id}/rounds/${finalRound.id}/results?tab=scoring-check`,
                    )
                  }
                  style={{ ...whiteButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <ClipboardCheck size={16} style={{ color: '#d97706' }} />
                  Điểm thành phần
                </Button>
              )}
            </div>
            <Button
              type="primary"
              loading={submitting}
              disabled={!finalRound || finalRoundActive || !isFinalReady}
              onClick={handleActivateFinal}
              style={{
                ...primaryGradientButtonStyle,
                padding: '12px 24px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: (!finalRound || finalRoundActive || !isFinalReady)
                  ? 'rgba(79, 70, 229, 0.35)'
                  : primaryGradientButtonStyle.background,
                boxShadow: (!finalRound || finalRoundActive || !isFinalReady)
                  ? 'none'
                  : primaryGradientButtonStyle.boxShadow,
                cursor: (!finalRound || finalRoundActive || !isFinalReady) ? 'not-allowed' : 'pointer',
              }}
            >
              <Play size={14} fill="currentColor" />
              Kích hoạt Vòng Chung kết
            </Button>
          </>
        }
      />

      {(blockers.length > 0 || warnings.length > 0) && (
        <Card bordered={false} style={{ borderRadius: 16, border: '1px solid rgba(99, 102, 241, 0.12)' }}>
          {blockers.length > 0 && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.03)',
              border: '1.5px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 16px rgba(239, 68, 68, 0.02)',
              marginBottom: warnings.length > 0 ? 12 : 0,
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
      )}

      {!finalRound && (
        <Alert
          showIcon
          type="warning"
          message="Chưa có vòng Chung kết"
          description={
            <Tooltip title="Thêm vòng Chung kết trước khi kích hoạt hoặc mở cổng nộp bài.">
              <span style={{ cursor: 'help' }}>Cần thêm vòng CK trước khi kích hoạt.</span>
            </Tooltip>
          }
          style={{ borderRadius: 12 }}
        />
      )}

      <FinalistsCard
        prelimRoundId={prelimRound?.id}
        finalRoundId={finalRound?.id}
        prelimResultsUrl={
          prelimRound?.id
            ? `/hackathons/${hackathon.id}/rounds/${prelimRound.id}/results`
            : undefined
        }
        onOpenFinalQueue={
          finalRound?.id
            ? () =>
                window.open(
                  `/presentation/queue?roundId=${finalRound.id}&from=final-config`,
                  '_blank',
                  'noopener,noreferrer',
                )
            : undefined
        }
      />

      {finalRound?.id && (
        <FinalPresentationDurationCard roundId={finalRound.id} timerStarted={false} />
      )}

      {finalRoundActive && (
        <Card title="Các bước tiếp theo — Vòng Chung kết">
          <Alert
            showIcon
            type="success"
            message="Vòng Chung kết đã kích hoạt"
            description={
              <Tooltip
                title={`Hoàn thành các bước dưới đây để kết thúc CK và chuyển sang ${resolveStatusLabel('PENDING_CONFIRM')}.`}
              >
                <span style={{ cursor: 'help' }}>Tiếp tục các bước bên dưới để chốt sổ.</span>
              </Tooltip>
            }
            style={{ marginBottom: 16 }}
          />
          <List
            size="small"
            dataSource={[
              'Công bố đề thi Vòng Chung kết (tại mục Quản lý vòng thi → Phát đề)',
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

      <ActivateScheduleModal
        open={activateModalOpen}
        round={finalRound}
        confirmLoading={submitting}
        onCancel={() => !submitting && setActivateModalOpen(false)}
        onConfirm={confirmActivateFinal}
      />
    </Space>
  );
};

export default FinalRoundConfigPage;
