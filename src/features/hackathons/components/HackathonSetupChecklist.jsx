import { useMemo } from 'react';
import { Card, Steps, Typography } from 'antd';
import dayjs from 'dayjs';

const { Text } = Typography;

const SETUP_STEPS = [
  { key: 'rounds', title: 'Vòng thi', tab: 'rounds', blockerMatch: (code) => code.includes('ROUND') },
  { key: 'tracks', title: 'Bảng đấu', tab: 'tracks', blockerMatch: () => false },
  { key: 'criteria', title: 'Tiêu chí', tab: 'criteria', blockerMatch: (code) => code.includes('CRITERIA') || code.includes('WEIGHT') },
  { key: 'people', title: 'Nhân sự', tab: 'people', blockerMatch: (code) => code.includes('PERSONNEL') || code.includes('JUDGE') || code.includes('MENTOR') },
  { key: 'events', title: 'Lịch trình', tab: 'events', blockerMatch: (code) => code.includes('SCHEDULE') || code.includes('EVENT') },
  { key: 'lottery', title: 'Bốc thăm', tab: 'lottery', blockerMatch: () => false },
  { key: 'review', title: 'Kiểm tra', tab: 'review', blockerMatch: () => false },
];

function hasBlockerForStep(blockers, step) {
  return (blockers || []).some((b) => step.blockerMatch((b.code || '').toUpperCase()));
}

function isStepComplete(step, { rounds, tracksCount, eventsCount, hackathon, readinessData, blockers }) {
  switch (step.key) {
    case 'rounds':
      return rounds.length > 0;
    case 'tracks':
      return tracksCount > 0;
    case 'criteria':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'people':
      return tracksCount > 0 && !hasBlockerForStep(blockers, step);
    case 'events':
      return eventsCount > 0 || !hasBlockerForStep(blockers, step);
    case 'lottery': {
      if (!hackathon) return false;
      if (hackathon.registration_closed_early_at) return true;
      if (hackathon.registration_end && dayjs(hackathon.registration_end).isBefore(dayjs())) return true;
      return hackathon.status === 'ONGOING' || hackathon.status === 'FINISHED';
    }
    case 'review':
      return readinessData?.ready === true;
    default:
      return false;
  }
}

const HackathonSetupChecklist = ({
  rounds = [],
  tracksCount = 0,
  eventsCount = 0,
  hackathon,
  readinessData,
  onStepClick,
}) => {
  const blockers = readinessData?.blockers || [];

  const stepStatuses = useMemo(() => {
    const ctx = { rounds, tracksCount, eventsCount, hackathon, readinessData, blockers };
    const completes = SETUP_STEPS.map((step) => isStepComplete(step, ctx));
    const errors = SETUP_STEPS.map((step, index) => hasBlockerForStep(blockers, step) && !completes[index]);

    let processIndex = SETUP_STEPS.findIndex((_, i) => !completes[i] && !errors[i]);
    if (processIndex === -1) processIndex = SETUP_STEPS.length - 1;

    return SETUP_STEPS.map((step, index) => {
      if (errors[index]) return 'error';
      if (completes[index]) return 'finish';
      if (index === processIndex) return 'process';
      return 'wait';
    });
  }, [rounds, tracksCount, eventsCount, hackathon, readinessData, blockers]);

  const items = SETUP_STEPS.map((step, index) => ({
    title: (
      <span
        role="button"
        tabIndex={0}
        onClick={() => onStepClick?.(step.tab)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onStepClick?.(step.tab);
        }}
        style={{ cursor: 'pointer' }}
      >
        {step.title}
      </span>
    ),
    description: stepStatuses[index] === 'error' ? (
      <Text type="danger" style={{ fontSize: 11 }}>Cần xử lý</Text>
    ) : stepStatuses[index] === 'finish' ? (
      <Text type="success" style={{ fontSize: 11 }}>Hoàn thành</Text>
    ) : stepStatuses[index] === 'process' ? (
      <Text type="secondary" style={{ fontSize: 11 }}>Tiếp theo</Text>
    ) : null,
    status: stepStatuses[index],
  }));

  return (
    <Card size="small" style={{ marginBottom: 16, borderRadius: 12 }} title="Tiến độ chuẩn bị kỳ thi">
      <Steps size="small" items={items} />
      <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
        Lần lượt: tạo vòng thi → bảng đấu → tiêu chí chấm → gán mentor & giám khảo → lên lịch sự kiện →
        kiểm tra điều kiện → mở đăng ký. Bốc thăm chỉ làm sau khi đã mở đăng ký và hết hạn đăng ký.
      </Text>
    </Card>
  );
};

export default HackathonSetupChecklist;
