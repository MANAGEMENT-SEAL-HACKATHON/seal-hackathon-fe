import React, { useMemo } from "react";
import {
  Typography,
  Tag,
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

const { Title, Paragraph } = Typography;
const { useToken } = theme;

// === PAGE: TRANG REVIEW VÀ VALIDATE ĐIỀU KIỆN KÍCH HOẠT ===
const ReviewValidatePage = ({ hackathonId: propHackathonId }) => {
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
      message.success('Đã mở đăng ký — kỳ thi đang ở trạng thái ONGOING.');
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
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .validation-item-hover:hover {
            transform: translateY(-2px);
            box-shadow: ${token.boxShadowSecondary} !important;
          }
        `}
      </style>
      <div
        style={{
          minHeight: "100vh",
          padding: "24px 0",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 40,
            }}
          >
            <div>
              <Space align="center" size="middle" style={{ marginBottom: 8 }}>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    fontWeight: 700,
                    letterSpacing: "-0.5px",
                  }}
                >
                  Điều kiện phát hành
                </Title>
                <Tag
                  color="processing"
                  style={{
                    fontSize: 13,
                    padding: "4px 12px",
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  {hackathon?.status || "DRAFT"}
                </Tag>
              </Space>
              <Title
                level={5}
                style={{
                  color: token.colorPrimary,
                  margin: 0,
                  marginBottom: 8,
                }}
              >
                Hackathon: {hackathon?.name || "Đang tải dữ liệu..."}
              </Title>
              <Paragraph type="secondary" style={{ fontSize: 16, margin: 0 }}>
                Hệ thống tự động kiểm tra cấu trúc, tiêu chí và nhân sự trước
                khi mở cổng đăng ký.
              </Paragraph>
            </div>
            <Button
              icon={<RefreshCw size={16} />}
              onClick={handleRefetch}
              style={{ display: "flex", alignItems: "center" }}
            >
              Kiểm tra lại
            </Button>
          </div>

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
                  <ShieldCheck size={24} color={token.colorPrimary} />
                  <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
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
              <div style={{ position: "sticky", top: 40 }}>
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
      </div>
    </>
  );
};

export default ReviewValidatePage;
