import { Button, Grid, Input, Segmented, theme } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";

const { useBreakpoint } = Grid;

const TeamFilters = ({
  statusOptions,
  selectedStatus,
  onStatusChange,
  searchText,
  onSearchChange,
  showReviewFilter,
  reviewFilterOptions,
  reviewFilter,
  onReviewFilterChange,
  isLoading,
  onRefresh,
}) => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  const isMobile = !screens.md;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
      <Segmented
        block={isMobile}
        options={statusOptions}
        value={selectedStatus}
        onChange={onStatusChange}
        size={isMobile ? "middle" : "large"}
      />
      <div
        style={{
          alignItems: "center",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: 12,
        }}
      >
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
          placeholder="Tìm tên đội, trưởng nhóm, thành viên..."
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          size="large"
          style={{ borderRadius: token.borderRadius, maxWidth: isMobile ? "100%" : 420 }}
        />
        {showReviewFilter && (
          <Segmented
            block={isMobile}
            options={reviewFilterOptions}
            value={reviewFilter}
            onChange={onReviewFilterChange}
            size="large"
          />
        )}
        <Button
          icon={<ReloadOutlined />}
          loading={isLoading}
          onClick={onRefresh}
          size="large"
          style={{ alignSelf: isMobile ? "stretch" : "auto", borderRadius: token.borderRadius }}
        >
          Làm mới
        </Button>
      </div>
    </div>
  );
};

export default TeamFilters;
