import { Link } from 'react-router-dom';
import { Card, Steps, Badge, Typography, Button } from 'antd';
import { ROUTES } from '../../../shared/constants/routes';

const { Text } = Typography;

/**
 * Checklist vận hành trên màn kết quả sơ loại (công bố, đồng điểm, chốt chuyển vòng).
 * Phase 1: Vé vớt step removed — props kept for backward compat.
 */
const PreliminaryResultsCoordinatorStepper = ({
  hackathonId,
  roundId,
  scoringLocked,
  isPublished,
  hasAdvanced,
  tiebreakCount = 0,
  // eslint-disable-next-line no-unused-vars -- backward compat
  wildcardPending = false,
  // eslint-disable-next-line no-unused-vars -- backward compat
  showWildcardTab = false,
  onTabChange,
  tabsAnchorId = 'gd4-results-tabs',
}) => {
  if (!roundId || !scoringLocked) return null;

  // Steps: 0 Khóa chấm | 1 Xem trước | 2 Đồng điểm | 3 Công bố | 4 Chốt Chung kết | 5 Cấu hình
  let current = 0;
  if (scoringLocked) current = 1;
  if (scoringLocked && tiebreakCount > 0 && !isPublished) current = 2;
  if (isPublished) current = 3;
  if (isPublished && !hasAdvanced && tiebreakCount === 0) current = 4;
  if (hasAdvanced) current = 5;

  const resultsUrl = ROUTES.ROUND_RESULTS.replace(':hackathonId', String(hackathonId)).replace(
    ':roundId',
    String(roundId),
  );
  const previewUrl = ROUTES.ROUND_RANKING_PREVIEW.replace(':hackathonId', String(hackathonId)).replace(
    ':roundId',
    String(roundId),
  );
  const roundsUrl = hackathonId ? `/hackathons/${hackathonId}/rounds` : ROUTES.ROUNDS;
  const finalConfigUrl = hackathonId
    ? `${ROUTES.COORDINATOR_FINAL_CONFIG}?hackathonId=${hackathonId}`
    : ROUTES.COORDINATOR_FINAL_CONFIG;

  const goToTab = (key) => {
    onTabChange?.(key);
    window.requestAnimationFrame(() => {
      document.getElementById(tabsAnchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <Card size="small" title="Checklist vận hành — Kết quả sơ loại" style={{ marginBottom: 16 }}>
      <Steps
        size="small"
        current={current}
        items={[
          {
            title: 'Khóa chấm sơ loại',
            description: <Link to={roundsUrl}>Quản lý vòng</Link>,
          },
          {
            title: 'Xem trước xếp hạng',
            description: <Link to={previewUrl}>Bảng xếp hạng tạm</Link>,
          },
          {
            title: 'Đồng điểm',
            description: (
              <Badge count={tiebreakCount} size="small" offset={[8, 0]}>
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, height: 'auto' }}
                  onClick={() => goToTab('tiebreak')}
                >
                  Phân xử đồng điểm
                </Button>
              </Badge>
            ),
          },
          {
            title: 'Công bố',
            description: <Text type="secondary">Nút trên phần đầu trang</Text>,
          },
          {
            title: 'Chốt Chung kết',
            description: <Link to={resultsUrl}>Chốt danh sách vào Chung kết</Link>,
          },
          {
            title: 'Cấu hình Chung kết',
            description: <Link to={finalConfigUrl}>Cấu hình vòng Chung kết</Link>,
          },
        ]}
      />
    </Card>
  );
};

export default PreliminaryResultsCoordinatorStepper;
