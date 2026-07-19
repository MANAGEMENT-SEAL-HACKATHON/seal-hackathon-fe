import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert, Grid, Spin, theme } from 'antd';
import { BarChart3 } from 'lucide-react';
import { useHackathonScopeOptional } from '../../hackathons/context/HackathonScopeContext';
import EventContextBanner from '../../hackathons/components/EventContextBanner';
import { hackathonService } from '../../hackathons/services/hackathonService';
import { roundService } from '../../rounds/services/roundService';
import { mapHackathonToFE } from '../../hackathons/mappers/hackathonMapper';
import { mapRoundToFE } from '../../rounds/mappers/roundMapper';
import AnalyticsPage from '../../analytics/pages/AnalyticsPage';
import CoordinatorHero from '../../../shared/components/ui/CoordinatorHero';

const { useBreakpoint } = Grid;

const CoordinatorAnalyticsPage = () => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  const { hackathonId: routeHackathonId } = useParams();
  const [searchParams] = useSearchParams();
  const scope = useHackathonScopeOptional();
  const presetHackathonId =
    routeHackathonId || searchParams.get('hackathonId') || scope?.hackathonId;

  const activeHackathonId = presetHackathonId ? Number(presetHackathonId) : null;
  const isLoadingHackathons = scope?.isLoadingHackathons;

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
    <div className="coord-page" style={pageStyle}>
      <div style={{ margin: '0 auto', maxWidth: 1400 }}>
        <CoordinatorHero
          data-testid="analytics-hero"
          title={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
              <BarChart3 size={24} style={{ color: '#4f46e5' }} />
              Phân tích & dữ liệu
            </span>
          }
          subtitle="Phân bố điểm giữa giám khảo, tiến độ chấm và xuất báo cáo sau khi sự kiện kết thúc."
        />

        <div style={{ marginBottom: 16 }}>
          <EventContextBanner hackathon={hackathon} hackathonId={activeHackathonId} />
        </div>

        {!activeHackathonId && !isLoadingHackathons && (
          <Alert
            type="info"
            showIcon
            message="Chưa chọn sự kiện hackathon"
            description="Vui lòng chọn sự kiện trên thanh header để xem phân tích dữ liệu."
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
