import { Tag } from "antd";
import { ChevronsDown, ChevronsUp, Minus } from "lucide-react";

const getMovementCopy = (movement, compact) => {
  if (!movement) return { icon: <Minus size={14} />, label: compact ? "—" : "Chưa có biến động" };
  if (movement.direction === "up") {
    return { icon: <ChevronsUp size={15} />, label: compact ? `+${movement.delta}` : `Tăng ${movement.delta} hạng` };
  }
  return { icon: <ChevronsDown size={15} />, label: compact ? `-${movement.delta}` : `Giảm ${movement.delta} hạng` };
};

const RankingMovementTag = ({ movement, compact = false }) => {
  const copy = getMovementCopy(movement, compact);
  const color = movement?.direction === "up" ? "green" : movement?.direction === "down" ? "volcano" : "default";

  return (
    <Tag color={color} style={{ alignItems: "center", display: "inline-flex", gap: 4, margin: 0 }}>
      {copy.icon}
      {copy.label}
    </Tag>
  );
};

export default RankingMovementTag;
