// src/features/round-ranking/pages/RoundRankingPreviewPage.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Alert, Button, Space } from "antd";
import PageHeader from "../../../shared/components/ui/PageHeader";
import EliminateTeamModal from "../../team-elimination/components/EliminateTeamModal";
import { useEliminateTeam } from "../../team-elimination/hooks/useEliminateTeam";
import { roundService } from "../../rounds/services/roundService";
import RankingPreviewPanel from "../components/RankingPreviewPanel";
import RankingRealtimeToolbar from "../components/RankingRealtimeToolbar";
import { useRankMovement } from "../hooks/useRankMovement";
import { useRoundRankingPreview } from "../hooks/useRoundRankingPreview";

const RoundRankingPreviewPage = ({
  roundId: roundIdProp,
  canEliminate: canEliminateProp,
  embedded = false,
}) => {
  const params = useParams();
  const navigate = useNavigate();
  const roundId = roundIdProp || params.roundId || params.id;
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [roundAccess, setRoundAccess] = useState({ roundId: null, canEliminate: false });
  const canEliminate =
    canEliminateProp ??
    (String(roundAccess.roundId) === String(roundId) && roundAccess.canEliminate);

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
  const movements = useRankMovement(visibleItems);

  useEffect(() => {
    if (canEliminateProp !== undefined || !roundId) return undefined;

    let isMounted = true;
    roundService
      .getById(roundId)
      .then((round) => {
        if (!isMounted) return;
        setRoundAccess({
          roundId,
          canEliminate: !(round?.isFinal ?? round?.is_final),
        });
      })
      .catch(() => {
        if (isMounted) setRoundAccess({ roundId, canEliminate: false });
      });

    return () => {
      isMounted = false;
    };
  }, [canEliminateProp, roundId]);

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
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      {!embedded && (
        <PageHeader
          title="Xếp hạng tạm thời"
          subtitle="Theo dõi thứ hạng tạm thời trước khi khóa chấm điểm"
          backAction
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

      <Alert
        type="info"
        showIcon
        message="Đây là bảng xếp hạng tạm thời"
        description="Điểm và thứ hạng có thể tiếp tục thay đổi cho đến khi Coordinator khóa chấm. Đội bị loại vi phạm được xếp cuối bảng; các đội còn lại được cập nhật hạng tự động. Cảnh báo đồng điểm ở màn này chưa phải kết quả tiebreak chính thức."
      />

      {error && (
        <Alert
          type={error?.code === 'ROUND_NOT_SCORING_LOCKED' ? 'warning' : 'error'}
          showIcon
          message={
            error?.code === 'ROUND_NOT_SCORING_LOCKED'
              ? 'Vòng chưa khóa chấm điểm'
              : 'Không thể tải bảng xếp hạng'
          }
          description={
            error?.code === 'ROUND_NOT_SCORING_LOCKED' ? (
              <Space direction="vertical">
                <span>
                  Preview chỉ khả dụng khi round đã lock scoring. Bạn có thể xem ranking chính thức
                  sau khi lock.
                </span>
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() =>
                    navigate(
                      `/hackathons/${params.hackathonId}/rounds/${roundId}/results`
                    )
                  }
                >
                  Xem ranking chính thức
                </Button>
              </Space>
            ) : (
              error?.message || 'Vui lòng thử làm mới dữ liệu.'
            )
          }
        />
      )}

      <RankingPreviewPanel
        canEliminate={canEliminate}
        eliminatingTeamId={eliminatingTeamId}
        groups={groups}
        isLoading={isLoading}
        movements={movements}
        onEliminate={setSelectedTeam}
        onGroupChange={setSelectedGroup}
        selectedGroup={selectedGroup}
        summary={summary}
        visibleItems={visibleItems}
      />

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
