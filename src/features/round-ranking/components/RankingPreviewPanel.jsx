import { Card, Space, Typography, theme } from "antd";
import RankingGroupFilter from "./RankingGroupFilter";
import RankingTable from "./RankingTable";
import RankingTopSteps from "./RankingTopSteps";

const { Text } = Typography;

const RankingPreviewPanel = ({
  canEliminate,
  eliminatingTeamId,
  groups,
  isLoading,
  movements,
  onEliminate,
  onGroupChange,
  selectedGroup,
  summary,
  visibleItems,
}) => {
  const { token } = theme.useToken();

  return (
    <Card
      style={{
        background: token.colorBgContainer,
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary,
      }}
      bodyStyle={{ padding: 18 }}
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <RankingGroupFilter
            groups={groups}
            selectedGroup={selectedGroup}
            onChange={onGroupChange}
          />
          <Text type="secondary">
            {summary.totalTeams} đội · {summary.tiebreakCount} tiebreak · {summary.eliminatedTeams} đã loại
          </Text>
        </div>

        <RankingTopSteps items={visibleItems} movements={movements} />

        <RankingTable
          items={visibleItems}
          isLoading={isLoading}
          movements={movements}
          canEliminate={canEliminate}
          eliminatingTeamId={eliminatingTeamId}
          onEliminate={onEliminate}
        />
      </Space>
    </Card>
  );
};

export default RankingPreviewPanel;
