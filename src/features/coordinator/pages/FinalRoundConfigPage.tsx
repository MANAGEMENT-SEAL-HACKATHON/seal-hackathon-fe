import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, Card, Divider, Grid, List, Select, Space, Spin, Tag, Typography, message } from 'antd';
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

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

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
      message.error(error?.message || 'Không tải được cấu hình chung kết.');
    } finally {
      setLoading(false);
    }
  }, [activeHackathonId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const finalRound = useMemo(
    () => rounds.find((round) => Boolean(round?.isFinal ?? round?.is_final)) || null,
    [rounds],
  );
  const blockers = readiness?.blockers || [];
  const warnings = readiness?.warnings || [];
  const isFinalReady = Boolean(readiness?.ready) && blockers.length === 0;
  const finalRoundActive = Boolean(finalRound?.isActive ?? finalRound?.is_active);

  const prelimRound = useMemo(
    () => rounds.find((round) => !(round?.isFinal ?? round?.is_final)) || null,
    [rounds],
  );
  const finalScoringLocked = Boolean(finalRound?.scoringLocked ?? finalRound?.scoring_locked);

  const handleActivateFinal = async () => {
    if (!finalRound?.id) return;
    if (!isFinalReady) {
      return message.warning('Readiness FINAL_ROUND chưa đạt, vui lòng xử lý blocker trước.');
    }
    setSubmitting(true);
    try {
      await roundService.activate(finalRound.id, { note: 'Activate final round by coordinator' });
      message.success('Đã kích hoạt vòng Chung kết.');
      await loadData();
    } catch (error: any) {
      const code = error?.code || error?.response?.data?.error?.code;
      if (code === 'JUDGE_NOT_ASSIGNED') {
        message.error('Chưa gán guest judge cho Chung kết — mở tab Nhân sự.');
      } else if (code === 'RESULT_NOT_PUBLISHED') {
        message.error('Cần công bố và chốt chuyển vòng Sơ loại trước.');
      } else {
        message.error(error?.message || 'Không thể kích hoạt vòng Chung kết.');
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
      <Breadcrumb
        items={[
          { title: <Link to={ROUTES.HACKATHONS}>Hackathons</Link> },
          { title: 'Cấu hình chung kết' },
        ]}
      />

      <Card title="Checklist vận hành — Chung kết">
        <FinalRoundCoordinatorStepper
          hackathonId={hackathon.id}
          prelimRoundId={prelimRound?.id}
          finalRoundId={finalRound?.id}
          finalActive={finalRoundActive}
          scoringLocked={finalScoringLocked}
        />
      </Card>

      <Card style={{ borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <Space direction="vertical" size={8}>
            <Space wrap>
              <Tag color="blue">Cấu hình Chung kết</Tag>
              <Tag color={finalRoundActive ? 'success' : 'default'}>
                CK: {finalRoundActive ? 'ACTIVE' : 'INACTIVE'}
              </Tag>
              <Tag color={isFinalReady ? 'success' : 'error'}>
                Readiness: {isFinalReady ? 'READY' : 'NOT_READY'}
              </Tag>
              <Tag color="gold">Blockers: {blockers.length}</Tag>
            </Space>
            <Title level={2} style={{ margin: 0 }}>
              Cấu hình Chung kết
            </Title>
            <Text type="secondary">
              {hackathon?.name
                ? `Hackathon: ${hackathon.name}${hackathon.slug ? ` (${hackathon.slug})` : ''}`
                : 'Màn này chỉ hiển thị dữ liệu thật từ BE.'}
            </Text>
          </Space>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={loadData}>
              Làm mới
            </Button>
            <Button onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=people')}>
              Gán guest judge CK
            </Button>
            {finalRound?.id && (
              <Button onClick={() => navigate(`/presentation/queue?roundId=${finalRound.id}`)}>
                Presentation queue CK
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {!finalRound && (
        <Alert
          showIcon
          type="warning"
          message="Chưa có vòng Chung kết"
          description="Hackathon này chưa được cấu hình vòng Chung kết ở backend nên chưa thể activate hoặc mở cổng nộp bài."
        />
      )}

      <Card title="Readiness FINAL_ROUND (Gate trước Activate CK)">
        <Space style={{ marginBottom: 12 }} wrap>
          <Tag color={isFinalReady ? 'success' : 'error'}>{isFinalReady ? 'READY' : 'NOT_READY'}</Tag>
          <Tag color="blue">Blockers: {blockers.length}</Tag>
          <Tag color="gold">Warnings: {warnings.length}</Tag>
          <Tag color={finalRoundActive ? 'green' : 'default'}>
            CK: {finalRoundActive ? 'ACTIVE' : 'INACTIVE'}
          </Tag>
        </Space>
        {blockers.length > 0 && (
          <Alert
            showIcon
            type="error"
            message="Blockers cần xử lý trước khi activate Chung kết"
            description={
              <List
                size="small"
                dataSource={blockers}
                renderItem={(item: any) => <List.Item>{item?.message || item?.code || 'Unknown blocker'}</List.Item>}
              />
            }
          />
        )}
        {warnings.length > 0 && (
          <Alert
            showIcon
            type="warning"
            style={{ marginTop: 12 }}
            message="Warnings (khuyến nghị xử lý)"
            description={
              <List
                size="small"
                dataSource={warnings}
                renderItem={(item: any) => <List.Item>{item?.message || item?.code || 'Unknown warning'}</List.Item>}
              />
            }
          />
        )}
        <Divider />
          <Space wrap>
            <Button type="primary" onClick={handleActivateFinal} loading={submitting} disabled={!finalRound || finalRoundActive || !isFinalReady}>
              Kích hoạt vòng Chung kết
            </Button>
            <Button onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=people')}>
              Gán guest judge CK
            </Button>
            {finalRound?.id && (
              <Button onClick={() => navigate(`/presentation/queue?roundId=${finalRound.id}`)}>
                Presentation queue CK
              </Button>
            )}
            <Button onClick={() => navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hackathon.id)) + '?tab=rounds')}>
              Quản lý vòng (phát đề / lock)
            </Button>
          </Space>
      </Card>

      {finalRound?.id && (
        <FinalPresentationDurationCard roundId={finalRound.id} timerStarted={false} />
      )}

      {finalRoundActive && (
        <Card title="Bước tiếp theo — GĐ5 Chung kết">
          <Alert
            showIcon
            type="success"
            message="Vòng Chung kết đã được kích hoạt"
            description="Hoàn thành các bước sau để kết thúc GĐ5 và chuyển sang GĐ6 (PENDING_CONFIRM)."
            style={{ marginBottom: 16 }}
          />
          <List
            size="small"
            dataSource={[
              'Phát đề Chung kết (tab Quản lý vòng thi → Phát đề)',
              'Tạo phiên calibration (tùy chọn — form bên dưới)',
              'Student các đội advanced nộp bài CK (multipart PDF, không trackId)',
              'Guest judge (FINAL_EXTERNAL) chấm điểm trên Judge Dashboard',
              'Khóa chấm CK → hackathon chuyển PENDING_CONFIRM',
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
              Quản lý vòng thi (phát đề / lock CK)
            </Button>
            <Button onClick={() => navigate(`${ROUTES.COORDINATOR_ANALYTICS}?hackathonId=${hackathon.id}`)}>
              RBL Dashboard (phân tích)
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
