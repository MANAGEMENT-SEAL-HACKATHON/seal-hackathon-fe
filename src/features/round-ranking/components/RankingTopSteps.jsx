import { Card, Tag, Typography, theme } from "antd";
import { motion } from "framer-motion";
import { Crown, Medal, Trophy } from "lucide-react";
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
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: meta.lift, scale: item.rank === 1 ? 1.02 : 1 }}
      transition={{ delay: index * 0.08, duration: 0.34, ease: "easeOut" }}
      whileHover={{ y: meta.lift - 4, transition: { duration: 0.18 } }}
      style={{ alignSelf: "end" }}
    >
      <Card
        style={{
          background: meta.background,
          border: `1px solid ${meta.border}`,
          boxShadow: item.rank === 1 ? token.boxShadowSecondary : token.boxShadowTertiary,
          minHeight: meta.height,
          overflow: "hidden",
        }}
        bodyStyle={{ padding: 16 }}
      >
        <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ alignItems: "center", color: meta.color, display: "flex", gap: 8 }}>
            {topIcons[item.rank]}
            <Text strong style={{ color: meta.color }}>{meta.label}</Text>
          </div>
          <Tag color={meta.tagColor}>
            #{item.rank}
          </Tag>
        </div>

        <Title level={4} ellipsis={{ rows: 1 }} style={{ margin: 0 }}>
          {item.teamName}
        </Title>
        <Text type="secondary" style={{ display: "block", marginTop: 4 }}>
          {item.groupLabel}
        </Text>

        <div style={{ alignItems: "end", display: "flex", justifyContent: "space-between", marginTop: 18 }}>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>Điểm TB</Text>
            <div style={{ color: meta.color, fontSize: item.rank === 1 ? 34 : 28, fontWeight: 900, lineHeight: 1 }}>
              {item.scoreLabel}
            </div>
          </div>
          <RankingMovementTag movement={movement} compact />
        </div>
      </Card>
    </motion.div>
  );
};

const RankingTopSteps = ({ items = [], movements = {} }) => {
  const topItems = topOrder
    .map((rank) => items.find((item) => item.rank === rank && !item.isEliminated))
    .filter(Boolean);

  if (!topItems.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        minHeight: 226,
        overflow: "hidden",
        paddingBottom: 38,
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
