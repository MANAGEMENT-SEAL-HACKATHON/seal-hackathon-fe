// src/features/round-ranking/components/RankingRealtimeToolbar.jsx
import dayjs from "dayjs";
import { Button, Space, Tag, Typography, theme } from "antd";
import { RefreshCw, RadioTower } from "lucide-react";

const { Text } = Typography;

const RankingRealtimeToolbar = ({ isRefreshing, lastUpdatedAt, onRefresh }) => {
  const { token } = theme.useToken();

  return (
    <Space
      wrap
      style={{
        background: token.colorSuccessBg,
        border: `1px solid ${token.colorSuccessBorder}`,
        backdropFilter: "blur(8px)",
        borderRadius: "16px",
        padding: "8px 16px",
      }}
    >
      <Tag
        color="success"
        style={{ alignItems: "center", display: "inline-flex", gap: 6, margin: 0, background: token.colorSuccessBgHover, border: "none" }}
      >
        <RadioTower size={14} />
        Tự động cập nhật mỗi 30 giây
      </Tag>
      <Text style={{ color: token.colorTextSecondary }}>
        Cập nhật: {lastUpdatedAt ? dayjs(lastUpdatedAt).format("HH:mm:ss") : "--:--:--"}
      </Text>
      <Button
        type="primary"
        icon={<RefreshCw size={16} />}
        loading={isRefreshing}
        onClick={onRefresh}
        style={{ borderRadius: "20px" }}
      >
        Làm mới
      </Button>
    </Space>
  );
};

export default RankingRealtimeToolbar;
