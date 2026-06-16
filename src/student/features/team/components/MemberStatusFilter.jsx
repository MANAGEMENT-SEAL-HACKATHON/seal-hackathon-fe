import { Segmented, Space, Typography, theme } from 'antd';
import { MEMBER_STATUS } from '../constants/studentTeam.constants';

const { Text } = Typography;

const MEMBER_FILTERS = [
  { label: 'Tất cả', value: 'ALL' },
  { label: 'Đã tham gia', value: MEMBER_STATUS.ACCEPTED },
  { label: 'Đang chờ', value: MEMBER_STATUS.PENDING },
  { label: 'Đã từ chối', value: MEMBER_STATUS.REJECTED },
  { label: 'Đã rời', value: MEMBER_STATUS.LEFT },
];

const MemberStatusFilter = ({ counts, value, onChange }) => {
  const { token } = theme.useToken();
  const options = MEMBER_FILTERS.map((filter) => ({
    ...filter,
    label: `${filter.label} (${counts[filter.value] || 0})`,
  }));

  return (
    <div style={{ marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
      <Segmented 
        value={value} 
        options={options} 
        onChange={onChange}
        size="large"
        style={{ padding: 6, borderRadius: 12 }}
      />
    </div>
  );
};

export { MEMBER_FILTERS };
export default MemberStatusFilter;
