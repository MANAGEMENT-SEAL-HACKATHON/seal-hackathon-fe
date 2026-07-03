import { Link } from 'react-router-dom';
import { Card, Steps, Typography } from 'antd';
import { ROUTES } from '../../../shared/constants/routes';

const { Text } = Typography;

/**
 * Coordinator playbook for final round operations.
 */
const FinalRoundCoordinatorStepper = ({
  hackathonId,
  prelimRoundId,
  finalRoundId,
  finalActive = false,
  scoringLocked = false,
}) => {
  if (!hackathonId || !finalRoundId) return null;

  let current = 0;
  if (prelimRoundId) current = 1;
  if (finalActive) current = 3;
  if (scoringLocked) current = 6;

  const prelimResultsUrl = prelimRoundId
    ? ROUTES.ROUND_RESULTS.replace(':hackathonId', String(hackathonId)).replace(
        ':roundId',
        String(prelimRoundId),
      )
    : null;
  const queueUrl = `/presentation/queue?roundId=${finalRoundId}`;
  const peopleUrl = hackathonId ? `/hackathons/${hackathonId}/setup?tab=people` : ROUTES.HACKATHON_SETUP;
  const roundsUrl = hackathonId ? `/hackathons/${hackathonId}/rounds` : ROUTES.ROUNDS;
  const resultsUrl = `/hackathons/${hackathonId}/results`;

  return (
    <Card size="small" title="Checklist vận hành — Chung kết" style={{ marginBottom: 16 }}>
      <Steps
        size="small"
        current={current}
        items={[
          {
            title: 'Đội ADVANCED',
            description: prelimResultsUrl ? <Link to={prelimResultsUrl}>Kết quả SL</Link> : '—',
          },
          {
            title: 'Guest judge',
            description: <Link to={peopleUrl}>People</Link>,
          },
          {
            title: 'Activate CK',
            description: <Text type="secondary">Kích hoạt ngay trên màn này</Text>,
          },
          {
            title: 'Calibration',
            description: <Text type="secondary">Phiên hiệu chuẩn</Text>,
          },
          {
            title: 'Queue + timer',
            description: <Link to={queueUrl}>Presentation queue</Link>,
          },
          {
            title: 'Khóa chấm CK',
            description: (
              <Link to={roundsUrl}>
                {scoringLocked ? 'Đã khóa → Đóng giải' : 'Lock scoring'}
              </Link>
            ),
          },
          {
            title: 'Trao giải',
            description: scoringLocked ? <Link to={resultsUrl}>Kết quả hackathon</Link> : 'Sau lock',
          },
        ]}
      />
    </Card>
  );
};

export default FinalRoundCoordinatorStepper;
