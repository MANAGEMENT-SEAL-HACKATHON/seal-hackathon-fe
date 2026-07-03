import { Link } from 'react-router-dom';
import { Card, Steps, Badge, Typography } from 'antd';
import { ROUTES } from '../../../shared/constants/routes';

const { Text } = Typography;

/**
 * Coordinator playbook on preliminary results (publish, tiebreak, advance).
 */
const PreliminaryResultsCoordinatorStepper = ({
  hackathonId,
  roundId,
  scoringLocked,
  isPublished,
  hasAdvanced,
  tiebreakCount = 0,
  wildcardPending = false,
  onTabChange,
}) => {
  if (!roundId || !scoringLocked) return null;

  let current = 0;
  if (scoringLocked) current = 1;
  if (!wildcardPending && scoringLocked) current = 2;
  if (tiebreakCount === 0 && isPublished) current = 4;
  if (isPublished && !hasAdvanced && tiebreakCount === 0) current = 5;
  if (hasAdvanced) current = 6;

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

  return (
    <Card size="small" title="Checklist vận hành — Kết quả sơ loại" style={{ marginBottom: 16 }}>
      <Steps
        size="small"
        current={current}
        items={[
          {
            title: 'Khóa chấm SL',
            description: <Link to={roundsUrl}>Quản lý vòng</Link>,
          },
          {
            title: 'Xem preview',
            description: <Link to={previewUrl}>Ranking preview</Link>,
          },
          {
            title: 'Wild Card',
            description: (
              <button type="button" className="ant-btn ant-btn-link" style={{ padding: 0 }} onClick={() => onTabChange?.('wildcard')}>
                Tab Wild Card
              </button>
            ),
          },
          {
            title: 'Tiebreak',
            description: (
              <Badge count={tiebreakCount} size="small" offset={[8, 0]}>
                <button type="button" className="ant-btn ant-btn-link" style={{ padding: 0 }} onClick={() => onTabChange?.('tiebreak')}>
                  Phân xử đồng điểm
                </button>
              </Badge>
            ),
          },
          {
            title: 'Công bố',
            description: <Text type="secondary">Nút trên header</Text>,
          },
          {
            title: 'Chốt CK',
            description: <Link to={resultsUrl}>Advance</Link>,
          },
          {
            title: 'Cấu hình CK',
            description: <Link to={finalConfigUrl}>Final config</Link>,
          },
        ]}
      />
    </Card>
  );
};

export default PreliminaryResultsCoordinatorStepper;
