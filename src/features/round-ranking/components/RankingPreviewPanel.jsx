import { Alert, Card, Space, Typography, theme } from "antd";
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
            {summary.totalTeams} đội · {summary.groupCount} bảng · {summary.incompleteTeams} chưa chấm đủ · {summary.tiebreakCount} nguy cơ đồng điểm
          </Text>
        </div>

        {selectedGroup === "all" ? (
          <Alert
            type="info"
            showIcon
            message="Đang xem tất cả các bảng"
            description="Mỗi bảng có thứ hạng độc lập. Chọn một bảng cụ thể để xem Top 1, Top 2 và Top 3 tạm thời của bảng đó."
          />
        ) : (
          <RankingTopSteps items={visibleItems} movements={movements} />
        )}

        <RankingTable
          items={visibleItems}
          isLoading={isLoading}
          movements={movements}
          canEliminate={canEliminate}
          eliminatingTeamId={eliminatingTeamId}
          onEliminate={onEliminate}
          showGroupDividers={selectedGroup === "all"}
        />
      </Space>
    </Card>
  );
};

export default RankingPreviewPanel;
