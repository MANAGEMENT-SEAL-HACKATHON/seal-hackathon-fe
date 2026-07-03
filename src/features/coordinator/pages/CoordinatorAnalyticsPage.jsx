import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert, Grid, Select, Space, Spin, Typography, theme } from 'antd';
import { BarChart3 } from 'lucide-react';
import { SearchOutlined } from '@ant-design/icons';
import { useHackathonSelect } from '../hooks/useHackathonSelect';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { mapHackathonToFE } from '../../hackathons/mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import AnalyticsPage from '../../analytics/pages/AnalyticsPage';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const CoordinatorAnalyticsPage = () => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  const { hackathonId: routeHackathonId } = useParams();
  const [searchParams] = useSearchParams();
  const presetHackathonId = routeHackathonId || searchParams.get('hackathonId');

  const {
    hackathons,
    selectedHackathonId,
    setSelectedHackathonId,
    isLoadingHackathons,
  } = useHackathonSelect(presetHackathonId);

  const activeHackathonId = presetHackathonId
    ? Number(presetHackathonId)
    : selectedHackathonId;

  const [hackathon, setHackathon] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!activeHackathonId) {
      setHackathon(null);
      setRounds([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingDetail(true);
      try {
        const [hackData, roundsData] = await Promise.all([
          hackathonService.getById(activeHackathonId),
          roundService.listByHackathon(activeHackathonId),
        ]);

        const fullRounds = await Promise.all(
          (roundsData || []).map(async (r) => {
            try {
              const detail = await roundService.getById(r.id);
              return mapRoundToFE(detail);
            } catch {
              return mapRoundToFE(r);
            }
          }),
        );

        if (!cancelled) {
          setHackathon(mapHackathonToFE(hackData));
          setRounds(fullRounds);
        }
      } catch {
        if (!cancelled) {
          setHackathon(null);
          setRounds([]);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeHackathonId]);

  const pageStyle = {
    background: token.colorBgLayout,
    minHeight: '100%',
    padding: isMobile ? 12 : 24,
  };

  if (!activeHackathonId && isLoadingHackathons) {
    return (
      <div style={{ ...pageStyle, textAlign: 'center', padding: 50 }}>
        <Spin tip="Đang tải sự kiện..." />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ margin: '0 auto', maxWidth: 1400 }}>
        <section
          style={{
            alignItems: isMobile ? 'stretch' : 'center',
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: token.borderRadius,
            boxShadow: token.boxShadowTertiary,
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 18 : 24,
            justifyContent: 'space-between',
            marginBottom: isMobile ? 16 : 20,
            padding: isMobile ? 18 : '22px 24px',
          }}
        >
          <div>
            <Title
              level={2}
              style={{
                alignItems: 'center',
                display: 'flex',
                gap: 12,
                margin: 0,
              }}
            >
              <span
                style={{
                  alignItems: 'center',
                  background: token.colorPrimaryBg,
                  borderRadius: token.borderRadius,
                  color: token.colorPrimary,
                  display: 'inline-flex',
                  height: 40,
                  justifyContent: 'center',
                  width: 40,
                }}
              >
                <BarChart3 size={20} />
              </span>
              Phân tích & dữ liệu
            </Title>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, maxWidth: 680 }}>
              RBL variance, tiến độ chấm và xuất báo cáo sau khi sự kiện kết thúc.
            </Text>
          </div>

          {!presetHackathonId && (
            <Space direction="vertical" size={6} style={{ minWidth: isMobile ? 0 : 320, width: isMobile ? '100%' : 'auto' }}>
              <Text strong>Sự kiện đang xem</Text>
              <Select
                showSearch
                placeholder="Chọn sự kiện hackathon"
                loading={isLoadingHackathons}
                value={selectedHackathonId}
                onChange={(value) => setSelectedHackathonId(value)}
                style={{ width: '100%' }}
                size="large"
                suffixIcon={<SearchOutlined style={{ color: token.colorPrimary }} />}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={hackathons.map((h) => ({
                  value: h.id,
                  label: h.hackathonName || h.name || `Hackathon #${h.id}`,
                }))}
              />
            </Space>
          )}
        </section>

        {!activeHackathonId && !isLoadingHackathons && (
          <Alert
            type="info"
            showIcon
            message="Chưa chọn sự kiện hackathon"
            description="Vui lòng chọn một sự kiện ở phía trên để xem phân tích dữ liệu."
          />
        )}

        {activeHackathonId && loadingDetail && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="Đang tải dữ liệu phân tích..." />
          </div>
        )}

        {activeHackathonId && !loadingDetail && hackathon && (
          <AnalyticsPage hackathonId={hackathon.id} hackathon={hackathon} rounds={rounds} />
        )}
      </div>
    </div>
  );
};

export default CoordinatorAnalyticsPage;
