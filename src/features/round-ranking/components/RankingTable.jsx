import { Empty, Spin, Typography, theme } from "antd";
import { AnimatePresence, motion } from "framer-motion";
import RankingBoardRow from "./RankingBoardRow";

const { Text } = Typography;

const columns = ["Rank", "Đội", "Bảng", "Điểm", "Biến động", "Cảnh báo", ""];

const RankingTable = ({
  items,
  isLoading,
  movements = {},
  canEliminate = true,
  eliminatingTeamId,
  onEliminate,
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
      <div style={{ minWidth: 920 }}>
        <div
          style={{
            alignItems: "center",
            background: token.colorFillQuaternary,
            display: "grid",
            gap: 14,
            gridTemplateColumns: "76px minmax(220px, 1.6fr) 116px 120px 150px 132px 56px",
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
                textAlign: index === 3 ? "right" : "left",
                textTransform: "uppercase",
              }}
            >
              {column}
            </Text>
          ))}
        </div>

        <motion.div layout style={{ display: "grid", gap: 12 }}>
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <RankingBoardRow
                key={item.teamId}
                item={item}
                movement={movements[String(item.teamId)]}
                canEliminate={canEliminate}
                eliminatingTeamId={eliminatingTeamId}
                onEliminate={onEliminate}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
};

export default RankingTable;
