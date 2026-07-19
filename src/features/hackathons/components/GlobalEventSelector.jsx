import { Badge, Select, Typography } from 'antd';
import { useHackathonScopeOptional } from '../context/HackathonScopeContext';
import {
  HACKATHON_STATUS_COLORS,
  HACKATHON_STATUS_LABELS,
  displayEventName,
  labelOf,
  stripEventStatusSuffix,
} from '../../../shared/constants/labels';

const { Text } = Typography;

/**
 * Header event switcher — always shows which hackathon the coordinator is on.
 */
const GlobalEventSelector = ({ compact = false }) => {
  const scope = useHackathonScopeOptional();
  if (!scope) return null;

  const {
    hackathonId,
    setHackathonId,
    hackathons,
    isLoadingHackathons,
    selectedHackathon,
  } = scope;

  const status = String(selectedHackathon?.status || '').toUpperCase();

  const eventLabel = (h) =>
    stripEventStatusSuffix(
      displayEventName(
        h.name || h.hackathonName || h.title || `Sự kiện #${h.id}`,
        `Sự kiện #${h.id}`,
      ),
    );

  return (
    <div
      data-testid="global-event-selector"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'nowrap',
        minWidth: 0,
        maxWidth: compact ? 280 : 640,
      }}
    >
      {!compact && (
        <Text type="secondary" style={{ whiteSpace: 'nowrap', fontSize: 12, flexShrink: 0 }}>
          Sự kiện
        </Text>
      )}
      <Select
        showSearch
        allowClear={false}
        placeholder="Chọn sự kiện"
        loading={isLoadingHackathons}
        value={hackathonId || undefined}
        onChange={(id) => setHackathonId(id)}
        style={{ minWidth: compact ? 160 : 260, flex: 1 }}
        popupMatchSelectWidth={false}
        optionFilterProp="label"
        options={(hackathons || []).map((h) => ({
          value: h.id,
          label: eventLabel(h),
          title: eventLabel(h),
        }))}
        optionRender={(option) => {
          const h = (hackathons || []).find((x) => Number(x.id) === Number(option.value));
          const st = String(h?.status || '').toUpperCase();
          return (
            <div
              style={{ display: 'flex', justifyContent: 'space-between', gap: 12, minWidth: 220 }}
              title={option.label}
            >
              <span>{option.label}</span>
              {st ? (
                <Badge
                  status={HACKATHON_STATUS_COLORS[st] || 'default'}
                  text={labelOf(HACKATHON_STATUS_LABELS, st, st)}
                />
              ) : null}
            </div>
          );
        }}
      />
      {status && !compact ? (
        <span
          data-testid="global-event-status"
          style={{
            flexShrink: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <Badge
            status={HACKATHON_STATUS_COLORS[status] || 'default'}
            text={
              <span style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                {labelOf(HACKATHON_STATUS_LABELS, status, status)}
              </span>
            }
          />
        </span>
      ) : null}
    </div>
  );
};

export default GlobalEventSelector;
