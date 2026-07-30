import { useState, useCallback, useEffect } from 'react';
import { Card, Tabs, Typography, Button, Row, Col, Tooltip, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import TrackManagementPage from '../../tracks/pages/TrackManagementPage';
import RoundManagementPage from '../../rounds/pages/RoundManagementPage';
import CriteriaManagementPage from '../../criteria/pages/CriteriaManagementPage';
import { ROUTES } from '../../../shared/constants/routes';
import PeopleManagementPage from '../../people/pages/PeopleManagementPage';
import EventManagementPage from '../../events/pages/EventManagementPage';
import KitInventoryPage from '../../kits/pages/KitInventoryPage';
import { hackathonService } from '../services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { eventService } from '../../events/services/eventService';
import { mapHackathonToFE } from '../mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import LotteryManagementPage from '../../teams/pages/LotteryManagementPage';
import HackathonGeneralConfig from '../components/HackathonGeneralConfig';
import { useReadiness } from '../../review/hooks/useReadiness';
import { reviewService } from '../../review/services/reviewService';

import FinalRoundConfigPage from '../../coordinator/pages/FinalRoundConfigPage';
import EventContextBanner from '../components/EventContextBanner';

const VALID_TABS = new Set([
  'general',
  'rounds',
  'tracks',
  'criteria',
  'people',
  'events',
  'kits',
  'lottery',
  'final-config',
]);

const getValidTab = (tab) => (VALID_TABS.has(tab) ? tab : 'general');

const HackathonSetupPage = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  // Logic đồng bộ Tab lên URL từ Upstream
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [hackathon, setHackathon] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [tracksCount, setTracksCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => getValidTab(searchParams.get('tab')));

  const { refetch: refetchReadiness, readinessData, hackathon: readinessHackathon } = useReadiness(hackathonId);

  useEffect(() => {
    if (hackathonId) {
      try {
        localStorage.setItem('seal-last-hackathon-id', String(hackathonId));
      } catch {
        // no-op
      }
    }
  }, [hackathonId]);

  useEffect(() => {
    refetchReadiness();
  }, [refetchReadiness, activeTab]);

  // Hàm chuyển Tab kết hợp lưu URL
  const changeTab = useCallback((nextTab) => {
    if (nextTab === '_divider') return;
    const tab = getValidTab(nextTab);
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', tab);
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const refreshSetupSnapshot = useCallback(async () => {
    try {
      const [hackData, roundsData, tracksData, eventsData] = await Promise.all([
        hackathonService.getById(hackathonId),
        roundService.listByHackathon(hackathonId),
        trackService.listByHackathon(hackathonId),
        eventService.listByHackathon(hackathonId),
      ]);

      const fullRounds = await Promise.all(
        (roundsData || []).map(async (r) => {
          try {
            const detail = await roundService.getById(r.id);
            return mapRoundToFE(detail);
          } catch (_e) {
            return mapRoundToFE(r);
          }
        }),
      );

      // Background refresh — không setLoading(true) để tránh nháy trắng trang
      setHackathon(mapHackathonToFE(hackData));
      setRounds(fullRounds);
      setTracksCount(Array.isArray(tracksData) ? tracksData.length : 0);
      setEventsCount(Array.isArray(eventsData) ? eventsData.length : 0);
      refetchReadiness();
    } catch {
      // no-op
    }
  }, [hackathonId, refetchReadiness]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [hackData, roundsData, tracksData, eventsData] = await Promise.all([
          hackathonService.getById(hackathonId),
          roundService.listByHackathon(hackathonId),
          trackService.listByHackathon(hackathonId),
          eventService.listByHackathon(hackathonId),
        ]);

        const fullRounds = await Promise.all(
          (roundsData || []).map(async (r) => {
            try {
              const detail = await roundService.getById(r.id);
              return mapRoundToFE(detail);
            } catch (_e) {
              return mapRoundToFE(r);
            }
          }),
        );

        setHackathon(mapHackathonToFE(hackData));
        setRounds(fullRounds);
        setTracksCount(Array.isArray(tracksData) ? tracksData.length : 0);
        setEventsCount(Array.isArray(eventsData) ? eventsData.length : 0);
      } catch (_error) {
        // Fallback for not found or errors
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hackathonId]);

  useEffect(() => {
    const urlTab = getValidTab(searchParams.get('tab'));
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [activeTab, searchParams]);

  if (loading) {
    return <Card style={{ textAlign: 'center', padding: '40px 0' }}>Đang tải...</Card>;
  }

  if (!hackathon) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px 0' }}>
        <Typography.Title level={4}>Không tìm thấy sự kiện</Typography.Title>
        <Button type="primary" onClick={() => navigate(ROUTES.HACKATHONS)}>
          Quay lại danh sách
        </Button>
      </Card>
    );
  }

  const items = [
    {
      key: 'general',
      label: 'Cấu hình chung',
      children: (
        <HackathonGeneralConfig
          hackathon={hackathon}
          onUpdated={refreshSetupSnapshot}
          onGoToLottery={() => changeTab('lottery')}
        />
      ),
    },
    {
      key: 'rounds',
      label: 'Vòng thi',
      children: (
        <RoundManagementPage
          hackathonId={hackathon.id}
          hackathon={hackathon}
          onHackathonSync={refreshSetupSnapshot}
        />
      ),
    },
    {
      key: 'tracks',
      label: 'Bảng đấu',
      children: <TrackManagementPage hackathonId={hackathon.id} onUpdated={refreshSetupSnapshot} />,
    },
    {
      key: 'criteria',
      label: 'Tiêu chí đánh giá',
      children: <CriteriaManagementPage hackathonId={hackathon.id} onUpdated={refreshSetupSnapshot} />,
    },
    {
      key: 'people',
      label: 'Nhân sự',
      children: <PeopleManagementPage hackathonId={hackathon.id} onUpdated={refreshSetupSnapshot} />,
    },
    {
      key: 'events',
      label: 'Lịch trình & Sự kiện',
      children: <EventManagementPage hackathonId={hackathon.id} onUpdated={refreshSetupSnapshot} />,
    },
    {
      key: 'kits',
      label: 'Vật phẩm & Kit',
      children: <KitInventoryPage hackathonId={hackathon.id} />,
    },
    {
      key: 'lottery',
      label: 'Bốc thăm & khai mạc',
      children: (
        <LotteryManagementPage
          hackathonId={hackathon.id}
          onUpdated={refreshSetupSnapshot}
          onGoToGeneral={() => changeTab('general')}
        />
      ),
    },
    {
      key: 'final-config',
      label: 'Cấu hình Chung kết',
      children: null,
    },
  ];

  const handleActivateHackathon = async () => {
    try {
      await reviewService.changeStatus(hackathon.id, 'ONGOING', 'Mở đăng ký');
      message.success('Đã mở đăng ký — sự kiện đang diễn ra.');
      await refreshSetupSnapshot();
    } catch (error) {
      message.error(error.message || 'Không thể kích hoạt giải đấu');
    }
  };

  const isReadyToActivate = readinessData?.ready;
  const activateBlockers = readinessData?.blockers || [];
  const canActivateHackathon =
    isReadyToActivate && (readinessHackathon?.status || hackathon.status) === 'DRAFT';

  const activateTooltip = (() => {
    if ((readinessHackathon?.status || hackathon.status) !== 'DRAFT') {
      return 'Chỉ có thể kích hoạt khi sự kiện đang ở trạng thái Bản nháp';
    }
    if (!isReadyToActivate) {
      return (
        <div style={{ maxWidth: 300 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Chưa thể kích hoạt</div>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {activateBlockers.slice(0, 6).map((b, i) => (
              <li key={`${b.code || 'b'}-${i}`} style={{ marginBottom: 2 }}>
                {b.message || b.code}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return 'Sau khi xác nhận, học sinh có thể đăng ký';
  })();

  return (
    <div className="hackathon-setup-theme">
      <style>{`
        /* === Theme indigo/violet — đồng bộ mọi tab với Vòng thi === */
        .hackathon-setup-theme {
          --ant-color-primary: #818cf8 !important;
          --ant-color-primary-hover: #a78bfa !important;
          --ant-color-primary-active: #6366f1 !important;
          --ant-color-success: #10b981 !important;
          --ant-color-purple: #a78bfa !important;
        }
        .hackathon-setup-theme .ant-btn-primary {
          background: linear-gradient(135deg, #a78bfa 0%, #60a5fa 100%) !important;
          border: none !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          box-shadow: 0 4px 12px rgba(135, 92, 255, 0.2) !important;
          border-radius: 8px !important;
          transition: all 0.3s ease !important;
        }
        .hackathon-setup-theme .ant-btn-primary:not(:disabled):hover {
          background: linear-gradient(135deg, #b59dfb 0%, #76b3fc 100%) !important;
          box-shadow: 0 6px 16px rgba(135, 92, 255, 0.3) !important;
          color: #ffffff !important;
        }
        .hackathon-setup-theme .ant-btn-primary:disabled,
        .hackathon-setup-theme .ant-btn-primary.ant-btn-disabled {
          opacity: 0.55 !important;
          box-shadow: none !important;
        }
        .hackathon-setup-theme .ant-btn-group .ant-btn {
          border-color: #ddd6fe !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }
        .hackathon-setup-theme .ant-btn-group .ant-btn-primary {
          background: #818cf8 !important;
          border-color: #818cf8 !important;
          color: #ffffff !important;
          box-shadow: none !important;
        }
        .hackathon-setup-theme .ant-btn-group .ant-btn-primary:hover {
          background: #6366f1 !important;
          color: #ffffff !important;
        }
        .hackathon-setup-theme .ant-radio-button-wrapper {
          border-color: #ddd6fe !important;
          color: #64748b !important;
          font-weight: 600 !important;
        }
        .hackathon-setup-theme .ant-radio-button-wrapper-checked {
          background: #818cf8 !important;
          border-color: #818cf8 !important;
          color: #ffffff !important;
        }
        .hackathon-setup-theme .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled):hover {
          background: #6366f1 !important;
          border-color: #6366f1 !important;
          color: #ffffff !important;
        }
        .hackathon-setup-theme .ant-radio-button-wrapper-checked::before {
          background-color: #818cf8 !important;
        }
        .hackathon-setup-theme .ant-table-thead > tr > th {
          background: linear-gradient(90deg, #f5f3ff 0%, #eff6ff 100%) !important;
          color: #4f46e5 !important;
          font-weight: 700 !important;
          border-bottom: 2.5px solid #ddd6fe !important;
        }
        .hackathon-setup-theme .ant-table {
          background: transparent !important;
        }
        .hackathon-setup-theme .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important;
        }
        .hackathon-setup-theme .ant-table-tbody > tr:nth-child(even) {
          background-color: #faf5ff !important;
        }
        .hackathon-setup-theme .ant-table-tbody > tr:nth-child(odd) {
          background-color: #ffffff !important;
        }
        .hackathon-setup-theme .ant-table-row:hover > td {
          background: #f3e8ff !important;
        }
        .hackathon-setup-theme .ant-tag {
          border-radius: 6px !important;
          padding: 2px 8px !important;
          font-weight: 600 !important;
        }
        .hackathon-setup-theme .ant-tag-green {
          background: #f0fdf4 !important;
          border-color: #bbf7d0 !important;
          color: #16a34a !important;
        }
        .hackathon-setup-theme .ant-tag-red {
          background: #fee2e2 !important;
          border-color: #fca5a5 !important;
          color: #dc2626 !important;
        }
        .hackathon-setup-theme .ant-tag-gold {
          background: #f5f3ff !important;
          border-color: #ddd6fe !important;
          color: #7c3aed !important;
        }
        .hackathon-setup-theme .ant-switch.ant-switch-checked {
          background: #818cf8 !important;
        }
        .hackathon-setup-theme .ant-tabs-tab-btn:hover,
        .hackathon-setup-theme .ant-tabs .ant-tabs-tab:hover .ant-tabs-tab-btn {
          color: #818cf8 !important;
        }
        .hackathon-setup-theme .ant-select-focused .ant-select-selector,
        .hackathon-setup-theme .ant-select-selector:hover {
          border-color: #a78bfa !important;
        }
        .hackathon-setup-theme .ant-input:hover,
        .hackathon-setup-theme .ant-input:focus,
        .hackathon-setup-theme .ant-input-focused {
          border-color: #a78bfa !important;
        }
        .hackathon-setup-theme .ant-input:focus,
        .hackathon-setup-theme .ant-input-focused {
          box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.2) !important;
        }
        /* Nested tabs (e.g. Nhân sự) */
        .hackathon-setup-theme .ant-tabs-ink-bar {
          background: linear-gradient(90deg, #a78bfa 0%, #60a5fa 100%) !important;
        }
        .hackathon-setup-theme .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #6366f1 !important;
        }

        .hackathon-setup-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #64748b !important;
          transition: color 0.2s ease !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab:hover {
          color: #818cf8 !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #6366f1 !important;
          font-weight: 700 !important;
        }
        .hackathon-setup-tabs .ant-tabs-ink-bar {
          background: linear-gradient(90deg, #a78bfa 0%, #60a5fa 100%) !important;
          height: 3.5px !important;
          border-radius: 3px !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab-disabled {
          cursor: default !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        .hackathon-setup-card.ant-card {
          background: rgba(255, 255, 255, 0.45) !important;
          backdrop-filter: blur(20px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.04) !important;
          border-radius: 16px !important;
        }
        .hackathon-setup-card > .ant-card-body {
          padding: 0 24px !important;
        }
      `}</style>

      <div style={{ marginBottom: 16 }}>
        <EventContextBanner
          hackathon={hackathon}
          hackathonId={hackathonId}
          extra="Đổi sự kiện bằng bộ chọn trên thanh header — mọi tab Setup dùng chung ngữ cảnh này."
        />
      </div>

      <PageHeader
        title={hackathon.name}
        onBack={() => navigate(ROUTES.HACKATHONS)}
        subtitle={
          hackathon.status === 'DRAFT'
            ? 'Hoàn tất cấu hình rồi bấm «Xác nhận Kích hoạt» để mở đăng ký'
            : `Sự kiện: ${hackathon.name} — ${hackathon.status || ''}`
        }
        extra={
          hackathon.status === 'DRAFT' ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {!canActivateHackathon && activateBlockers.length > 0 ? (
                <Tooltip title={activateTooltip} placement="bottomRight">
                  <InfoCircleOutlined
                    style={{ fontSize: 16, color: 'var(--ant-color-warning)', cursor: 'help' }}
                  />
                </Tooltip>
              ) : null}
              <Tooltip title={activateTooltip} placement="bottomRight">
                <span style={{ display: 'inline-block' }}>
                  <Button
                    type="primary"
                    size="large"
                    data-testid="hackathon-activate-btn"
                    disabled={!canActivateHackathon}
                    onClick={handleActivateHackathon}
                  >
                    Xác nhận Kích hoạt
                  </Button>
                </span>
              </Tooltip>
            </span>
          ) : null
        }
      />

      <Row gutter={24}>
        <Col xs={24} xl={24}>
          <Card
            bordered={false}
            className="hackathon-setup-card"
            style={{ borderRadius: 16, marginBottom: activeTab === 'final-config' ? 0 : undefined }}
            bodyStyle={{ padding: '0 24px' }}
          >
            <Tabs
              destroyInactiveTabPane
              activeKey={activeTab}
              items={items}
              onChange={changeTab}
              className="hackathon-setup-tabs"
            />
          </Card>
          
          {/* Logic render bên ngoài Tabs của nhánh bạn */}
          {activeTab === 'final-config' && (
            <FinalRoundConfigPage
              hackathonId={hackathon.id}
              onUpdated={refreshSetupSnapshot}
            />
          )}
        </Col>

      </Row>
    </div>
  );
};

export default HackathonSetupPage;