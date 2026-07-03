// src/features/hackathons/pages/HackathonSetupPage.jsx
import React, { useState, useCallback } from 'react';
import { Card, Tabs, Typography, Button } from 'antd';
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

const VALID_TABS = new Set([
  'general',
  'rounds',
  'tracks',
  'lottery',
  'criteria',
  'people',
  'events',
  'review',
]);

const getValidTab = (tab) => (VALID_TABS.has(tab) ? tab : 'tracks');

const HackathonSetupPage = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [hackathon, setHackathon] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [tracksCount, setTracksCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => getValidTab(searchParams.get('tab')));

  const { readinessData } = useReadiness(hackathonId);

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
    } catch {
      // no-op
    }
  }, [hackathonId]);

  React.useEffect(() => {
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

  React.useEffect(() => {
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
      children: <TrackManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'lottery',
      label: 'Bốc thăm & khai mạc',
      children: <LotteryManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'criteria',
      label: 'Tiêu chí đánh giá',
      children: <CriteriaManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'people',
      label: 'Nhân sự',
      children: <PeopleManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'events',
      label: 'Lịch trình & sự kiện',
      children: <EventManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'review',
      label: 'Đánh giá & kiểm tra',
      children: activeTab === 'review' ? <ReviewValidatePage hackathonId={hackathon.id} /> : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title={hackathon.name}
        subtitle={`Thiết lập bảng đấu và vòng thi cho mùa ${hackathon.season} ${hackathon.year}`}
        onBack={() => navigate(ROUTES.HACKATHONS)}
      />

      <HackathonSetupChecklist
        rounds={rounds}
        tracksCount={tracksCount}
        eventsCount={eventsCount}
        hackathon={hackathon}
        readinessData={readinessData}
        onStepClick={changeTab}
      />

      <style>{`
        .hackathon-setup-tabs .ant-tabs-nav::before {
          border-bottom: 1px solid #e8edf5 !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab {
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #8fa3bf !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #0f3d8a !important;
          font-weight: 700 !important;
        }
        .hackathon-setup-tabs .ant-tabs-ink-bar {
          background: #0f3d8a !important;
        }
        .hackathon-setup-tabs .ant-tabs-tab-disabled {
          cursor: default !important;
          padding-left: 4px !important;
          padding-right: 4px !important;
        }
        .hackathon-setup-card.ant-card {
          border: 1px solid #e8edf5 !important;
          box-shadow: 0 1px 6px rgba(15,61,138,0.05) !important;
        }
        .hackathon-setup-card .ant-card-body {
          padding: 0 24px !important;
        }
      `}</style>

      <Card
        bordered={false}
        className="hackathon-setup-card"
        style={{
          borderRadius: 12,
          border: '1px solid #e8edf5',
          boxShadow: '0 1px 6px rgba(15,61,138,0.05)',
          marginBottom: undefined,
        }}
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
    </div>
  );
};

export default HackathonSetupPage;
