import { useMemo } from 'react';
import { AutoComplete, Input } from 'antd';
import { MailOutlined } from '@ant-design/icons';

/**
 * Ô nhập email có gợi ý (autocomplete) domain phổ biến để giảm gõ tay và sai chính tả.
 * Tương thích Form.Item (nhận value/onChange). Truyền thêm `domains` để tùy biến gợi ý.
 */
const DEFAULT_DOMAINS = ['fpt.edu.vn', 'fe.edu.vn', 'gmail.com'];

const buildOptions = (value, domains) => {
  const input = (value || '').trim();
  if (!input) return [];

  const atIndex = input.indexOf('@');
  if (atIndex === -1) {
    return domains.map((domain) => ({ value: `${input}@${domain}` }));
  }

  const local = input.slice(0, atIndex);
  const domainPart = input.slice(atIndex + 1).toLowerCase();
  if (!local) return [];

  return domains
    .filter((domain) => domain.startsWith(domainPart))
    .map((domain) => ({ value: `${local}@${domain}` }));
};

const EmailAutoComplete = ({
  value,
  onChange,
  placeholder = 'Nhập email...',
  disabled = false,
  domains = DEFAULT_DOMAINS,
  showPrefix = true,
  inputStyle,
  ...rest
}) => {
  const options = useMemo(() => buildOptions(value, domains), [value, domains]);

  return (
    <AutoComplete
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      style={{ width: '100%' }}
      {...rest}
    >
      <Input
        type="email"
        prefix={showPrefix ? <MailOutlined style={{ color: 'rgba(0,0,0,0.25)' }} /> : undefined}
        placeholder={placeholder}
        disabled={disabled}
        style={inputStyle}
      />
    </AutoComplete>
  );
};

export default EmailAutoComplete;
