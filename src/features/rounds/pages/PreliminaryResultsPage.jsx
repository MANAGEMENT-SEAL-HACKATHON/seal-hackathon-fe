// src/features/rounds/results/pages/PreliminaryResultsPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Button, Card, Input, List, Modal, Space, Tabs, Tag, Tooltip, Typography } from "antd";
import {
  ArrowLeftOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import OfficialRankingPanel from "../components/OfficialRankingPanel";
import TiebreakPanel from "../components/TiebreakPanel";
import AdvanceRosterPanel from "../components/AdvanceRosterPanel";
import ScoringCheckPanel from "../components/ScoringCheckPanel";
import PreliminaryResultsCoordinatorStepper from "../components/PreliminaryResultsCoordinatorStepper";
import { useRoundResults } from "../hooks/useRoundResults";
import { whiteButtonStyle } from "../../../shared/theme/coordinatorTheme";

const { Title, Text } = Typography;

const TABS_ANCHOR_ID = "gd4-results-tabs";

const PreliminaryResultsPage = ({ roundId: roundIdProp }) => {
  const params = useParams();
  const navigate = useNavigate();
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

  const advanceN = results.advancePreview?.advancedTeamIds?.length ?? 0;
  const advanceConfirmEnabled =
    String(advanceTypedN).trim() === String(advanceN) && advanceN > 0;

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
    return [
      {
        key: "ranking",
        label: "Kết quả",
        children: (
          <OfficialRankingPanel
            ranking={results.ranking}
            isLoading={results.isLoading}
            error={results.errors.ranking}
            advancePreviewTeamIds={results.advancePreview.advancedTeamIdSet}
            hasAdvanced={results.hasAdvanced}
            isPublished={results.isPublished}
            rosterDecided={results.rosterDecided}
            topN={results.ranking.topNAdvance || results.round?.top_n_advance || 0}
            roundId={roundId}
          />
        ),
      },
      {
        key: "roster",
        label: "Danh sách Chung kết & Bị loại",
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
        label: `Đồng điểm (${results.tiebreaks.length})`,
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

  const setupBackUrl = hackathonId
    ? `/hackathons/${hackathonId}/setup?tab=rounds`
    : "/hackathons";

  const pageGuide =
    results.hasAdvanced
      ? "Danh sách Chung kết đã được chốt. Xem tab «Danh sách Chung kết & Bị loại»."
      : "Kiểm tra bảng xếp hạng và theo dõi đồng điểm trước khi chốt danh sách Chung kết (Top-N mỗi bảng).";

  return (
    <Space direction="vertical" size={18} className="coord-page" style={{ width: "100%" }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(setupBackUrl)}
        style={{ padding: 0, color: "#475569", fontWeight: 600, width: "fit-content" }}
      >
        Quay lại Cấu hình sự kiện
      </Button>
      {results.seatShortageWarning && (
        <Alert
          data-testid="gd4-seat-shortage-warning"
          type="warning"
          showIcon
          message="Thiếu ghế Chung kết so với trần thiết lập"
          description={results.seatShortageWarning.message}
        />
      )}
      <PreliminaryResultsCoordinatorStepper
        hackathonId={hackathonId || results.round?.hackathon_id || results.round?.hackathonId}
        roundId={roundId}
        scoringLocked={results.scoringLocked}
        isPublished={results.isPublished}
        hasAdvanced={results.hasAdvanced}
        tiebreakCount={results.tiebreaks.length}
        onTabChange={setActiveTab}
        tabsAnchorId={TABS_ANCHOR_ID}
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
              <Tooltip
                title={
                  !results.scoringLocked
                    ? "Cần khóa chấm điểm ở màn Quản lý vòng thi trước khi công bố kết quả."
                    : undefined
                }
              >
                <Tag color={results.scoringLocked ? "processing" : "default"}>
                  {results.scoringLocked ? "Đã khóa chấm" : "Chưa khóa chấm"}
                  {!results.scoringLocked && (
                    <InfoCircleOutlined style={{ marginLeft: 6 }} />
                  )}
                </Tag>
              </Tooltip>
              <Tooltip
                title={
                  results.isPublished && !results.hasAdvanced
                    ? "Danh sách đề xuất vào Chung kết đã sẵn sàng. Bấm «Chốt chuyển vòng» để xác nhận chính thức."
                    : undefined
                }
              >
                <Tag color={results.isPublished ? "success" : "warning"}>
                  {results.isPublished ? "Đã công bố" : "Chưa công bố"}
                  {results.isPublished && !results.hasAdvanced && (
                    <InfoCircleOutlined style={{ marginLeft: 6 }} />
                  )}
                </Tag>
              </Tooltip>
              {results.hasAdvanced && (
                <Tooltip title={`${results.advancePreview.advancedTeams.length} đội vào Chung kết · ${results.advancePreview.eliminatedCount} đội bị loại. Xem tab «Danh sách Chung kết & Bị loại».`}>
                  <Tag color="success" icon={<TrophyOutlined />}>
                    Đã chốt chuyển vòng
                    <InfoCircleOutlined style={{ marginLeft: 6 }} />
                  </Tag>
                </Tooltip>
              )}
            </Space>
            <Space align="center" size={8}>
              <Title level={2} style={{ margin: 0 }}>
                Chuyển vòng & công bố kết quả
              </Title>
              <Tooltip title={pageGuide}>
                <InfoCircleOutlined style={{ color: "rgba(0,0,0,0.45)", fontSize: 18, cursor: "help" }} />
              </Tooltip>
            </Space>
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
                    onClick={() => {
                      Modal.confirm({
                        title: "Công bố kết quả Sơ loại?",
                        content:
                          "Sinh viên sẽ nhận thông báo kết quả. Sau khi công bố mới có thể Chốt chuyển vòng. Thao tác này không nên lặp lại tùy tiện.",
                        okText: "Công bố",
                        cancelText: "Hủy",
                        okButtonProps: { danger: true },
                        onOk: () => results.publishRound(),
                      });
                    }}
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
                    disabled={
                      !results.canAdvance ||
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
              style={whiteButtonStyle}
            >
              Làm mới
            </Button>
          </Space>
        </div>
      </Card>

      {results.tiebreaks.length > 0 && (
        <Alert
          showIcon
          type="error"
          message={`${results.tiebreaks.length} đồng điểm chưa xử lý`}
          description={
            <Tooltip title="Thứ hạng hiện tại chỉ tạm thời. Cần phân xử đồng điểm trước khi chốt chuyển vòng.">
              <span style={{ cursor: "help" }}>Xem chi tiết <InfoCircleOutlined /></span>
            </Tooltip>
          }
          action={
            <Button size="small" type="primary" danger onClick={() => setActiveTab("tiebreak")}>
              Xem đồng điểm
            </Button>
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

      <div id={TABS_ANCHOR_ID}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabs} />
      </div>

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
        <Text strong style={{ display: "block", marginBottom: 8 }}>
          Nhập số đội vào Chung kết (không phải tổng đội thi): {advanceN}
        </Text>
        <Input
          data-testid="advance-confirm-n-input"
          value={advanceTypedN}
          placeholder={String(advanceN)}
          onChange={(e) => setAdvanceTypedN(e.target.value)}
          onPressEnter={() => {
            if (advanceConfirmEnabled) void confirmAdvance();
          }}
        />
        {!advanceConfirmEnabled && (
          <Text type="secondary" style={{ display: "block", marginTop: 8 }} data-testid="advance-confirm-hint">
            Nút «Chốt chuyển vòng» chỉ sáng sau khi bạn nhập đúng số <Text strong>{advanceN}</Text> ở trên
            (xác nhận có chủ đích — tránh bấm nhầm).
          </Text>
        )}
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
