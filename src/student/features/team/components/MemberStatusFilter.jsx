import { Segmented, Typography, theme, ConfigProvider } from 'antd';
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

  const isDark = token.colorBgContainer !== '#ffffff' && token.colorBgContainer !== '#fff';

  return (
    <div style={{ marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
      <ConfigProvider
        theme={{
          components: {
            Segmented: {
              itemPadding: '2px 10px', // Compact padding
              itemSelectedBg: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(0, 82, 156, 0.1)',
              itemSelectedColor: isDark ? '#60A5FA' : '#00529C',
              trackBg: isDark ? 'rgba(255, 255, 255, 0.04)' : token.colorBgLayout,
            },
          },
        }}
      >
        <Segmented 
          value={value} 
          options={options} 
          onChange={onChange}
          size="middle" // Smaller size prevents horizontal overflow
          style={{ 
            padding: 4, 
            borderRadius: 10,
            fontWeight: 600, // Fixed font weight to prevent layout jump inside Segmented
          }}
        />
      </ConfigProvider>
    </div>
  );
};

export { MEMBER_FILTERS };
export default MemberStatusFilter;
