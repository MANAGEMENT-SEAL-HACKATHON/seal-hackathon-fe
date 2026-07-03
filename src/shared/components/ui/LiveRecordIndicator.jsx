import './LiveRecordIndicator.css';

const LiveRecordIndicator = ({ size = 10, label, showLabel = false, style }) => (
  <span
    className="live-record-indicator"
    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...style }}
  >
    <span
      className="live-record-indicator__dot"
      style={{ width: size, height: size }}
      aria-hidden
    />
    {showLabel && label ? <span>{label}</span> : null}
  </span>
);

export default LiveRecordIndicator;
