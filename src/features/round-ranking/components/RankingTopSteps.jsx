// src/features/round-ranking/components/RankingTopSteps.jsx
import { Card, Typography, theme } from "antd";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
import { getActiveRankingItems } from "../service/rankingPreviewMapper";
import RankingMovementTag from "./RankingMovementTag";
import { getTopStepMeta } from "./rankingTone";

const { Text, Title } = Typography;

const topOrder = [2, 1, 3];

const topIcons = {
  1: <Crown size={26} />,
  2: <Trophy size={24} />,
  3: <Medal size={24} />,
};

const RankingTopStepCard = ({ item, movement, index }) => {
  const { token } = theme.useToken();
  const meta = getTopStepMeta(item.rank, token);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.34, ease: "easeOut" }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
    >
      <Card
        style={{
          background: meta.background,
          border: `1px solid ${meta.border}`,
          boxShadow: item.rank === 1 ? token.boxShadowSecondary : token.boxShadowTertiary,
          overflow: "hidden",
        }}
        bodyStyle={{ padding: 14 }}
      >
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ alignItems: "center", color: meta.color, display: "flex", gap: 8 }}>
            {topIcons[item.rank]}
            <Text strong style={{ color: meta.color }}>Hạng {item.rank} tạm thời</Text>
          </div>
          <RankingMovementTag movement={movement} compact />
        </div>

        <Title level={5} ellipsis={{ rows: 1 }} style={{ margin: 0 }}>
          {item.teamName}
        </Title>

        <div style={{ alignItems: "end", display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <div style={{ color: meta.color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
            {item.scoreLabel}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>Điểm TB tạm thời</Text>
        </div>
      </Card>
    </motion.div>
  );
};

const RankingTopSteps = ({ items = [], movements = {} }) => {
  const activeTop = getActiveRankingItems(items).slice(0, 3);
  const topItems = topOrder
    .map((rank) => activeTop.find((item) => item.rank === rank))
    .filter(Boolean);

  if (!topItems.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        overflow: "hidden",
      }}
    >
      {topItems.map((item, index) => (
        <RankingTopStepCard
          key={item.teamId}
          item={item}
          movement={movements[String(item.teamId)]}
          index={index}
        />
      ))}
    </div>
  );
};

export default RankingTopSteps;
