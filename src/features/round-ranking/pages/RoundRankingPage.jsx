import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Alert, Card, Select, Space, Typography } from "antd";
import PageHeader from "../../../shared/components/ui/PageHeader";
import { useRoundRankingSelection } from "../hooks/useRoundRankingSelection";
import RoundRankingPreviewPage from "./RoundRankingPreviewPage";

const { Text } = Typography;

const toOption = (item, suffix) => ({
  value: String(item.id),
  label: suffix ? `${item.name} ${suffix}` : item.name,
});

const RoundRankingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialHackathonId = searchParams.get("hackathonId");
  const initialRoundId = searchParams.get("roundId");

  const {
    hackathons,
    rounds,
    selectedHackathonId,
    selectedRoundId,
    changeHackathon,
    setSelectedRoundId,
    isLoadingHackathons,
    isLoadingRounds,
  } = useRoundRankingSelection(initialHackathonId, initialRoundId);

  useEffect(() => {
    const nextParams = {};
    if (selectedHackathonId) nextParams.hackathonId = selectedHackathonId;
    if (selectedRoundId) nextParams.roundId = selectedRoundId;
    setSearchParams(nextParams, { replace: true });
  }, [selectedHackathonId, selectedRoundId, setSearchParams]);

  const handleHackathonChange = (hackathonId) => {
    changeHackathon(hackathonId);
  };

  const handleRoundChange = (roundId) => {
    setSelectedRoundId(roundId);
  };

  const roundOptions = rounds.map((round) =>
    toOption(round, round.isFinal ? "(Chung kết)" : "")
  );

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      <PageHeader
        title="BXH sơ loại"
        subtitle="Theo dõi leaderboard realtime và xử lý loại đội vi phạm theo từng round."
      />

      <Card>
        <Space direction="vertical" size={14} style={{ width: "100%" }}>
          <Text strong>Chọn dữ liệu leaderboard</Text>
          <Space wrap size={12} style={{ width: "100%" }}>
            <Select
              showSearch
              placeholder="Chọn Hackathon"
              loading={isLoadingHackathons}
              value={selectedHackathonId || undefined}
              onChange={handleHackathonChange}
              options={hackathons.map((hackathon) => toOption(hackathon))}
              optionFilterProp="label"
              style={{ minWidth: 280 }}
            />
            <Select
              showSearch
              placeholder="Chọn Round"
              disabled={!selectedHackathonId}
              loading={isLoadingRounds}
              value={selectedRoundId || undefined}
              onChange={handleRoundChange}
              options={roundOptions}
              optionFilterProp="label"
              style={{ minWidth: 280 }}
            />
          </Space>
        </Space>
      </Card>

      {selectedRoundId ? (
        <RoundRankingPreviewPage roundId={selectedRoundId} embedded />
      ) : (
        <Alert
          type="info"
          showIcon
          message="Chưa chọn Round"
          description="Chọn Hackathon và Round để xem bảng xếp hạng tạm thời."
        />
      )}
    </Space>
  );
};

export default RoundRankingPage;
