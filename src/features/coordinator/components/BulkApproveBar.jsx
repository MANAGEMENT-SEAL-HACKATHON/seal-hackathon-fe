import { Button, Grid, Typography, theme } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const BulkApproveBar = ({ selectedCount, loading, onApprove }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={{
        alignItems: "center",
        background: token.colorSuccessBg,
        border: `1px solid ${token.colorSuccessBorder}`,
        borderRadius: token.borderRadius,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 12,
        justifyContent: "space-between",
        marginBottom: 14,
        padding: "10px 12px",
      }}
    >
      <Text strong>{selectedCount} đội đã chọn</Text>
      <Button
        type="primary"
        icon={<CheckOutlined />}
        loading={loading}
        onClick={onApprove}
        style={{
          background: token.colorSuccess,
          borderColor: token.colorSuccess,
          borderRadius: token.borderRadius,
          width: isMobile ? "100%" : undefined,
        }}
      >
        Duyệt hàng loạt
      </Button>
    </motion.div>
  );
};

export default BulkApproveBar;
