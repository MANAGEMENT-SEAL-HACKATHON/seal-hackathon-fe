// src/features/round-results/pages/PreliminaryResultsPage.jsx
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, List, Modal, Space, Tabs, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, SafetyCertificateOutlined, SendOutlined, TrophyOutlined } from "@ant-design/icons";
import OfficialRankingPanel from "../components/OfficialRankingPanel";
import TiebreakPanel from "../components/TiebreakPanel";
import WildcardPanel from "../components/WildcardPanel";
import { useRoundResults } from "../hooks/useRoundResults";

const { Title, Text } = Typography;

const PreliminaryResultsPage = ({ roundId: roundIdProp }) => {
  const params = useParams();
  const roundId = roundIdProp || params.roundId || params.id;
  const [activeTab, setActiveTab] = useState("ranking");
  const results = useRoundResults(roundId);

  const handleAdvance = () => {
    if (!results.canAdvance) {
      void results.advanceTeams();
      return;
    }
    const payload = results.buildAdvancePayload();
    const teamLines = results.advancePreview.advancedTeams.map(
      (team) => `${team.teamName} (${team.groupLabel})`,
    );
    Modal.confirm({
      title: "Chốt chuyển vòng Chung kết",
      content: (
        <div>
          <p>
            Top {results.ranking.topNAdvance || results.round?.top_n_advance || "?"} mỗi bảng
            {results.wildcard.items.length > 0 ? " + vé Wild Card đã duyệt" : ""} sẽ vào Chung kết.
          </p>
          <p>
            <strong>{payload.advancedTeamIds.length}</strong> đội vào chung kết ·{" "}
            <strong>{payload.eliminatedTeamIds.length}</strong> đội loại
          </p>
          {teamLines.length > 0 && (
            <List
              size="small"
              dataSource={teamLines}
              renderItem={(line) => <List.Item style={{ padding: "4px 0" }}>{line}</List.Item>}
            />
          )}
        </div>
      ),
      okText: "Chốt chuyển vòng",
      cancelText: "Hủy",
      onOk: () => results.advanceTeams(payload),
    });
  };

  const tabs = useMemo(
    () => [
      {
        key: "ranking",
        label: "Leaderboard chính thức",
        children: (
          <OfficialRankingPanel
            ranking={results.ranking}
            isLoading={results.isLoading}
            error={results.errors.ranking}
            advancePreviewTeamIds={results.advancePreview.advancedTeamIdSet}
            rejectedWildcardTeamIds={results.rejectedWildcardTeamIdSet}
            hasAdvanced={results.hasAdvanced}
            isPublished={results.isPublished}
            rosterDecided={results.rosterDecided}
            wildcardData={results.wildcard}
            topN={results.ranking.topNAdvance || results.round?.top_n_advance || 0}
          />
        ),
      },
      {
        key: "tiebreak",
        label: `Tiebreak (${results.tiebreaks.length})`,
        children: <TiebreakPanel 
                    items={results.tiebreaks} 
                    error={results.errors.tiebreak}
                    isResolving={results.isResolvingTiebreak}
                    onResolve={results.resolveTiebreak} 
                  />,
      },
      {
        key: "wildcard",
        label: `Wild Card (${results.wildcard.items.length})`,
        children: (
          <WildcardPanel
            wildcard={results.wildcard}
            error={results.errors.wildcard}
            decidingReviewId={results.decidingReviewId}
            onDecide={results.decideWildcard}
            readOnly={results.hasAdvanced || results.wildcardDecisionsReady}
          />
        ),
      },
    ],
    [results],
  );

  if (!roundId) {
    return <Alert showIcon type="warning" message="Thiếu roundId" description="Trang xử lý kết quả cần roundId của vòng Sơ loại." />;
  }

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <Card
        style={{
          borderRadius: 16,
          padding: "24px 32px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
          <Space direction="vertical" size={7}>
            <Space wrap>
              <Tag color="blue" icon={<SafetyCertificateOutlined />}>Kết quả Sơ loại</Tag>
              <Tag color={results.scoringLocked ? "processing" : "default"}>
                {results.scoringLocked ? "Đã khóa chấm" : "Chưa khóa chấm"}
              </Tag>
              <Tag color={results.isPublished ? "success" : "warning"}>
                {results.isPublished ? "Đã công bố" : "Chưa công bố"}
              </Tag>
              {results.hasAdvanced && (
                <Tag color="success" icon={<TrophyOutlined />}>
                  Đã chốt chuyển vòng
                </Tag>
              )}
            </Space>
            <Title level={2} style={{ margin: 0 }}>Chuyển vòng & công bố kết quả</Title>
            <Text type="secondary">
              {results.hasAdvanced
                ? "Danh sách Chung kết đã được chốt. Xem chi tiết tại bảng xếp hạng bên dưới."
                : "Kiểm tra leaderboard, theo dõi tiebreak và duyệt đề xuất Wild Card trước khi chốt danh sách Chung kết."}
            </Text>
          </Space>
          <Space wrap>
            {!results.isPublished && (
              <Tooltip title={!results.canPublish ? results.publishDisabledReason : ""}>
                <span style={{ display: "inline-block" }}>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    loading={results.isPublishing}
                    disabled={!results.canPublish}
                    onClick={() => results.publishRound()}
                  >
                    Công bố kết quả
                  </Button>
                </span>
              </Tooltip>
            )}
            {results.isPublished && !results.hasAdvanced && (
              <Tooltip title={!results.canAdvance ? results.advanceDisabledReason : ""}>
                <span style={{ display: "inline-block" }}>
                  <Button
                    type="primary"
                    icon={<TrophyOutlined />}
                    loading={results.isAdvancing}
                    disabled={!results.canAdvance}
                    onClick={handleAdvance}
                  >
                    Chốt chuyển vòng
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button icon={<ReloadOutlined spin={results.isRefreshing} />} onClick={() => results.fetchResults({ silent: true })}>
              Làm mới dữ liệu
            </Button>
          </Space>
        </div>
      </Card>

      {!results.scoringLocked && (
        <Alert
          showIcon
          type="info"
          message="Chưa thể công bố"
          description="Cần khóa chấm điểm (lock-scoring) ở màn Quản lý vòng thi trước khi công bố kết quả."
        />
      )}

      {results.hasAdvanced && (
        <Alert
          showIcon
          type="success"
          message="Đã chốt danh sách Chung kết"
          description={`${results.advancePreview.advancedTeams.length} đội vào Chung kết · ${results.advancePreview.eliminatedCount} đội bị loại. Không cần thao tác thêm.`}
        />
      )}

      {results.isPublished && !results.hasAdvanced && (
        <Alert
          showIcon
          type="success"
          message="Đã công bố kết quả sơ loại"
          description={
            results.wildcardDecisionsReady
              ? "Danh sách đề xuất vào Chung kết hiển thị bên dưới. Bấm «Chốt chuyển vòng» để xác nhận chính thức."
              : "Cần duyệt xong Wild Card ở tab tương ứng trước khi chốt chuyển vòng."
          }
        />
      )}

      {results.isPublished && !results.hasAdvanced && results.advancePreview.advancedTeams.length > 0 && (
        <Card
          title="Danh sách đề xuất vào Chung kết"
          style={{ borderRadius: 12 }}
        >
          <List
            grid={{ gutter: 12, xs: 1, sm: 2, md: 3, lg: 4 }}
            dataSource={results.advancePreview.advancedTeams}
            renderItem={(team) => (
              <List.Item>
                <Card size="small" style={{ width: "100%" }}>
                  <Text strong>{team.teamName}</Text>
                  <br />
                  <Tag bordered={false} style={{ marginTop: 4 }}>
                    {team.groupLabel} · Hạng {team.rank}
                  </Tag>
                </Card>
              </List.Item>
            )}
          />
        </Card>
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
    </Space>
  );
};

export default PreliminaryResultsPage;