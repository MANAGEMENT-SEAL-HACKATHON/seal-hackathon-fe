import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Divider, Grid, List, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Settings } from 'lucide-react';
import FinalRoundCoordinatorStepper from '../components/FinalRoundCoordinatorStepper';
import CalibrationSessionManager from '../components/CalibrationSessionManager';
import FinalPresentationDurationCard from '../../presentation/components/FinalPresentationDurationCard';
import { useHackathonSelect } from '../hooks/useHackathonSelect';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { reviewService } from '../../review/services/reviewService';
import { ROUTES } from '../../../shared/constants/routes';
import { resolveUserError, resolveStatusLabel } from '../../../shared/errors/resolveUserError';
import { resolveProgressionError } from '../../rounds/constants/progressionErrors';

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

type FinalRoundConfigPageProps = {
  /** Khi mở từ tab setup hackathon — bắt buộc truyền để readiness khớp GĐ4 vừa advance */
  hackathonId?: number | string;
};

const FinalRoundConfigPage: React.FC<FinalRoundConfigPageProps> = ({ hackathonId: hackathonIdProp }) => {
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

  const finalRound = useMemo(
    () =>
      rounds.find((round) => Boolean(round?.isFinal ?? round?.is_final)) ||
      rounds.find((round) => /chung kết|final/i.test(String(round?.name || ''))) ||
      rounds.find((round) => String(round?.roundType || round?.round_type || '').toUpperCase() === 'FINAL') ||
      null,
    [rounds],
  );
  const blockers = readiness?.blockers || [];
  const warnings = readiness?.warnings || [];
  const isFinalReady = Boolean(readiness?.ready) && blockers.length === 0;
  const finalRoundActive = Boolean(finalRound?.isActive ?? finalRound?.is_active);

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
  const finalScoringLocked = Boolean(finalRound?.scoringLocked ?? finalRound?.scoring_locked);

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
        finalActive={finalRoundActive}
        scoringLocked={finalScoringLocked}
      />

      <Card style={{
        borderRadius: 16,
        background: '#ffffff',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.05)',
        border: '1px solid rgba(15, 23, 42, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <Space direction="vertical" size={8} style={{ flex: 1, minWidth: '280px' }}>
            <Space wrap size={6}>
              <Tag style={{
                background: 'rgba(59, 130, 246, 0.06)',
                border: '1px solid rgba(59, 130, 246, 0.15)',
                color: '#2563eb',
                fontWeight: 600,
                borderRadius: '6px',
                padding: '2px 8px'
              }}>Vòng Chung kết</Tag>
              <Tag style={{
                background: finalRoundActive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(100, 116, 139, 0.06)',
                border: finalRoundActive ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(100, 116, 139, 0.15)',
                color: finalRoundActive ? '#059669' : '#475569',
                fontWeight: 600,
                borderRadius: '6px',
                padding: '2px 8px'
              }}>
                Trạng thái: {finalRoundActive ? 'Đang diễn ra' : 'Chưa kích hoạt'}
              </Tag>
              <Tag style={{
                background: isFinalReady ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: isFinalReady ? '1px solid rgba(16, 185, 129, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)',
                color: isFinalReady ? '#059669' : '#dc2626',
                fontWeight: 600,
                borderRadius: '6px',
                padding: '2px 8px'
              }}>
                Điều kiện kích hoạt: {isFinalReady ? 'Đủ điều kiện' : 'Chưa đủ điều kiện'}
              </Tag>
              {blockers.length > 0 && (
                <Tag style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#b91c1c',
                  fontWeight: 700,
                  borderRadius: '6px',
                  padding: '2px 8px',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.1)'
                }}>Yêu cầu cần xử lý: {blockers.length}</Tag>
              )}
            </Space>
            <Title level={2} style={{ margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
              Cấu hình Vòng Chung kết
            </Title>
          </Space>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <Space wrap style={{ marginRight: 16, borderRight: '1px solid #f1f5f9', paddingRight: 16 }}>
              <Button icon={<ReloadOutlined />} onClick={loadData} style={{ borderRadius: 8 }}>
                Làm mới
              </Button>
              <Button onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=people')} style={{ borderRadius: 8 }}>
                Gán Giám khảo Khách mời
              </Button>
              {finalRound?.id && (
                <Button onClick={() => navigate(`/presentation/queue?roundId=${finalRound.id}`)} style={{ borderRadius: 8 }}>
                  Hàng đợi Thuyết trình
                </Button>
              )}
              <Button onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=rounds')} style={{ borderRadius: 8 }}>
                Cấu hình Đề & Trạng thái
              </Button>
            </Space>

            <Button
              type="primary"
              loading={submitting}
              onClick={(!finalRound || finalRoundActive || !isFinalReady) ? undefined : handleActivateFinal}
              style={(!finalRound || finalRoundActive || !isFinalReady) ? {
                background: 'rgba(59, 130, 246, 0.35)',
                borderColor: 'rgba(59, 130, 246, 0.1)',
                color: 'rgba(255, 255, 255, 0.75)',
                cursor: 'not-allowed',
                boxShadow: 'none',
                height: '36px',
                fontWeight: 600,
                borderRadius: '8px'
              } : {
                background: '#3b82f6',
                borderColor: '#2563eb',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                height: '36px',
                fontWeight: 600,
                borderRadius: '8px'
              }}
            >
              Kích hoạt Vòng Chung kết
            </Button>
          </div>
        </div>

        {(blockers.length > 0 || warnings.length > 0) && <Divider style={{ margin: '20px 0' }} />}

        {blockers.length > 0 && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.03)',
            border: '1.5px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 4px 16px rgba(239, 68, 68, 0.02)',
            marginBottom: warnings.length > 0 ? 12 : 0
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
            boxShadow: '0 4px 16px rgba(245, 158, 11, 0.02)'
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
