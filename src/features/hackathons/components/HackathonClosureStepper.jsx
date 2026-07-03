import { Card, Steps, Typography } from 'antd';

const { Text } = Typography;

/**
 * Coordinator cockpit for hackathon closure (awards, confirm, export).
 */
const HackathonClosureStepper = ({
  hackathonId,
  status,
  prizesCount = 0,
  awardsReady = false,
  canConfirm = false,
  canExport = false,
}) => {
  const upper = String(status || '').toUpperCase();
  if (!hackathonId || (upper !== 'PENDING_CONFIRM' && upper !== 'FINISHED')) return null;

  let current = 0;
  if (prizesCount > 0) current = 1;
  if (awardsReady || canConfirm) current = 2;
  if (upper === 'FINISHED') current = 3;

  return (
    <Card size="small" title="Checklist đóng giải" style={{ marginBottom: 16 }}>
      <Steps
        size="small"
        current={current}
        items={[
          {
            title: 'Trao giải',
            description: <Text type="secondary">Tab Giải thưởng</Text>,
          },
          {
            title: 'AWARDS readiness',
            description: awardsReady ? 'Sẵn sàng' : 'Kiểm tra blocker bên dưới',
          },
          {
            title: 'Chốt sổ',
            description: canConfirm ? 'Nút Chốt sổ' : 'Cần ≥1 giải',
          },
          {
            title: 'Export CSV',
            description: canExport ? 'Sau FINISHED' : 'Chưa FINISHED',
          },
        ]}
      />
    </Card>
  );
};

export default HackathonClosureStepper;
