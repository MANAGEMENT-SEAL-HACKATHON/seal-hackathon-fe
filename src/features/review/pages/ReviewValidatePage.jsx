import { useMemo } from "react";
import {
  Typography,
  Alert,
  Spin,
  message,
  Row,
  Col,
  Space,
  Button,
  theme,
} from "antd";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { useReadiness } from "../hooks/useReadiness";
import { reviewService } from "../services/reviewService";
import { ReviewTabs } from "../components/ReviewTabs";
import { ReviewSummaryCard } from "../components/ReviewSummaryCard";
import { ROUTES } from "../../../shared/constants/routes";
import StatusBadge from "../../../shared/components/ui/StatusBadge";
import SectionHeader, { HintList } from "../../../shared/components/ui/SectionHeader";

const { Title, Text } = Typography;
const { useToken } = theme;

const REVIEW_TAB_HINT = (
  <HintList
    items={[
      "Hệ thống tự kiểm tra cấu trúc vòng thi, tiêu chí và nhân sự",
      "Phải xử lý hết mục chặn (blocker) trước khi mở đăng ký",
      "Cảnh báo (warning) nên xử lý nhưng không bắt buộc",
    ]}
  />
);

// === PAGE: TRANG REVIEW VÀ VALIDATE ĐIỀU KIỆN KÍCH HOẠT ===
const ReviewValidatePage = ({ hackathonId: propHackathonId, onUpdated }) => {
  const navigate = useNavigate();
  const params = useParams();
  const { token } = useToken();
  const hId = propHackathonId || parseInt(params.hackathonId);

  // 1. Fetch dữ liệu từ Custom Hook
  const {
    hackathon,
    readinessData,
    isLoading,
    error: apiError,
    refetch,
  } = useReadiness(hId);

  // 2. Hàm gọi API kích hoạt giải đấu
  const handleActivate = async () => {
    try {
      await reviewService.changeStatus(hId, 'ONGOING', 'Mở đăng ký');
      message.success('Đã mở đăng ký — sự kiện đang diễn ra.');
      if (typeof onUpdated === 'function') await onUpdated();
      navigate(ROUTES.HACKATHON_SETUP.replace(':hackathonId', String(hId)), { replace: true });
    } catch (error) {
      message.error(error.message || "Không thể kích hoạt giải đấu");
    }
  };

  // 3. Hàm kiểm tra lại
  const handleRefetch = () => {
    if (refetch) {
      refetch();
    }
  };

  const blockers = readinessData?.blockers || [];
  const warnings = readinessData?.warnings || [];
  const isReady = readinessData?.ready;

  const groupedBlockers = useMemo(() => {
    return blockers.reduce(
      (groups, b) => {
        const code = b.code?.toUpperCase() || "";
        if (code.includes("ROUND")) groups.rounds.push(b);
        else if (code.includes("CRITERIA") || code.includes("WEIGHT"))
          groups.criteria.push(b);
        else if (
          code.includes("PERSONNEL") ||
          code.includes("JUDGE") ||
          code.includes("MENTOR")
        )
          groups.personnel.push(b);
        else groups.schedule.push(b);
        return groups;
      },
      { rounds: [], criteria: [], personnel: [], schedule: [] },
    );
  }, [blockers]);

  // === RENDER KHI ĐANG LOADING HOẶC CÓ LỖI API ===
  if (isLoading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Spin size="large" tip="Đang đồng bộ dữ liệu hệ thống..." />
      </div>
    );
  }

  if (apiError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message="Lỗi hệ thống"
          description="Không thể tải dữ liệu kiểm tra cấu hình."
          showIcon
        />
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .validation-item-hover:hover {
            transform: translateY(-2px);
            box-shadow: ${token.boxShadowSecondary} !important;
          }
        `}
      </style>
      <div style={{ padding: "24px 0", animation: "fadeInUp 0.4s ease-out both" }}>
        <SectionHeader
          title="Điều kiện phát hành"
          info={REVIEW_TAB_HINT}
          extra={
            <Space align="center">
              <StatusBadge status={hackathon?.status || "DRAFT"} />
              <Button
                icon={<RefreshCw size={16} />}
                onClick={handleRefetch}
                style={{ display: "flex", alignItems: "center" }}
              >
                Kiểm tra lại
              </Button>
            </Space>
          }
        />
        <Text type="secondary" style={{ display: "block", marginTop: -8, marginBottom: 24 }}>
          Hackathon: {hackathon?.name || "Đang tải dữ liệu..."}
        </Text>

        <Row gutter={[32, 32]}>
          <Col xs={24} lg={16}>
            <div style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 20,
                }}
              >
                <ShieldCheck size={20} color={token.colorPrimary} />
                <Title level={5} style={{ margin: 0, fontWeight: 600 }}>
                  Danh sách kiểm tra
                </Title>
              </div>

              <ReviewTabs
                groupedBlockers={groupedBlockers}
                warnings={warnings}
              />
            </div>
          </Col>

          <Col xs={24} lg={8}>
            <div style={{ position: "sticky", top: 24 }}>
              <ReviewSummaryCard
                isReady={isReady}
                hackathonStatus={hackathon?.status}
                blockersCount={blockers.length}
                warningsCount={warnings.length}
                onActivate={handleActivate}
              />
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default ReviewValidatePage;
