import React, { useState, useCallback } from 'react';
import { Card, Tabs, Typography, Select, Space, Button, Alert } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
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
import { mapHackathonToFE } from '../mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import LotteryManagementPage from '../../teams/pages/LotteryManagementPage';

// 1. IMPORT TRANG ANALYTICS MỚI (CHỈ THÊM DÒNG NÀY)
import AnalyticsPage from '../../analytics/pages/AnalyticsPage.jsx';
import FinalRoundConfigPage from '../../coordinator/pages/FinalRoundConfigPage';

const { Title } = Typography;
const { Option } = Select;

const HackathonSetupPage = () => {
  const { hackathonId } = useParams();
  const navigate = useNavigate();
  const [hackathon, setHackathon] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [activeTab, setActiveTab] = useState('tracks');
  
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
        const [hackData, roundsData] = await Promise.all([
          hackathonService.getById(hackathonId),
          roundService.listByHackathon(hackathonId)
        ]);
        
        const fullRounds = await Promise.all(
          (roundsData || []).map(async (r) => {
            try {
              const detail = await roundService.getById(r.id);
              return mapRoundToFE(detail);
            } catch (e) {
              return mapRoundToFE(r);
            }
          })
        );
        
        setHackathon(mapHackathonToFE(hackData));
        setRounds(fullRounds);
      } catch (error) {
        // Fallback for not found or errors
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [hackathonId]);

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
      key: 'rounds',
      label: 'Vòng thi (Rounds)',
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
      label: 'Bốc thăm & Khai mạc',
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
      label: 'Lịch trình & Sự kiện',
      children: <EventManagementPage hackathonId={hackathon.id} />,
    },
    {
      key: 'review',
      label: 'Đánh giá & Kiểm tra',
      children: activeTab === 'review' ? <ReviewValidatePage hackathonId={hackathon.id} /> : null, 
    },
    // 2. TAB ANALYTICS (CHỈ THÊM ĐOẠN NÀY)
    {
      key: 'analytics',
      label: 'Phân tích & Dữ liệu',
      children: activeTab === 'analytics' ? <AnalyticsPage hackathonId={hackathon.id} hackathon={hackathon} rounds={rounds} /> : null,
    },
    {
      key: 'final-config',
      label: 'Cấu hình Chung kết',
      children: null, // rendered outside Card below
    }
  ];

  return (
    <div>
      <PageHeader 
        title={hackathon.name}
        subtitle={`Thiết lập bảng đấu và vòng thi cho mùa ${hackathon.season} ${hackathon.year}`}
        onBack={() => navigate(ROUTES.HACKATHONS)}
      />

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
        <Tabs destroyInactiveTabPane={true} defaultActiveKey="rounds" items={items} onChange={setActiveTab} className="hackathon-setup-tabs"/>
      </Card>
      {activeTab === 'final-config' && <FinalRoundConfigPage />}
    </div>
  );
};

export default HackathonSetupPage;