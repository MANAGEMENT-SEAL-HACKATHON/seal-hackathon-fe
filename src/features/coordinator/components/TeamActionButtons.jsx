import { Button, Dropdown, Popconfirm, Space, Tooltip, Typography, theme } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  MoreOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const TeamActionButtons = ({
  compact = false,
  disabledReason = "",
  canApprove,
  canReject = true,
  canDisband = true,
  loading,
  onApprove,
  onReject,
  onDisband,
}) => {
  const { token } = theme.useToken();
  const approveStyle = {
    background: token.colorSuccess,
    borderColor: token.colorSuccess,
    borderRadius: token.borderRadius,
    fontWeight: 600,
  };
  const hasAnyAction = canApprove || canReject || canDisband;

  if (!hasAnyAction) {
    return (
      <Text type="secondary" style={{ fontSize: 13 }}>
        Không có thao tác
      </Text>
    );
  }

  const disbandControl = compact ? (
    <Button
      block
      danger
      disabled={!canDisband}
      icon={<DeleteOutlined />}
      loading={loading}
      onClick={() => canDisband && onDisband?.()}
      style={{ borderRadius: 8 }}
    >
      Giải tán
    </Button>
  ) : (
    <Dropdown
      menu={{
        items: [
          {
            key: "disband",
            label: "Giải tán đội",
            danger: true,
            disabled: !canDisband,
            icon: <DeleteOutlined />,
          },
        ],
        onClick: ({ key }) => {
          if (key === "disband" && canDisband) onDisband?.();
        },
      }}
      trigger={["click"]}
      disabled={!canDisband}
    >
      <Tooltip
        title={
          canDisband
            ? "Thêm thao tác"
            : "Chỉ đội PENDING hoặc ACTIVE (chưa có mentor) mới có thể giải tán"
        }
      >
        <Button
          type="text"
          disabled={!canDisband}
          icon={<MoreOutlined />}
          loading={loading}
          aria-label="Thêm thao tác"
          style={{ borderRadius: 8 }}
        />
      </Tooltip>
    </Dropdown>
  );

  if (compact) {
    return (
      <div
        style={{
          display: "grid",
          gap: 8,
          gridTemplateColumns: canApprove || canReject ? "1fr 1fr" : "1fr",
          marginTop: 12,
        }}
      >
        {canApprove && (
          <Tooltip title={disabledReason}>
            <Button
              block
              type="primary"
              icon={<CheckOutlined />}
              loading={loading}
              onClick={onApprove}
              style={approveStyle}
            >
              Duyệt
            </Button>
          </Tooltip>
        )}
        {canReject && (
          <Button
            block
            danger
            icon={<CloseOutlined />}
            loading={loading}
            onClick={onReject}
            style={{ borderRadius: 8 }}
          >
            Từ chối
          </Button>
        )}
        {canDisband && (
          <div style={{ gridColumn: canApprove || canReject ? "1 / -1" : undefined }}>
            {disbandControl}
          </div>
        )}
      </div>
    );
  }

  return (
    <Space size="small">
      {canApprove && (
        <Tooltip title={disabledReason}>
          <Popconfirm
            title="Duyệt đội thi này?"
            description="Đội sẽ được chuyển sang trạng thái ACTIVE."
            onConfirm={onApprove}
            okText="Duyệt"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={loading}
              style={approveStyle}
            >
              Duyệt
            </Button>
          </Popconfirm>
        </Tooltip>
      )}

      {canReject && (
        <Button
          danger
          icon={<CloseOutlined />}
          loading={loading}
          onClick={onReject}
          style={{ borderRadius: 8 }}
        >
          Từ chối
        </Button>
      )}

      {canDisband && disbandControl}
    </Space>
  );
};

export default TeamActionButtons;
