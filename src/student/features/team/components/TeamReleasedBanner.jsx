import { Alert, Button } from 'antd';
import { useMemo } from 'react';
import { useAppContext } from '../../../../app/AppContext';

const TeamReleasedBanner = () => {
  const { notifications = [], markAsRead } = useAppContext();

  const released = useMemo(
    () => notifications.find((n) => !n.is_read && (n.type === 'TEAM_RELEASED' || n.notification_type === 'TEAM_RELEASED')),
    [notifications],
  );

  if (!released) return null;

  const handleDismiss = () => {
    if (released.id) {
      markAsRead(released.id);
    }
  };

  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16, borderRadius: 12 }}
      message="Đội của bạn đã kết thúc"
      description={released.body || released.message || 'Bạn có thể tạo đội mới hoặc tham gia đội khác.'}
      action={
        <Button size="small" type="primary" onClick={handleDismiss}>
          Đã hiểu
        </Button>
      }
    />
  );
};

export default TeamReleasedBanner;
