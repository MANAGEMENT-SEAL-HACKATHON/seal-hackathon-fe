// src/features/round-ranking/components/RankingTable.jsx
import { Empty, Spin, Typography, theme } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import RankingBoardRow from "./RankingBoardRow";

const { Text } = Typography;

const columns = ["Hạng", "Đội", "Điểm tạm", "Biến động", "Cảnh báo", "Thao tác"];

const RankingTable = ({
  items,
  isLoading,
  movements = {},
  canEliminate = true,
  eliminatingTeamId,
  onEliminate,
  showGroupDividers = false,
}) => {
  const { token } = theme.useToken();

  if (isLoading && !items.length) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!items.length) {
    return <Empty description="Chưa có dữ liệu bảng xếp hạng." style={{ padding: "42px 0" }} />;
  }

  return (
    <div
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
        overflowX: "auto",
        padding: 12,
      }}
    >
      <div>
        <div
          style={{
            alignItems: "center",
            background: token.colorFillQuaternary,
            display: "grid",
            gap: 14,
            gridTemplateColumns: "64px minmax(180px, 1.6fr) 110px minmax(140px, 0.9fr) minmax(150px, 1fr) 104px",
            marginBottom: 10,
            padding: "10px 14px",
            borderRadius: token.borderRadius,
          }}
        >
          {columns.map((column, index) => (
            <Text
              key={column}
              strong
              style={{
                color: token.colorTextSecondary,
                fontSize: 12,
                letterSpacing: 0,
                textAlign: index === 2 ? "right" : "left",
                textTransform: "uppercase",
              }}
            >
              {column}
            </Text>
          ))}
        </div>

        <motion.div layout style={{ display: "grid", gap: 12 }}>
          <AnimatePresence initial={false}>
            {items.map((item, index) => {
              const showDivider =
                showGroupDividers && (index === 0 || items[index - 1]?.groupKey !== item.groupKey);

              return (
                <div key={item.teamId}>
                  {showDivider && (
                    <Text strong style={{ display: "block", margin: "8px 2px 10px", color: token.colorPrimary }}>
                      {item.groupLabel} · xếp hạng độc lập
                    </Text>
                  )}
                  <RankingBoardRow
                    item={item}
                    movement={movements[String(item.teamId)]}
                    canEliminate={canEliminate}
                    eliminatingTeamId={eliminatingTeamId}
                    onEliminate={onEliminate}
                  />
                </div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default RankingTable;
