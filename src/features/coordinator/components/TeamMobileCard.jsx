import { Button, Checkbox, Space, Spin, Tag, Typography, theme } from "antd";
import { DownOutlined, LockOutlined, UserOutlined } from "@ant-design/icons";
import { AnimatePresence, motion } from "framer-motion";
import TeamActionButtons from "./TeamActionButtons";
import TeamMemberList from "./TeamMemberList";
import TeamJourneyPanel from "../../teams/components/TeamJourneyPanel";
import TeamMentorHistoryPanel from "../../teams/components/TeamMentorHistoryPanel";

const { Text } = Typography;

const TeamMobileCard = ({
  team,
  checked,
  disabledReason,
  canApprove,
  canReject,
  canDisband,
  selectable = true,
  loading,
  expanded,
  detail,
  detailLoading,
  onCheck,
  onToggleDetail,
  onApprove,
  onReject,
  onDisband,
}) => {
  const { token } = theme.useToken();
  const members = detail?.members || team.members || [];

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        background: `linear-gradient(180deg, ${token.colorBgContainer}, ${token.colorBgLayout})`,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG * 1.5,
        boxShadow: "0 6px 16px rgba(0,0,0,0.04)",
        padding: 16,
      }}
      whileHover={{ y: -2, boxShadow: "0 12px 24px rgba(0,0,0,0.08)" }}
    >
      <div
        style={{
          alignItems: "flex-start",
          display: "grid",
          gap: 10,
          gridTemplateColumns: selectable ? "24px 1fr" : "1fr",
        }}
      >
        {selectable && (
          <Checkbox
            checked={checked}
            disabled={!canApprove}
            onChange={(event) => onCheck(event.target.checked)}
            aria-label={`Chọn đội ${team.teamName}`}
          />
        )}
        <div>
          <Text
            strong
            style={{
              color: token.colorText,
              display: "block",
              fontSize: 16,
              lineHeight: 1.35,
            }}
          >
            {team.teamName}
          </Text>
          <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
            <UserOutlined /> {team.leaderName}
          </Text>
          <Space size={[6, 6]} wrap style={{ marginTop: 10 }}>
            <Tag color={team.statusColor}>{team.statusLabel}</Tag>
            <Tag color={team.isInvalidMemberCount ? "error" : "green"}>
              {team.memberStats}
            </Tag>
            {team.isLocked && (
              <Tag icon={<LockOutlined />} color="default">
                Đã khóa
              </Tag>
            )}
          </Space>
          {disabledReason && (
            <Text
              type="secondary"
              style={{ display: "block", fontSize: 12, marginTop: 8 }}
            >
              {disabledReason}
            </Text>
          )}
        </div>
      </div>

      <TeamActionButtons
        compact
        disabledReason={disabledReason}
        canApprove={canApprove}
        canReject={canReject}
        canDisband={canDisband}
        loading={loading}
        onApprove={onApprove}
        onReject={onReject}
        onDisband={onDisband}
      />

      <Button
        block
        type="text"
        onClick={onToggleDetail}
        style={{ marginTop: 10 }}
        icon={
          <DownOutlined
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 160ms ease",
            }}
          />
        }
      >
        {expanded ? "Thu gọn thành viên" : "Xem thành viên"}
      </Button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              marginTop: 12,
              overflow: "hidden",
              paddingTop: 12,
            }}
          >
            {detailLoading ? (
              <Space
                style={{ justifyContent: "center", padding: 16, width: "100%" }}
              >
                <Spin size="small" />
                <Text type="secondary">Đang tải chi tiết đội...</Text>
              </Space>
            ) : (
              <>
                <TeamMemberList members={members} />
                <TeamJourneyPanel teamId={team.id} teamName={team.teamName} />
                <TeamMentorHistoryPanel teamId={team.id} teamName={team.teamName} />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
};

export default TeamMobileCard;
