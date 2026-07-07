import React, { useState, useCallback, useEffect } from 'react';
import { Card, Tabs, Typography, Space, Button, Alert, Row, Col, List, Tag } from 'antd';
import { CheckCircleFilled, MinusCircleFilled, ExclamationCircleFilled, SyncOutlined } from '@ant-design/icons';
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

  // Từ Upstream
  const { readinessData } = useReadiness(hackathonId);

  // --- BẮT ĐẦU: LOGIC TO-DO LIST TỪ STASHED CỦA BẠN ---
  const [readiness, setReadiness] = useState(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);

  const fetchReadiness = useCallback(async () => {
    setLoadingReadiness(true);
    try {
      const res = await hackathonService.getReadiness(hackathonId, 'ONGOING');
      setReadiness(res?.data || res);
    } catch (error) {
      const errorData = error.response?.data?.error || error.response?.data || error;
      setReadiness(errorData);
    } finally {
      setLoadingReadiness(false);
    }
  }, [hackathonId]);

  // TỰ ĐỘNG CẬP NHẬT 1: Mỗi khi chuyển Tab, tự động gọi API lấy trạng thái mới nhất
  useEffect(() => {
    fetchReadiness();
  }, [fetchReadiness, activeTab]);

  const getTodoStatus = (keywords) => {
    if (hackathon && hackathon.status !== 'DRAFT') return 'done'; 
    if (!readiness) return 'progress'; 
    if (readiness.ready) return 'done';

    const blockers = readiness.blockers || readiness.errors || [];
    const warnings = readiness.warnings || [];

    const hasBlocker = blockers.some(b => keywords.some(k => JSON.stringify(b).includes(k)));
    const hasWarning = warnings.some(w => keywords.some(k => JSON.stringify(w).includes(k)));

    if (hasBlocker) return 'missing'; 
    if (hasWarning) return 'progress'; 

    if (!readiness.ready && blockers.length === 0) return 'missing';

    return 'done'; 
  };

  const prelimStatus = getTodoStatus(['PRELIM', 'TRACK']); 
  const finalStatus = getTodoStatus(['FINAL']); 
  let criteriaStatus = getTodoStatus(['CRITERIA', 'WEIGHT']); 
  const eventStatus = getTodoStatus(['KICKOFF', 'EVENT']);

  // VÁ LỖI XANH ẢO: Phụ thuộc dây chuyền
  if (prelimStatus === 'missing' || finalStatus === 'missing') {
    criteriaStatus = 'missing';
  }

  const todoItems = [
    { title: 'Vòng Sơ loại & Bảng đấu', status: prelimStatus, desc: 'Cần ít nhất 1 Vòng sơ loại và 1 Bảng đấu.' },
    { title: 'Vòng Chung kết', status: finalStatus, desc: 'Cần duy nhất 1 Vòng chung kết.' },
    { title: 'Tiêu chí đánh giá', status: criteriaStatus, desc: 'Tổng trọng số mỗi vòng/bảng phải đạt 100%.' },
    { title: 'Sự kiện Khai mạc', status: eventStatus, desc: 'Cần lên lịch sự kiện Kickoff.' }
  ];
  // --- KẾT THÚC LOGIC TO-DO LIST ---

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
      fetchReadiness(); 
    } catch {
      // no-op
    }
  }, [hackathonId, fetchReadiness]);

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
        subtitle={`Thiết lập bảng đấu và vòng thi cho mùa ${hackathon.season} ${hackathon.year}`}
        onBack={() => navigate(ROUTES.HACKATHONS)}
      />

      {/* Component từ Upstream */}
      <HackathonSetupChecklist
        rounds={rounds}
        tracksCount={tracksCount}
        eventsCount={eventsCount}
        hackathon={hackathon}
        readinessData={readinessData}
        onStepClick={changeTab}
      />

      <Row gutter={24}>
        <Col xs={24} xl={17}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 12 }}
            message="Quy trình chuẩn bị kỳ thi"
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                Lần lượt: tạo vòng thi → bảng đấu → tiêu chí chấm (tổng điểm mỗi bảng = 1) → gán mentor & giám khảo theo bảng →
                lên lịch sự kiện → kiểm tra điều kiện → mở đăng ký. Bốc thăm chỉ làm sau khi đã mở đăng ký và hết hạn đăng ký.
              </Typography.Text>
            }
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
            style={{ borderRadius: 12, border: '1px solid #e8edf5', boxShadow: '0 1px 6px rgba(15,61,138,0.05)', marginBottom: activeTab === 'final-config' ? 0 : undefined }}
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

        {/* CỘT PHẢI - CHECKLIST KHỞI ĐỘNG TỪ NHÁNH BẠN */}
        <Col xs={24} xl={7}>
          <Card
            title={
              <Space>
                <CheckCircleFilled style={{ color: '#1677ff' }} />
                Checklist Khởi động
              </Space>
            }
            style={{ borderRadius: 12, position: 'sticky', top: 24 }}
            extra={
              <Button
                type="text"
                icon={<SyncOutlined spin={loadingReadiness} />}
                onClick={fetchReadiness}
                title="Làm mới trạng thái"
              />
            }
          >
            <List
              itemLayout="horizontal"
              dataSource={todoItems}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      item.status === 'done' ? <CheckCircleFilled style={{ color: '#52c41a', fontSize: 18 }} /> :
                      item.status === 'progress' ? <ExclamationCircleFilled style={{ color: '#faad14', fontSize: 18 }} /> :
                      <MinusCircleFilled style={{ color: '#ff4d4f', fontSize: 18 }} />
                    }
                    title={
                      <Typography.Text strong={item.status === 'done'} delete={item.status === 'done'}>
                        {item.title}
                      </Typography.Text>
                    }
                    description={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Typography.Text>}
                  />
                </List.Item>
              )}
            />
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              {hackathon?.status === 'DRAFT' ? (
                <Tag color="processing" style={{ width: '100%', padding: '6px 0', fontSize: 14 }}>
                  Trạng thái: Bản nháp
                </Tag>
              ) : (
                <Tag color="success" style={{ width: '100%', padding: '6px 0', fontSize: 14 }}>
                  Đã kích hoạt thành công
                </Tag>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default HackathonSetupPage;