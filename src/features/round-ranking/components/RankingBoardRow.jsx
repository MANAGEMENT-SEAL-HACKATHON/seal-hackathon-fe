import { Button, Tag, Tooltip, Typography, theme } from "antd";
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
        gridTemplateColumns: "76px minmax(220px, 1.6fr) 116px 120px 150px 132px 56px",
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

      <Tag color="blue" style={{ justifySelf: "start", margin: 0 }}>
        {item.groupLabel}
      </Tag>

      <Text strong style={{ fontSize: 18, textAlign: "right" }}>
        {item.scoreLabel}
      </Text>

      <RankingMovementTag movement={movement} />

      <div>
        {item.tiebreakRequired && <Tag color="gold">Tiebreak</Tag>}
        {item.isEliminated && <Tag color="red">ELIMINATED</Tag>}
        {!item.tiebreakRequired && !item.isEliminated && <Text type="secondary">-</Text>}
      </div>

      <Tooltip title={item.isEliminated ? "Đội đã bị loại" : "Loại đội vi phạm"}>
        <Button
          danger
          icon={<Ban size={16} />}
          disabled={!canEliminate || item.isEliminated}
          loading={eliminatingTeamId === item.teamId}
          onClick={() => onEliminate(item)}
        />
      </Tooltip>
    </motion.div>
  );
};

export default RankingBoardRow;
