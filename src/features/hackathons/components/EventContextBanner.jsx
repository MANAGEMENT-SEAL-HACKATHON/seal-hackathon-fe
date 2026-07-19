import { Alert, Tag, Tooltip, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  HACKATHON_STATUS_COLORS,
  HACKATHON_STATUS_LABELS,
  displayEventName,
  labelOf,
  stripEventStatusSuffix,
} from '../../../shared/constants/labels';

const { Text } = Typography;

/**
 * Compact event context line for coordinator pages.
 * Event switching lives in the global header selector.
 * Long guidance goes into Tooltip (not a full-width Alert).
 */
const EventContextBanner = ({ hackathon, hackathonId, extra }) => {
  if (!hackathon && !hackathonId) {
    return (
      <Alert
        type="warning"
        showIcon
        data-testid="event-context-banner"
        message="Chưa chọn sự kiện"
        description="Dùng bộ chọn Sự kiện trên thanh header để chọn hackathon đang làm việc."
      />
    );
  }

  const name = stripEventStatusSuffix(
    displayEventName(
      hackathon?.hackathonName ||
        hackathon?.name ||
        hackathon?.title ||
        `Sự kiện #${hackathonId}`,
      `Sự kiện #${hackathonId}`,
    ),
  );
  const status = String(hackathon?.status || '').toUpperCase();
  const tip =
    extra ||
    'Đổi sự kiện bằng bộ chọn trên thanh header — mọi trang cấu hình dùng chung ngữ cảnh này.';

  return (
    <div
      data-testid="event-context-banner"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '6px 12px',
        borderRadius: 10,
        background: 'linear-gradient(90deg, #f5f3ff 0%, #eff6ff 100%)',
        border: '1px solid #ddd6fe',
      }}
    >
      {/* Nền banner luôn sáng — cố định màu chữ để không mất chữ khi bật dark mode */}
      <Text style={{ fontSize: 13, color: '#64748b' }}>
        Sự kiện:
      </Text>
      <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
        {name}
      </Text>
      {status ? (
        <Tag
          color={HACKATHON_STATUS_COLORS[status] || 'default'}
          style={{ margin: 0 }}
        >
          {labelOf(HACKATHON_STATUS_LABELS, status, status)}
        </Tag>
      ) : null}
      <Tooltip title={tip}>
        <InfoCircleOutlined
          data-testid="event-context-tip"
          style={{ color: '#818cf8', cursor: 'help', fontSize: 15 }}
          aria-label="Thông tin ngữ cảnh sự kiện"
        />
      </Tooltip>
    </div>
  );
};

export default EventContextBanner;
