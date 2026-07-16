// src/features/rounds/results/pages/PreliminaryResultsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, List, Modal, Space, Tabs, Tag, Tooltip, Typography } from "antd";
import { ReloadOutlined, SafetyCertificateOutlined, SendOutlined, TrophyOutlined } from "@ant-design/icons";
import OfficialRankingPanel from "../components/OfficialRankingPanel";
import TiebreakPanel from "../components/TiebreakPanel";
import WildcardPanel from "../components/WildcardPanel";
import AdvanceRosterPanel from "../components/AdvanceRosterPanel";
import ScoringCheckPanel from "../components/ScoringCheckPanel";
import PreliminaryResultsCoordinatorStepper from "../components/PreliminaryResultsCoordinatorStepper";
import { useRoundResults } from "../hooks/useRoundResults";

const { Title, Text } = Typography;

const PreliminaryResultsPage = ({ roundId: roundIdProp }) => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const roundId = roundIdProp || params.roundId || params.id;
  const hackathonId = params.hackathonId;
  const tabFromQuery = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromQuery || "ranking");
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [advanceTypedN, setAdvanceTypedN] = useState("");
  const results = useRoundResults(roundId);

  useEffect(() => {
    if (tabFromQuery) setActiveTab(tabFromQuery);
  }, [tabFromQuery]);

  useEffect(() => {
    if (activeTab === "wildcard" && !results.showWildcardTab) {
      setActiveTab("ranking");
    }
  }, [activeTab, results.showWildcardTab]);

  const pendingWildcardCount = useMemo(() => {
    if (!results.showWildcardTab) return 0;
    if (results.wildcardDecisionsReady) return 0;
    return 1; // Plan C: chưa xác nhận đề xuất = còn việc WC
  }, [results.showWildcardTab, results.wildcardDecisionsReady]);

  const advanceN = results.advancePreview?.advancedTeamIds?.length ?? 0;
  const advanceConfirmEnabled =
    pendingWildcardCount === 0 && String(advanceTypedN).trim() === String(advanceN) && advanceN > 0;

  const openAdvanceModal = () => {
    setAdvanceTypedN("");
    setAdvanceModalOpen(true);
  };

  const confirmAdvance = async () => {
    if (!advanceConfirmEnabled) return;
    const payload = results.buildAdvancePayload();
    const ok = await results.advanceTeams(payload);
    if (ok !== false) {
      setAdvanceModalOpen(false);
    }
  };

  const tabs = useMemo(() => {
    const items = [
      {
        key: "ranking",
        label: "Kết quả",
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
            roundId={roundId}
            hasUnresolvedTiebreak={results.tiebreaks.length > 0}
          />
        ),
      },
      {
        key: "roster",
        label: "Danh sách CK & Loại",
        children: <AdvanceRosterPanel roundId={roundId} isPublished={results.isPublished} />,
      },
      {
        key: "scoring-check",
        label: "Kiểm tra chấm",
        children: (
          <ScoringCheckPanel
            roundId={roundId}
            ranking={results.ranking}
            isLoading={results.isLoading}
            error={results.errors.ranking}
          />
        ),
      },
      {
        key: "tiebreak",
        label: `Tiebreak (${results.tiebreaks.length})`,
        children: (
          <TiebreakPanel
            items={results.tiebreaks}
            error={results.errors.tiebreak}
            isResolving={results.isResolvingTiebreak}
            onResolve={results.resolveTiebreak}
          />
        ),
      },
    ];
    if (results.showWildcardTab) {
      items.push({
        key: "wildcard",
        label: `Vé vớt (${results.wildcard.items.length})`,
        children: (
          <WildcardPanel
            wildcard={results.wildcard}
            error={results.errors.wildcard}
            overrideHistory={results.overrideHistory}
            confirmingProposal={results.confirmingProposal}
            overridingReviewId={results.overridingReviewId}
            onConfirmProposal={results.confirmWildcardProposal}
            onOverride={results.overrideWildcard}
            onLoadHistory={results.loadOverrideHistory}
            readOnly={results.hasAdvanced}
          />
        ),
      });
    }
    return items;
  }, [results, roundId]);

  if (!roundId) {
    return (
      <Alert
        showIcon
        type="warning"
        message="Thiếu thông tin vòng thi"
        description="Trang xử lý kết quả cần chọn vòng Sơ loại."
      />
    );
  }

  const wildcardPending =
    results.showWildcardTab && !results.wildcardDecisionsReady;

  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <PreliminaryResultsCoordinatorStepper
        hackathonId={hackathonId || results.round?.hackathon_id || results.round?.hackathonId}
        roundId={roundId}
        scoringLocked={results.scoringLocked}
        isPublished={results.isPublished}
        hasAdvanced={results.hasAdvanced}
        tiebreakCount={results.tiebreaks.length}
        wildcardPending={wildcardPending}
        onTabChange={setActiveTab}
      />
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
              <Tag color="blue" icon={<SafetyCertificateOutlined />}>
                Kết quả Sơ loại
              </Tag>
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
            <Title level={2} style={{ margin: 0 }}>
              Chuyển vòng & công bố kết quả
            </Title>
            <Text type="secondary">
              {results.hasAdvanced
                ? "Danh sách Chung kết đã được chốt. Xem tab «Danh sách CK & Loại»."
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
              <Tooltip
                title={
                  !results.canAdvance && pendingWildcardCount === 0
                    ? results.advanceDisabledReason
                    : pendingWildcardCount > 0
                      ? `Còn ${pendingWildcardCount} vé vớt chưa xử lý`
                      : ""
                }
              >
                <span style={{ display: "inline-block" }}>
                  <Button
                    type="primary"
                    icon={<TrophyOutlined />}
                    loading={results.isAdvancing}
                    disabled={
                      !results.canAdvance ||
                      pendingWildcardCount > 0 ||
                      !results.scoringLocked ||
                      results.hasUnresolvedTiebreak ||
                      Boolean(results.errors.ranking) ||
                      results.ranking.items.length === 0
                    }
                    onClick={openAdvanceModal}
                  >
                    Chốt chuyển vòng
                  </Button>
                </span>
              </Tooltip>
            )}
            <Button
              icon={<ReloadOutlined spin={results.isRefreshing} />}
              onClick={() => results.fetchResults({ silent: true })}
            >
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
          description="Cần khóa chấm điểm ở màn Quản lý vòng thi trước khi công bố kết quả."
        />
      )}

      {results.tiebreaks.length > 0 && (
        <Alert
          showIcon
          type="warning"
          message="Thứ hạng tạm thời — đang chờ xử lý đồng điểm"
          description={`Tổng cộng ${results.tiebreaks.reduce((sum, item) => sum + (item.teams?.length || 0), 0)} đội đang tranh chấp thứ hạng. Nút Chốt chuyển vòng bị khóa cho đến khi phân xử xong.`}
          action={
            <Button size="small" type="primary" danger onClick={() => setActiveTab("tiebreak")}>
              Xem tiebreak
            </Button>
          }
        />
      )}

      {results.hasAdvanced && (
        <Alert
          showIcon
          type="success"
          message="Đã chốt danh sách Chung kết"
          description={`${results.advancePreview.advancedTeams.length} đội vào Chung kết · ${results.advancePreview.eliminatedCount} đội bị loại. Xem tab «Danh sách CK & Loại».`}
          action={
            <Button size="small" type="primary" onClick={() => setActiveTab("roster")}>
              Mở roster
            </Button>
          }
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
        <Card title="Danh sách đề xuất vào Chung kết" style={{ borderRadius: 12 }}>
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

      <Modal
        title={`Chuyển ${advanceN} đội vào Chung kết`}
        open={advanceModalOpen}
        onCancel={() => setAdvanceModalOpen(false)}
        onOk={confirmAdvance}
        okText="Chốt chuyển vòng"
        cancelText="Hủy"
        confirmLoading={results.isAdvancing}
        okButtonProps={{
          disabled: !advanceConfirmEnabled,
          "data-testid": "advance-confirm-ok",
        }}
        width={520}
        destroyOnClose
      >
        <p>
          Bạn sẽ chuyển <strong>{advanceN}</strong> đội vào Chung kết. Thao tác{" "}
          <strong>không hoàn tác</strong>.
        </p>
        {pendingWildcardCount > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 12 }}
            message={`Còn ${pendingWildcardCount} vé vớt chưa duyệt/từ chối. Hoàn tất Wild Card trước khi chốt.`}
          />
        )}
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Nhập số đội vào Chung kết (không phải tổng đội thi): {advanceN}
        </Text>
        <Input
          data-testid="advance-confirm-n-input"
          value={advanceTypedN}
          disabled={pendingWildcardCount > 0}
          placeholder={String(advanceN)}
          onChange={(e) => setAdvanceTypedN(e.target.value)}
          onPressEnter={() => {
            if (advanceConfirmEnabled) void confirmAdvance();
          }}
        />
        {results.advancePreview.advancedTeams.length > 0 && (
          <List
            size="small"
            style={{ marginTop: 12, maxHeight: 160, overflow: "auto" }}
            dataSource={results.advancePreview.advancedTeams.map(
              (team) => `${team.teamName} (${team.groupLabel})`,
            )}
            renderItem={(line) => <List.Item style={{ padding: "4px 0" }}>{line}</List.Item>}
          />
        )}
      </Modal>
    </Space>
  );
};

export default PreliminaryResultsPage;
