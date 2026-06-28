// src/features/round-ranking/components/RankingBoardRow.jsx
import { Button, Space, Tag, Tooltip, Typography, theme } from "antd";
import { motion } from "framer-motion";
import { Ban } from "lucide-react";
import RankingMovementTag from "./RankingMovementTag";
import { getRankColor, getRowTone } from "./rankingTone";

const { Text } = Typography;

const RankingBoardRow = ({
  item,
  movement,
  canEliminate,
  eliminatingTeamId,
  onEliminate,
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
        gridTemplateColumns: "64px minmax(180px, 1.6fr) 110px minmax(140px, 0.9fr) minmax(150px, 1fr) 104px",
        minHeight: 70,
        padding: "10px 14px",
      }}
    >
      <Text
        strong
        style={{ color: getRankColor(item.rank, token), fontSize: 18 }}
      >
        #{item.rank || "-"}
      </Text>

      <Text strong delete={item.isEliminated} ellipsis style={{ fontSize: 15 }}>
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
    </motion.div>
  );
};

export default RankingBoardRow;
