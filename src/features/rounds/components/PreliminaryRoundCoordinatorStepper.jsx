import { useQuery } from '@tanstack/react-query';
import { Card, Steps, Badge, Typography, Space } from 'antd';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { personBApi } from '../../../api/personB.api';

const { Text } = Typography;

/**
 * Coordinator playbook for preliminary round operations (release, late review, queue, lock).
 */
const PreliminaryRoundCoordinatorStepper = ({ round, hackathonId }) => {
  const roundId = round?.id;
  const isPrelimActive = round && !round.is_final && !round.isFinal && (round.is_active || round.isActive);

  const { data: lateCount = 0 } = useQuery({
    queryKey: ['latePendingCount', roundId],
    queryFn: async () => {
      const list = await personBApi.getLateSubmissions(roundId);
      return list.length;
    },
    enabled: Boolean(roundId && isPrelimActive),
    refetchInterval: 30_000,
  });

  if (!isPrelimActive || !roundId) return null;

  const problemReleased = Boolean(round.problem_released_at || round.problemReleasedAt);
  const scoringLocked = Boolean(round.scoring_locked || round.scoringLocked);
  const shuffled = Boolean(round.presentation_shuffled || round.presentationShuffled);

  let current = 0;
  if (problemReleased) current = 1;
  if (lateCount === 0 && problemReleased) current = 2;
  if (shuffled) current = 3;
  if (scoringLocked) current = 5;

  const queueUrl = `/presentation/queue?roundId=${roundId}`;
  const lateUrl = `${ROUTES.COORDINATOR_LATE_SUBMISSIONS}?roundId=${roundId}`;
  const roundsUrl = hackathonId ? `/hackathons/${hackathonId}/rounds` : ROUTES.ROUNDS;

  return (
    <Card size="small" title="Checklist vận hành — Vòng sơ loại" style={{ marginBottom: 16 }}>
      <Steps
        size="small"
        current={current}
        items={[
          {
            title: 'Phát đề',
            description: (
              <Link to={roundsUrl}>Round Management</Link>
            ),
          },
          {
            title: 'Duyệt nộp trễ',
            description: (
              <Space>
                <Link to={lateUrl}>Duyệt bài muộn</Link>
                {lateCount > 0 && <Badge count={lateCount} />}
              </Space>
            ),
          },
          {
            title: 'Readiness',
            description: <Link to={queueUrl}>Kiểm tra sẵn sàng</Link>,
          },
          {
            title: 'Shuffle queue',
            description: <Link to={queueUrl}>Xáo trộn hàng đợi</Link>,
          },
          {
            title: 'Controller + Timer',
            description: <Text type="secondary">Gán controller & bắt đầu timer trên queue</Text>,
          },
          {
            title: 'Khóa chấm',
            description: <Link to={roundsUrl}>Lock scoring</Link>,
          },
        ]}
      />
    </Card>
  );
};

export default PreliminaryRoundCoordinatorStepper;
