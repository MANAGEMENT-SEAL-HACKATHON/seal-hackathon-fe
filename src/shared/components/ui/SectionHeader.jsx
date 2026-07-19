import { Typography, Tooltip, Space } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

/**
 * Render a bullet list, used inside Tooltip help content to replace long Alert blocks.
 */
export const HintList = ({ items }) => (
  <ul style={{ margin: 0, paddingLeft: 18, maxWidth: 340 }}>
    {items.map((item) => (
      <li key={typeof item === 'string' ? item : JSON.stringify(item)} style={{ marginBottom: 4 }}>
        {item}
      </li>
    ))}
  </ul>
);

/**
 * Unified section header for Hackathon Setup tabs.
 * - Left: Title (level 4) + optional (i) tooltip carrying bullet-list help.
 * - Right: optional `extra` slot for primary actions.
 */
const SectionHeader = ({ title, info, extra, level = 4, style }) => (
  <div
    className="section-header"
    style={{
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
      ...style,
    }}
  >
    <Space size={8} align="center">
      <Title level={level} style={{ margin: 0 }}>
        {title}
      </Title>
      {info ? (
        <Tooltip title={info}>
          <InfoCircleOutlined style={{ color: 'var(--ant-color-text-secondary)', cursor: 'help' }} />
        </Tooltip>
      ) : null}
    </Space>
    {extra ? <div>{extra}</div> : null}
  </div>
);

export default SectionHeader;
