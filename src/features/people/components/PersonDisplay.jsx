import { Avatar, Typography } from 'antd';

const { Text } = Typography;

const hashColor = (name = '') => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 42%)`;
};

const getInitials = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export const getPersonAvatarSrc = (person) =>
  person?.avatarUrl || person?.avatar_url || person?.avatar || null;

export const PersonAvatar = ({ person, size = 32, name }) => {
  const displayName = name || person?.fullName || person?.full_name || person?.name || '?';
  const src = getPersonAvatarSrc(person);
  return (
    <Avatar size={size} src={src} style={{ backgroundColor: hashColor(displayName), flexShrink: 0 }}>
      {getInitials(displayName)}
    </Avatar>
  );
};

export const PersonTableCell = ({ person, subtitle, size = 24 }) => {
  const name = person?.fullName || person?.full_name || person?.name || person?.judgeName || 'N/A';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <PersonAvatar person={person} size={size} name={name} />
      <div style={{ minWidth: 0 }}>
        <Text strong style={{ display: 'block' }}>{name}</Text>
        {subtitle ? (
          <Text type="secondary" style={{ fontSize: 12 }}>{subtitle}</Text>
        ) : null}
      </div>
    </div>
  );
};

export const personSelectOption = (person, { disabled = false, extra, label } = {}) => {
  const name = person?.fullName || person?.full_name || person?.name || 'Chưa có tên';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '4px 0',
        opacity: disabled ? 0.45 : 1,
        filter: disabled ? 'grayscale(0.35)' : undefined,
      }}
    >
      <PersonAvatar person={person} size={32} name={name} />
      <div style={{ lineHeight: 1.4, minWidth: 0, flex: 1 }}>
        <Text strong style={{ fontSize: 13, color: disabled ? 'rgba(0,0,0,0.45)' : undefined }}>
          {label || name}
        </Text>
        {extra ? (
          <Text
            type={disabled ? 'danger' : 'secondary'}
            style={{ fontSize: 11, display: 'block' }}
          >
            {extra}
          </Text>
        ) : null}
      </div>
    </div>
  );
};
