import { useState, useCallback, useEffect } from 'react';
import { Card, Tabs, Typography, Button, Row, Col, Drawer } from 'antd';
import { DoubleLeftOutlined, CloseOutlined } from '@ant-design/icons';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../../../shared/components/ui/PageHeader';
import TrackManagementPage from '../../tracks/pages/TrackManagementPage';
import RoundManagementPage from '../../rounds/pages/RoundManagementPage';
import CriteriaManagementPage from '../../criteria/pages/CriteriaManagementPage';
import ReviewValidatePage from '../../review/pages/ReviewValidatePage';
import { ROUTES } from '../../../shared/constants/routes';
import PeopleManagementPage from '../../people/pages/PeopleManagementPage';
import EventManagementPage from '../../events/pages/EventManagementPage';
import { hackathonService } from '../services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { trackService } from '../../tracks/services/trackService';
import { eventService } from '../../events/services/eventService';
import { mapHackathonToFE } from '../mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import LotteryManagementPage from '../../teams/pages/LotteryManagementPage';
import HackathonGeneralConfig from '../components/HackathonGeneralConfig';
import HackathonSetupChecklist from '../components/HackathonSetupChecklist';
import { useReadiness } from '../../review/hooks/useReadiness';

// IMPORT TRANG MỚI CỦA BẠN
import AnalyticsPage from '../../analytics/pages/AnalyticsPage';
import FinalRoundConfigPage from '../../coordinator/pages/FinalRoundConfigPage';

// Kết hợp các Tabs hợp lệ của cả 2 nhánh
const VALID_TABS = new Set([
  'general',
  'rounds',
  'tracks',
  'lottery',
  'criteria',
  'people',
  'events',
  'review',
  'analytics',
  'final-config',
]);

const getValidTab = (tab) => (VALID_TABS.has(tab) ? tab : 'tracks');

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
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Từ Upstream
  const { readinessData, refetch: refetchReadiness } = useReadiness(hackathonId);

  // TỰ ĐỘNG CẬP NHẬT 1: Mỗi khi chuyển Tab, tự động gọi API lấy trạng thái mới nhất
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

  const refreshHackathon = useCallback(async () => {
    try {
      const hackData = await hackathonService.getById(hackathonId);
      setHackathon(mapHackathonToFE(hackData));
      
      // TỰ ĐỘNG CẬP NHẬT 2: Khi các Component con báo "Lưu thành công", Checklist tự động cập nhật
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
          onUpdated={refreshHackathon}
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
          onHackathonSync={refreshHackathon}
        />
      ),
    },
    {
      key: 'tracks',
      label: 'Bảng đấu',
      children: <TrackManagementPage hackathonId={hackathon.id} onUpdated={refreshHackathon} />,
    },
    {
      key: 'lottery',
      label: 'Bốc thăm & khai mạc',
      children: <LotteryManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'criteria',
      label: 'Tiêu chí đánh giá',
      children: <CriteriaManagementPage hackathonId={hackathon.id} onUpdated={refreshHackathon} />, 
    },
    {
      key: 'people',
      label: 'Nhân sự',
      children: <PeopleManagementPage hackathonId={hackathon.id} onUpdated={refreshHackathon} />,
    },
    {
      key: 'events',
      label: 'Lịch trình & Sự kiện',
      children: <EventManagementPage hackathonId={hackathon.id} onUpdated={refreshHackathon} />,
    },
    {
      key: 'review',
      label: 'Đánh giá & Kiểm tra',
      children: activeTab === 'review' ? <ReviewValidatePage hackathonId={hackathon.id} onUpdated={refreshHackathon} /> : null, 
    },
    {
      key: 'analytics',
      label: 'Phân tích & Dữ liệu',
      children: activeTab === 'analytics' ? <AnalyticsPage hackathonId={hackathon.id} hackathon={hackathon} rounds={rounds} /> : null,
    },
    {
      key: 'final-config',
      label: 'Cấu hình Chung kết',
      children: null, 
    }
  ];

  return (
    <div>
      <PageHeader
        title={hackathon.name}
        onBack={() => navigate(ROUTES.HACKATHONS)}
        extra={
          <Button
            type="default"
            icon={<DoubleLeftOutlined />}
            onClick={() => setDrawerOpen(true)}
            style={{ borderRadius: 8, display: 'flex', alignItems: 'center' }}
          >
            Tiến độ chuẩn bị
          </Button>
        }
      />

      <Row gutter={24}>
        <Col xs={24} xl={24}>

          <style>{`
            .hackathon-setup-tabs .ant-tabs-nav::before {
              border-bottom: 1px solid rgba(226, 232, 240, 0.8) !important;
            }
            .hackathon-setup-tabs .ant-tabs-tab {
              font-size: 14px !important;
              font-weight: 600 !important;
              color: #64748b !important;
            }
            .hackathon-setup-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
              color: #0f172a !important;
              font-weight: 700 !important;
            }
            .hackathon-setup-tabs .ant-tabs-ink-bar {
              background: #3b82f6 !important;
              height: 3px !important;
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
          {activeTab === 'final-config' && <FinalRoundConfigPage hackathonId={hackathon.id} />}
        </Col>

      </Row>

      {/* Floating button on the right edge of the screen */}
      <div
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000,
          cursor: 'pointer',
          background: 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          borderRight: 'none',
          color: '#3b82f6',
          width: '36px',
          height: '110px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '16px 0 0 16px',
          boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.05)',
          transition: 'all 0.3s ease',
        }}
        onClick={() => setDrawerOpen(true)}
        title="Xem tiến độ chuẩn bị kì thi"
        onMouseEnter={(e) => { 
          e.currentTarget.style.width = '42px'; 
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
        }}
        onMouseLeave={(e) => { 
          e.currentTarget.style.width = '36px'; 
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.6)';
        }}
      >
        <DoubleLeftOutlined style={{ fontSize: '18px', marginBottom: '8px', color: '#3b82f6' }} />
        <span style={{ fontSize: '11px', writingMode: 'vertical-rl', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', color: '#475569' }}>Tiến độ</span>
      </div>

      <Drawer
        title={null}
        closable={false}
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={380}
        styles={{
          wrapper: {
            padding: '16px 16px 16px 0',
          },
          content: {
            borderRadius: '20px',
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.03), 0 10px 30px rgba(0, 0, 0, 0.03)',
          },
          body: {
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          },
          mask: {
            background: 'rgba(0, 0, 0, 0.02)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Button 
            type="text" 
            icon={<CloseOutlined style={{ fontSize: '14px', color: '#64748b' }} />} 
            onClick={() => setDrawerOpen(false)} 
            style={{ 
              width: '28px', 
              height: '28px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
          <span style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
            Tiến độ chuẩn bị kỳ thi
          </span>
        </div>

        <HackathonSetupChecklist
          rounds={rounds}
          tracksCount={tracksCount}
          eventsCount={eventsCount}
          hackathon={hackathon}
          readinessData={readinessData}
          onStepClick={(tab) => {
            changeTab(tab);
            setDrawerOpen(false);
          }}
          direction="vertical"
        />
      </Drawer>
    </div>
  );
};

export default HackathonSetupPage;