import { useParams, useSearchParams } from "react-router-dom";
import { useState } from "react";
import { Alert, Card, Grid, Select, Space, Spin, Tabs, Typography, theme } from "antd";
import { SearchOutlined, TeamOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useHackathonSelect } from "../hooks/useHackathonSelect";
import ApprovalTable from "../components/ApprovalTable";
import TeamRadarPanel from "../components/TeamRadarPanel";
import { TAB_KEYS } from "../constants/team.constants";
import { tableCardStyle } from "../../../shared/theme/coordinatorTheme";
import CoordinatorHero from "../../../shared/components/ui/CoordinatorHero";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const CoordinatorTeamPage = () => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;
  const { hackathonId: routeHackathonId } = useParams();
  const [searchParams] = useSearchParams();
  const presetHackathonId = routeHackathonId || searchParams.get("hackathonId");
  const [activeTab, setActiveTab] = useState(TAB_KEYS.APPROVAL);
  const [approvalRefreshKey, setApprovalRefreshKey] = useState(0);

  const {
    hackathons,
    selectedHackathonId,
    setSelectedHackathonId,
    isLoadingHackathons,
  } = useHackathonSelect(presetHackathonId);

  const activeHackathonId = presetHackathonId
    ? Number(presetHackathonId)
    : selectedHackathonId;

  const pageStyle = {
    background: token.colorBgLayout,
    minHeight: "100%",
    padding: isMobile ? 12 : 24,
  };

  const shellStyle = {
    margin: "0 auto",
    maxWidth: 1400,
  };

  if (!activeHackathonId && isLoadingHackathons) {
    return (
      <div style={pageStyle}>
        <div style={{ ...shellStyle, padding: 50, textAlign: "center" }}>
          <Spin tip="Đang tải sự kiện..." />
        </div>
      </div>
    );
  }

  return (
    <div className="coord-page" style={pageStyle}>
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: "easeOut" }}
        style={shellStyle}
      >
        <CoordinatorHero
          data-testid="team-page-hero"
          title={
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
              <TeamOutlined style={{ fontSize: 26, color: "#4f46e5" }} />
              Quản lý đội thi
            </span>
          }
          subtitle="Phê duyệt đội nhanh, rõ điều kiện, và kiểm soát các trường hợp cần xem lại trước khi đội bước vào vòng thi."
          actions={
            !presetHackathonId ? (
              <>
                <span />
                <Space
                  direction="vertical"
                  size={6}
                  style={{
                    minWidth: isMobile ? 0 : 320,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <Text style={{ color: token.colorText, fontWeight: 600 }}>
                    Sự kiện đang quản lý
                  </Text>
                  <Select
                    showSearch
                    placeholder="Chọn sự kiện Hackathon"
                    loading={isLoadingHackathons}
                    value={selectedHackathonId}
                    onChange={(value) => setSelectedHackathonId(value)}
                    style={{ width: "100%" }}
                    size="large"
                    suffixIcon={<SearchOutlined style={{ color: token.colorSuccess }} />}
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={hackathons.map((hackathon) => ({
                      value: hackathon.id,
                      label:
                        hackathon.hackathonName ||
                        hackathon.name ||
                        `Hackathon #${hackathon.id}`,
                    }))}
                    dropdownStyle={{ borderRadius: token.borderRadius, padding: 8 }}
                  />
                </Space>
              </>
            ) : null
          }
        />

        {!activeHackathonId && !isLoadingHackathons && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
          >
            <Alert
              message="Chưa chọn sự kiện Hackathon"
              description="Vui lòng chọn một sự kiện ở phía trên để bắt đầu quản lý danh sách đội thi."
              type="info"
              showIcon
              style={{ border: "none", borderRadius: 8 }}
            />
          </motion.div>
        )}

        {activeHackathonId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.32 }}
          >
            <Card
              bordered={false}
              style={{ ...tableCardStyle, overflow: "hidden" }}
              bodyStyle={{ padding: isMobile ? 12 : 24 }}
            >
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                  {
                    key: TAB_KEYS.APPROVAL,
                    label: "Duyệt đội",
                    children: (
                      <ApprovalTable
                        key={approvalRefreshKey}
                        hackathonId={activeHackathonId}
                      />
                    ),
                  },
                  {
                    key: TAB_KEYS.ALLOCATION,
                    label: "Radar & Giải cứu",
                    children: (
                      <TeamRadarPanel
                        hackathonId={activeHackathonId}
                        onDataChanged={() => setApprovalRefreshKey((k) => k + 1)}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CoordinatorTeamPage;
