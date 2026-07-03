import { Grid, Typography, theme } from "antd";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const ApprovalSummary = ({ title, description, metrics }) => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div
      style={{
        alignItems: isMobile ? "stretch" : "flex-start",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: 16,
        justifyContent: "space-between",
        marginBottom: 20,
      }}
    >
      <div>
        <Title level={4} style={{ color: token.colorText, margin: 0 }}>
          {title}
        </Title>
        <Text type="secondary">{description}</Text>
      </div>
      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: isMobile
            ? "repeat(3, minmax(0, 1fr))"
            : "repeat(3, 124px)",
        }}
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4, type: "spring" }}
            whileHover={{ y: -4, boxShadow: "0 12px 24px rgba(0,0,0,0.08)" }}
            style={{
              background: `linear-gradient(145deg, ${token.colorBgContainer}, ${token.colorBgLayout})`,
              border: `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG * 1.5,
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
              minWidth: 0,
              padding: "16px 20px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                color: token.colorPrimary,
                fontSize: 26,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              {metric.value}
            </div>
            <div style={{ color: token.colorTextSecondary, fontSize: 13, marginTop: 8, fontWeight: 500 }}>
              {metric.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default ApprovalSummary;
