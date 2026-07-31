// src/features/rounds/ranking/components/RankingBoardRow.jsx
import { Button, Space, Tag, Tooltip, Typography, theme } from "antd";
import { UnorderedListOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { Ban } from "lucide-react";
import RankingMovementTag from "./RankingMovementTag";
import { getRankColor, getRowTone } from "../utils/rankingTone";

const { Text } = Typography;

const RankingBoardRow = ({
  item,
  movement,
  canEliminate,
  eliminatingTeamId,
  onEliminate,
  onOpenBreakdown,
}) => {
  const { token } = theme.useToken();
  const tone = getRowTone(item, movement, token);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{
        opacity: tone.opacity,
        y: movement?.direction === "up" ? -4 : movement?.direction === "down" ? 4 : 0,
        scale: movement?.direction === "up" ? 1.01 : movement?.direction === "down" ? 0.992 : 1,
      }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      whileHover={{ y: -2, transition: { duration: 0.16 } }}
      transition={{ layout: { type: "spring", stiffness: 420, damping: 34 }, duration: 0.24 }}
      style={{
        alignItems: "center",
        background: tone.background,
        border: `1px solid ${tone.borderColor}`,
        borderLeft: `4px solid ${tone.accent}`,
        borderRadius: token.borderRadiusLG,
        boxShadow: token.boxShadowTertiary,
        display: "grid",
        gap: 14,
        gridTemplateColumns: "64px minmax(180px, 1.6fr) 110px minmax(140px, 0.9fr) minmax(150px, 1fr) 200px",
        minHeight: 70,
        padding: "10px 14px",
      }}
    >
      <div>
        <Text
          strong
          style={{ color: getRankColor(item.rank, token), fontSize: 18 }}
        >
          #{item.rank || "-"}
        </Text>
        {item.tiebreakReasonLabel && (
          <div>
            <Tag color="blue" style={{ marginTop: 4, maxWidth: 120, whiteSpace: "normal", fontSize: 10 }}>
              {item.tiebreakReasonLabel}
            </Tag>
          </div>
        )}
      </div>

      <Text strong delete={item.isEliminated} ellipsis={{ tooltip: item.teamName }} style={{ fontSize: 15 }}>
        {item.teamName}
      </Text>

      <div style={{ textAlign: "right" }}>
        <Text strong={item.hasScore} type={item.hasScore ? undefined : "secondary"} style={{ display: "block", fontSize: item.hasScore ? 18 : 13 }}>
          {item.scoreLabel}
        </Text>
        {item.totalCriteria > 0 && (
          <Text type="secondary" style={{ fontSize: 11 }}>
            {item.scoredCriteria}/{item.totalCriteria} tiêu chí
          </Text>
        )}
      </div>

      <RankingMovementTag movement={movement} />

      <Space size={[4, 4]} wrap>
        {item.isScoringIncomplete && <Tag color="orange">Chưa chấm đủ</Tag>}
        {item.tiebreakRequired && <Tag color="gold">Nguy cơ đồng điểm</Tag>}
        {item.isEliminated && <Tag color="red">ELIMINATED</Tag>}
        {!item.isScoringIncomplete && !item.tiebreakRequired && !item.isEliminated && <Text type="secondary">-</Text>}
      </Space>

      <Space direction="vertical" size={2} style={{ width: "100%" }}>
        <Tooltip title={item.submissionId ? "Xem điểm thành phần" : "Đội chưa nộp bài"}>
          <Button
            type="link"
            size="small"
            icon={<UnorderedListOutlined />}
            disabled={!item.submissionId || !onOpenBreakdown}
            onClick={() => onOpenBreakdown?.(item)}
            style={{ padding: 0, height: "auto" }}
          >
            Chi tiết điểm
          </Button>
        </Tooltip>
        <Tooltip title={item.isEliminated ? "Đội đã bị loại" : "Loại đội vi phạm"}>
          <Button
            type="text"
            danger
            size="small"
            icon={<Ban size={14} />}
            disabled={!canEliminate || item.isEliminated}
            loading={eliminatingTeamId === item.teamId}
            onClick={() => onEliminate(item)}
          >
            Loại đội
          </Button>
        </Tooltip>
      </Space>
    </motion.div>
  );
};

export default RankingBoardRow;
