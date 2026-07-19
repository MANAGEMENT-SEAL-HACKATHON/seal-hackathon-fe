import { Tag } from 'antd';
import LiveRecordIndicator from './LiveRecordIndicator';
import {
  HACKATHON_STATUS_COLORS,
  HACKATHON_STATUS_LABELS,
  labelOf,
} from '../../constants/labels';
import './LiveRecordIndicator.css';

const HACKATHON_KEYS = new Set([
  'DRAFT',
  'ONGOING',
  'ACTIVE',
  'PENDING_CONFIRM',
  'FINISHED',
  'COMPLETED',
  'CLOSED',
  'INACTIVE',
]);

const StatusBadge = ({ status }) => {
  const key = String(status || '').toUpperCase();

  const getStatusConfig = (statusKey) => {
    if (HACKATHON_KEYS.has(statusKey) && HACKATHON_STATUS_COLORS[statusKey]) {
      return {
        color: HACKATHON_STATUS_COLORS[statusKey],
        text: labelOf(HACKATHON_STATUS_LABELS, statusKey, statusKey),
        live: statusKey === 'ONGOING' || statusKey === 'ACTIVE',
        bold: statusKey === 'DRAFT' || statusKey === 'ONGOING' || statusKey === 'ACTIVE',
      };
    }

    switch (statusKey) {
      case 'PUBLISHED':
        return { color: 'blue', text: 'Đã công bố' };
      case 'OPEN':
        return { color: 'green', text: 'Mở' };
      case 'PENDING':
        return { color: 'gold', text: 'Chờ duyệt' };
      case 'APPROVED':
        return { color: 'green', text: 'Đã duyệt' };
      case 'REJECTED':
        return { color: 'red', text: 'Đã từ chối' };
      case 'ELIMINATED':
        return { color: 'red', text: 'Đã bị loại' };
      default:
        return { color: 'default', text: status };
    }
  };

  const { color, text, bold, live } = getStatusConfig(key);

  return (
    <Tag
      color={color}
      style={{
        fontWeight: bold ? 700 : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {live ? <LiveRecordIndicator size={8} /> : null}
      {text}
    </Tag>
  );
};

export default StatusBadge;
