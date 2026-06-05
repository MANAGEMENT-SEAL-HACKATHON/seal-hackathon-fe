import dayjs from "dayjs";
import { Button, Space, Tag, Typography } from "antd";
import { RefreshCw } from "lucide-react";

const { Text } = Typography;

const RankingRealtimeToolbar = ({ isRefreshing, lastUpdatedAt, onRefresh }) => (
  <Space wrap>
    <Tag color="processing">Polling 30s</Tag>
    <Text type="secondary">
      Cập nhật lần cuối: {lastUpdatedAt ? dayjs(lastUpdatedAt).format("HH:mm:ss") : "--:--:--"}
    </Text>
    <Button
      icon={<RefreshCw size={16} />}
      loading={isRefreshing}
      onClick={onRefresh}
    >
      Làm mới
    </Button>
  </Space>
);

export default RankingRealtimeToolbar;
