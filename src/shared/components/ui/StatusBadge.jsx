import { Space, Tag } from 'antd';
import LiveRecordIndicator from './LiveRecordIndicator';
import {
  HACKATHON_STATUS_COLORS,
  HACKATHON_STATUS_LABELS,
  REGISTRATION_PHASE_COLORS,
  REGISTRATION_PHASE_LABELS,
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

const StatusBadge = ({ status, registrationPhase }) => {
  const key = String(status || '').toUpperCase();
  const phaseKey = registrationPhase
    ? String(registrationPhase).toUpperCase()
    : null;

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
  const showPhase = phaseKey && REGISTRATION_PHASE_LABELS[phaseKey];

  return (
    <Space size={4} wrap>
      <Tag
        color={color}
        style={{
          fontWeight: bold ? 700 : undefined,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          margin: 0,
        }}
      >
        {live ? <LiveRecordIndicator size={8} /> : null}
        {text}
      </Tag>
      {showPhase ? (
        <Tag
          color={REGISTRATION_PHASE_COLORS[phaseKey] || 'default'}
          style={{ margin: 0, fontWeight: 600 }}
        >
          {labelOf(REGISTRATION_PHASE_LABELS, phaseKey, phaseKey)}
        </Tag>
      ) : null}
    </Space>
  );
};

export default StatusBadge;
