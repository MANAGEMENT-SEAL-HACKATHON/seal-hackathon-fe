import {
  Card,
  Typography,
  Divider,
  Space,
  Button,
  theme,
  Tooltip,
  Popconfirm,
} from "antd";
import { Lock, Unlock } from "lucide-react";

const { Title, Text } = Typography;
const { useToken } = theme;

// === COMPONENT: THẺ TỔNG QUAN ===
export const ReviewSummaryCard = ({
  isReady,
  hackathonStatus,
  blockersCount,
  warningsCount,
  onActivate,
}) => {
  const { token } = useToken();

  // 1. Logic text cho nút bấm
  const getButtonText = () => {
    if (!isReady) return "Vui lòng xử lý lỗi";
    if (hackathonStatus !== "DRAFT") return "Không thể kích hoạt lúc này";
    return "Xác nhận Kích hoạt";
  };

  // 2. Logic text cho chú thích (Tooltip) khi trỏ chuột vào nút
  const getTooltipText = () => {
    if (!isReady) return `Còn ${blockersCount} lỗi bắt buộc cần xử lý`;
    if (hackathonStatus !== "DRAFT")
      return "Chỉ có thể kích hoạt khi trạng thái là DRAFT";
    return "Mọi thứ đã sẵn sàng!";
  };

  // 3. Điều kiện vô hiệu hóa nút
  const isDisabled = !isReady || hackathonStatus !== "DRAFT";

  return (
    <Card
      style={{
        borderRadius: 16,
        borderTop: `6px solid ${isReady ? token.colorSuccess : token.colorError}`,
        boxShadow: token.boxShadowSecondary,
        borderLeft: `1px solid ${token.colorBorderSecondary}`,
        borderRight: `1px solid ${token.colorBorderSecondary}`,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
      }}
      styles={{ body: { padding: "32px 24px" } }}
    >
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            padding: 24,
            borderRadius: "50%",
            backgroundColor: isReady
              ? token.colorSuccessBg
              : token.colorErrorBg,
            marginBottom: 20,
            border: `1px solid ${
              isReady ? token.colorSuccessBorder : token.colorErrorBorder
            }`,
          }}
        >
          {isReady ? (
            <Unlock size={48} color={token.colorSuccess} />
          ) : (
            <Lock size={48} color={token.colorError} />
          )}
        </div>
        <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
          {isReady ? "Sẵn sàng kích hoạt" : "Chưa đủ điều kiện"}
        </Title>
      </div>

      <Divider
        style={{ margin: "24px 0", borderColor: token.colorBorderSecondary }}
      />

      <Space
        direction="vertical"
        style={{ width: "100%", marginBottom: 32, gap: 16 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text type="secondary" style={{ fontSize: 15 }}>
            Lỗi bắt buộc:
          </Text>
          <div
            style={{
              background:
                blockersCount > 0 ? token.colorErrorBg : token.colorSuccessBg,
              padding: "4px 12px",
              borderRadius: 20,
              border: `1px solid ${
                blockersCount > 0
                  ? token.colorErrorBorder
                  : token.colorSuccessBorder
              }`,
            }}
          >
            <Text
              strong
              style={{
                color:
                  blockersCount > 0 ? token.colorError : token.colorSuccess,
                fontSize: 16,
              }}
            >
              {blockersCount}
            </Text>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text type="secondary" style={{ fontSize: 15 }}>
            Cảnh báo:
          </Text>
          <div
            style={{
              background:
                warningsCount > 0 ? token.colorWarningBg : token.colorBgLayout,
              padding: "4px 12px",
              borderRadius: 20,
              border: `1px solid ${
                warningsCount > 0
                  ? token.colorWarningBorder
                  : token.colorBorderSecondary
              }`,
            }}
          >
            <Text
              strong
              style={{
                color:
                  warningsCount > 0
                    ? token.colorWarning
                    : token.colorTextSecondary,
                fontSize: 16,
              }}
            >
              {warningsCount}
            </Text>
          </div>
        </div>
      </Space>

      <Tooltip title={getTooltipText()}>
        <div style={{ width: "100%" }}>
          <Popconfirm
            title="Kích hoạt Hackathon"
            description="Bạn có chắc chắn muốn phát hành giải đấu này? Thao tác này sẽ mở cổng cho thí sinh."
            onConfirm={onActivate}
            okText="Kích hoạt ngay"
            cancelText="Hủy"
            disabled={isDisabled}
          >
            <Button
              type="primary"
              size="large"
              block
              disabled={isDisabled}
              danger={!isReady}
              style={{
                height: 54,
                borderRadius: 12,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              {getButtonText()}
            </Button>
          </Popconfirm>
        </div>
      </Tooltip>
    </Card>
  );
};
