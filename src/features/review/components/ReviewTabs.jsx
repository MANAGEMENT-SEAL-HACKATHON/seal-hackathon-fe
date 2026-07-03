import { useState } from "react";
import { Tabs, Badge, Space, Typography, theme } from "antd";
import {
  LayoutGrid,
  ClipboardCheck,
  Users,
  Calendar,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { ValidationItem } from "./ValidationItem";

const { Title, Text } = Typography;
const { useToken } = theme;

export const ReviewTabs = ({ groupedBlockers, warnings }) => {
  const [activeTab, setActiveTab] = useState("rounds");
  const { token } = useToken();

  const renderTabContent = (errorList, statusType = "error") => {
    if (errorList.length === 0) {
      return (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            borderRadius: 12,
            animation: "fadeInUp 0.5s ease both",
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: token.colorSuccessBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              border: `1px solid ${token.colorSuccessBorder}`,
            }}
          >
            <ShieldCheck size={40} color={token.colorSuccess} />
          </div>
          <Title
            level={4}
            style={{ color: token.colorSuccess, margin: 0, paddingBottom: 8 }}
          >
            {statusType === "warning"
              ? "Không có cảnh báo"
              : "Mục này đã hoàn hảo"}
          </Title>
          <Text type="secondary" style={{ fontSize: 15 }}>
            {statusType === "warning"
              ? "Không có vấn đề cần lưu ý."
              : "Không phát hiện lỗi cấu hình."}
          </Text>
        </div>
      );
    }

    return (
      <div style={{ minHeight: 250, paddingTop: 8 }}>
        {errorList.map((item, index) => (
          <ValidationItem
            key={`err-${index}`}
            index={index}
            status={statusType}
            code={item.code}
            details={item.details}
            message={item.message}
          />
        ))}
      </div>
    );
  };

  const createTabLabel = (
    key,
    icon,
    label,
    errorCount,
    statusType = "error",
  ) => {
    const isActive = activeTab === key;
    const badgeColor =
      statusType === "warning" ? token.colorWarning : token.colorError;
    return (
      <div style={{ padding: "8px 12px", transition: "all 0.2s ease" }}>
        <Space
          style={{
            fontWeight: isActive ? 600 : 400,
            color: isActive ? token.colorPrimary : token.colorTextSecondary,
          }}
        >
          {icon} {label}
        </Space>
        {errorCount > 0 && (
          <Badge
            count={errorCount}
            style={{ backgroundColor: badgeColor, marginLeft: 6 }}
          />
        )}
      </div>
    );
  };

  // === DANH SÁCH CẤU HÌNH CÁC TAB ===
  const tabItems = [
    {
      key: "rounds",
      label: createTabLabel(
        "rounds",
        <LayoutGrid size={18} />,
        "Vòng thi",
        groupedBlockers.rounds.length,
      ),
      children: renderTabContent(groupedBlockers.rounds, "error"),
    },
    {
      key: "criteria",
      label: createTabLabel(
        "criteria",
        <ClipboardCheck size={18} />,
        "Tiêu chí",
        groupedBlockers.criteria.length,
      ),
      children: renderTabContent(groupedBlockers.criteria, "error"),
    },
    {
      key: "personnel",
      label: createTabLabel(
        "personnel",
        <Users size={18} />,
        "Nhân sự",
        groupedBlockers.personnel.length,
      ),
      children: renderTabContent(groupedBlockers.personnel, "error"),
    },
    {
      key: "schedule",
      label: createTabLabel(
        "schedule",
        <Calendar size={18} />,
        "Khác",
        groupedBlockers.schedule.length,
      ),
      children: renderTabContent(groupedBlockers.schedule, "error"),
    },
    {
      key: "warnings",
      label: createTabLabel(
        "warnings",
        <AlertTriangle size={18} />,
        "Cảnh báo",
        warnings.length,
        "warning",
      ),
      children: renderTabContent(warnings, "warning"),
    },
  ];

  return (
    <Tabs
      type="card"
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems}
      size="large"
      tabBarStyle={{ marginBottom: 0 }}
      style={{
        backgroundColor: token.colorBgContainer,
        borderRadius: "12px",
        padding: "24px",
        boxShadow: token.boxShadowTertiary,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    />
  );
};
