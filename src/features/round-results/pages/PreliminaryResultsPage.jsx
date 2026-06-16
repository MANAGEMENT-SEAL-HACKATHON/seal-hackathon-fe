import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Button, Card, Space, Tabs, Tag, Typography } from "antd";
import { ReloadOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
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

  const tabs = useMemo(
    () => [
      {
        key: "ranking",
        label: "Leaderboard chính thức",
        children: <OfficialRankingPanel ranking={results.ranking} isLoading={results.isLoading} error={results.errors.ranking} />,
      },
      {
        key: "tiebreak",
        label: `Tiebreak (${results.tiebreaks.length})`,
        children: <TiebreakPanel items={results.tiebreaks} error={results.errors.tiebreak} />,
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
              <Tag color={results.ranking.isPublished ? "success" : "warning"}>
                {results.ranking.isPublished ? "Đã công bố" : "Chưa công bố"}
              </Tag>
            </Space>
            <Title level={2} style={{ margin: 0 }}>Chuyển vòng & công bố kết quả</Title>
            <Text type="secondary">
              Kiểm tra leaderboard, theo dõi tiebreak và duyệt đề xuất Wild Card trước khi chốt danh sách Chung kết.
            </Text>
          </Space>
          <Button icon={<ReloadOutlined spin={results.isRefreshing} />} onClick={() => results.fetchResults({ silent: true })}>
            Làm mới dữ liệu
          </Button>
        </div>
      </Card>

      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
    </Space>
  );
};

export default PreliminaryResultsPage;
