import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Card, Space, Typography } from "antd";
import PageHeader from "../../../shared/components/ui/PageHeader";
import EliminateTeamModal from "../../team-elimination/components/EliminateTeamModal";
import { useEliminateTeam } from "../../team-elimination/hooks/useEliminateTeam";
import RankingGroupFilter from "../components/RankingGroupFilter";
import RankingRealtimeToolbar from "../components/RankingRealtimeToolbar";
import RankingSummary from "../components/RankingSummary";
import RankingTable from "../components/RankingTable";
import { useRoundRankingPreview } from "../hooks/useRoundRankingPreview";

const { Text } = Typography;

const RoundRankingPreviewPage = ({
  roundId: roundIdProp,
  canEliminate = true,
  embedded = false,
}) => {
  const params = useParams();
  const roundId = roundIdProp || params.roundId || params.id;
  const [selectedTeam, setSelectedTeam] = useState(null);

  const {
    visibleItems,
    groups,
    summary,
    selectedGroup,
    setSelectedGroup,
    isLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    fetchPreview,
  } = useRoundRankingPreview(roundId);

  const { isEliminating, eliminatingTeamId, eliminateTeam } = useEliminateTeam();

  const handleConfirmEliminate = async (reason) => {
    const success = await eliminateTeam(selectedTeam, reason, () => fetchPreview({ silent: true }));
    if (success) setSelectedTeam(null);
  };

  if (!roundId) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Thiếu roundId"
        description="Màn bảng xếp hạng cần roundId để gọi API preview."
      />
    );
  }

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      {!embedded && (
        <PageHeader
          title="Leaderboard Sơ loại"
          subtitle="Preview realtime trước khi khóa chấm điểm"
          extra={
            <RankingRealtimeToolbar
              isRefreshing={isRefreshing}
              lastUpdatedAt={lastUpdatedAt}
              onRefresh={() => fetchPreview({ silent: true })}
            />
          }
        />
      )}

      {embedded && (
        <RankingRealtimeToolbar
          isRefreshing={isRefreshing}
          lastUpdatedAt={lastUpdatedAt}
          onRefresh={() => fetchPreview({ silent: true })}
        />
      )}

      <RankingSummary summary={summary} />

      {error && (
        <Alert
          type="error"
          showIcon
          message="Không thể tải bảng xếp hạng"
          description={error?.message || "Vui lòng thử làm mới dữ liệu."}
        />
      )}

      <Card
        title="Bảng xếp hạng tạm"
        extra={<Text type="secondary">Dữ liệu lấy từ FR-20 preview ranking</Text>}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <RankingGroupFilter
            groups={groups}
            selectedGroup={selectedGroup}
            onChange={setSelectedGroup}
          />
          <RankingTable
            items={visibleItems}
            isLoading={isLoading}
            canEliminate={canEliminate}
            eliminatingTeamId={eliminatingTeamId}
            onEliminate={setSelectedTeam}
          />
        </Space>
      </Card>

      <EliminateTeamModal
        open={Boolean(selectedTeam)}
        team={selectedTeam}
        confirmLoading={isEliminating}
        onCancel={() => setSelectedTeam(null)}
        onConfirm={handleConfirmEliminate}
      />
    </Space>
  );
};

export default RoundRankingPreviewPage;
