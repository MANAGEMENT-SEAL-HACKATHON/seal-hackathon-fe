import { Avatar, Empty, Grid, Space, Tag, Tooltip, Typography, theme } from "antd";
import { CrownFilled, MailOutlined, IdcardOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { MEMBER_ROLE } from "../constants/team.constants";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const getInitials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

const TeamMemberList = ({ members = [] }) => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;

  if (!members.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="Chưa có dữ liệu thành viên"
      />
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.08 } }
      }}
      style={{
        display: "grid",
        gap: 12,
        padding: "16px",
        background: token.colorBgLayout,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      {members.map((member) => {
        const isLeader = member.roleInTeam === MEMBER_ROLE.LEADER;

        return (
          <motion.div
            key={member.userId}
            variants={{
              hidden: { opacity: 0, x: -10 },
              visible: { opacity: 1, x: 0 }
            }}
            whileHover={{ scale: 1.01, boxShadow: "0 6px 16px rgba(0,0,0,0.06)" }}
            style={{
              alignItems: "center",
              background: isLeader ? `linear-gradient(145deg, #f0f5ff, #e6f7ff)` : token.colorBgContainer,
              border: `1px solid ${isLeader ? "#adc6ff" : token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusLG,
              display: "grid",
              gap: 16,
              gridTemplateColumns: isMobile
                ? "42px minmax(0, 1fr)"
                : "48px minmax(200px, 1.2fr) minmax(200px, 1.5fr) auto",
              minWidth: 0,
              padding: "12px 16px",
              position: "relative",
              overflow: "hidden",
              cursor: "default",
            }}
          >
            {isLeader && (
              <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: token.colorPrimary }} />
            )}

            <div style={{ position: "relative" }}>
              <Avatar
                size={isMobile ? 42 : 48}
                style={{
                  background: isLeader ? token.colorPrimary : token.colorFillTertiary,
                  color: isLeader ? "#fff" : token.colorTextSecondary,
                  fontWeight: 700,
                  fontSize: 16,
                  border: isLeader ? `2px solid #fff` : "none",
                  boxShadow: isLeader ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
                }}
              >
                {getInitials(member.fullName)}
              </Avatar>
              {isLeader && (
                <div style={{ position: "absolute", top: -8, right: -6, color: "#faad14", fontSize: 18, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }}>
                  <CrownFilled />
                </div>
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <Text
                strong
                style={{ display: "block", overflowWrap: "anywhere", fontSize: 15, color: isLeader ? token.colorPrimaryText : token.colorText }}
              >
                {member.fullName}
              </Text>
              <Text type="secondary" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <IdcardOutlined /> ID: {member.userId}
              </Text>
            </div>

            <Tooltip title={member.email}>
              <Text
                copyable={{ text: member.email }}
                type="secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  lineHeight: 1.45,
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  fontSize: 13,
                  gridColumn: isMobile ? "1 / span 2" : undefined,
                  marginTop: isMobile ? 8 : 0,
                }}
              >
                <MailOutlined /> {member.email}
              </Text>
            </Tooltip>

            <Space
              size={[8, 8]}
              wrap
              style={{
                gridColumn: isMobile ? "1 / span 2" : undefined,
                justifyContent: isMobile ? "flex-start" : "flex-end",
                marginTop: isMobile ? 4 : 0,
              }}
            >
              <Tag color={isLeader ? "blue-inverse" : "default"} style={{ margin: 0, borderRadius: 12, padding: "2px 10px", fontWeight: 600 }}>
                {member.roleLabel}
              </Tag>
              <Tag color={member.statusColor} style={{ margin: 0, borderRadius: 12, padding: "2px 10px", fontWeight: 600 }}>
                {member.statusLabel}
              </Tag>
            </Space>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export default TeamMemberList;
