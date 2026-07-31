import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AutoComplete, Avatar, Input, Spin, Typography } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { studentTeamService } from '../../../student/features/team/services/studentTeam.service';

const { Text } = Typography;

const initialsFromName = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const defaultSecondaryLine = (user) =>
  [user?.studentCode || user?.student_code, user?.email].filter(Boolean).join(' · ');

const personnelSecondaryLine = (user) => {
  const roleLabel =
    user?.role === 'JUDGE' ? 'Giám khảo' : user?.role === 'MENTOR' ? 'Mentor' : user?.role;
  return [roleLabel, user?.institution, user?.email].filter(Boolean).join(' · ');
};

const UserInviteAutoComplete = ({
  value,
  onChange,
  onUserSelect,
  searchFn,
  hackathonId,
  getSecondaryLine,
  placeholder = 'Tìm theo email, tên hoặc mã SV...',
  disabled = false,
  inputStyle,
  ...rest
}) => {
  const [options, setOptions] = useState([]);
  const [fetching, setFetching] = useState(false);
  const debounceRef = useRef(null);

  const resolveSearchFn = searchFn
    || ((q) => studentTeamService.searchInviteCandidates(q, hackathonId));
  const resolveSecondaryLine = getSecondaryLine || defaultSecondaryLine;

  const clearDebounce = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  const runSearch = useCallback(
    (query) => {
      clearDebounce();
      const trimmed = (query || '').trim();
      if (trimmed.length < 2) {
        setOptions([]);
        setFetching(false);
        return;
      }
      setFetching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await resolveSearchFn(trimmed);
          const list = Array.isArray(results) ? results : results?.data || results?.items || [];
          setOptions(
            list.map((user) => ({
              value: user.email,
              user,
            })),
          );
        } catch {
          setOptions([]);
        } finally {
          setFetching(false);
        }
      }, 300);
    },
    [clearDebounce, resolveSearchFn],
  );

  useEffect(() => () => clearDebounce(), [clearDebounce]);

  const autocompleteOptions = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.value,
        user: opt.user,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <Avatar
              size={32}
              src={opt.user?.avatarUrl || opt.user?.avatar_url}
              style={{ background: '#3b82f6', flexShrink: 0 }}
            >
              {initialsFromName(opt.user?.fullName || opt.user?.full_name)}
            </Avatar>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ display: 'block', fontSize: 13 }}>
                {opt.user?.fullName || opt.user?.full_name}
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {resolveSecondaryLine(opt.user)}
              </Text>
            </div>
          </div>
        ),
      })),
    [options, resolveSecondaryLine],
  );

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      onSearch={runSearch}
      onSelect={(selectedValue, option) => {
        onChange?.(selectedValue);
        if (option?.user) {
          onUserSelect?.(option.user);
        }
      }}
      options={autocompleteOptions}
      disabled={disabled}
      style={{ width: '100%' }}
      notFoundContent={
        fetching ? (
          <div style={{ textAlign: 'center', padding: 8 }}>
            <Spin size="small" />
          </div>
        ) : undefined
      }
      {...rest}
    >
      <Input
        prefix={<UserOutlined style={{ color: 'rgba(0,0,0,0.25)' }} />}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
        allowClear
      />
    </AutoComplete>
  );
};

export { personnelSecondaryLine };
export default UserInviteAutoComplete;
